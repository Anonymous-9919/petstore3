import "server-only";

import { randomBytes } from "crypto";
import { Prisma, PaymentMethod, PaymentStatus, FulfillmentMode, OrderStatus } from "@prisma/client";
import { kuwaitPhoneLookupValues } from "@/lib/phone";
import type { CheckoutRequest } from "@/server/validation/checkout";
import { db } from "@/server/db";
import { isValidFulfillmentSlot } from "@/server/services/fulfillment";
import { notifyOrderCreated } from "@/server/notifications/email";
import { notifyStaff } from "@/server/notifications/staff";
import { calculatePromotionDiscount, type PromotionLine } from "@/server/services/promotion-calculation";
import { writeInventoryMovement } from "@/server/services/inventory-ledger";

const decimal = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
const ONLINE_RESERVATION_TTL_MS = 20 * 60 * 1000;
type PromotionForQuote = {
  id: string;
  name: string;
  code: string | null;
  type: "PERCENTAGE" | "FIXED";
  benefit: "DISCOUNT" | "FREE_DELIVERY" | "BUY_X_GET_Y" | "QUANTITY_TIER" | "FREE_ITEM";
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "DISABLED";
  scope: "PRODUCT" | "CATEGORY" | "CART";
  value: Prisma.Decimal;
  minimumQuantity: number | null;
  firstOrderOnly: boolean;
  maxDiscount: Prisma.Decimal | null;
  priority: number;
  isStackable: boolean;
  minimumCartValue: Prisma.Decimal | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  qualifyingProductIds: string[];
  rewardProductIds: string[];
  rewardQuantity: number;
  targets: Array<{ productId: string | null; categoryId: string | null }>;
  branchRestrictions: Array<{ branchId: string }>;
  areaRestrictions: Array<{ areaId: string }>;
};
type PromotionClient = Pick<typeof db, "$executeRaw" | "promotion" | "promotionRedemption" | "order">;
type CheckoutCustomerClient = Pick<Prisma.TransactionClient, "customer">;
const checkoutCustomerSelect = { id: true, email: true, userId: true } as const;

function paymentDetails(method: CheckoutRequest["paymentMethod"]) {
  if (method === "cash") return { method: PaymentMethod.CASH, status: PaymentStatus.CASH_DUE, provider: "cash" };
  if (process.env.ALLOW_MOCK_PAYMENTS === "true") return { method: PaymentMethod.KNET, status: PaymentStatus.PENDING, provider: "mock-knet" };
  throw new CheckoutError("Online payment is not available.");
}

export class CheckoutError extends Error {}

export async function resolveCheckoutCustomer(client: CheckoutCustomerClient, contact: CheckoutRequest["contact"], authenticatedCustomerId?: string) {
  if (authenticatedCustomerId) {
    const customer = await client.customer.findFirst({
      where: { id: authenticatedCustomerId, userId: { not: null } },
      select: checkoutCustomerSelect,
    });
    if (!customer) throw new CheckoutError("Your customer session is no longer valid.");
    return customer;
  }

  const matches = await client.customer.findMany({
    where: { phone: { in: kuwaitPhoneLookupValues(contact.phone) } },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: checkoutCustomerSelect,
  });
  if (matches.length > 1) return null;
  const existing = matches[0];
  if (existing?.userId) return null;
  // A phone number alone is not proof of ownership. Order contact details are
  // snapshotted separately, so prior guest profile data remains untouched.
  if (existing) return existing;
  return client.customer.create({
    data: { name: contact.name, phone: contact.phone, email: contact.email },
    select: checkoutCustomerSelect,
  });
}

export const consumingRedemptionOrderStatuses = [OrderStatus.NEW, OrderStatus.ASSIGNED_TO_BRANCH, OrderStatus.ASSIGNED_TO_DRIVER, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.REFUND_REQUESTED, OrderStatus.REFUNDED];

export function selectBestAutomaticPromotion<T extends { discount: Prisma.Decimal; promotion?: { priority: number } }>(promotions: T[]) {
  let best: T | null = null;
  for (const promotion of promotions) {
    if (!best || (promotion.promotion?.priority ?? 0) > (best.promotion?.priority ?? 0) || ((promotion.promotion?.priority ?? 0) === (best.promotion?.priority ?? 0) && promotion.discount.greaterThan(best.discount))) best = promotion;
  }
  return best;
}

async function evaluateCandidate(client: PromotionClient, promotion: PromotionForQuote | null, lines: PromotionLine[], subtotal: Prisma.Decimal, deliveryFee: Prisma.Decimal, branchId: string, areaId: string | undefined, customerId?: string) {
  const now = new Date();
  if (!promotion || !promotion.isActive || !["ACTIVE", "SCHEDULED"].includes(promotion.status) || (promotion.startsAt && promotion.startsAt > now) || (promotion.endsAt && promotion.endsAt <= now)) {
    throw new CheckoutError("This promotion is invalid or inactive.");
  }
  if (promotion.minimumCartValue && subtotal.lessThan(promotion.minimumCartValue)) {
    throw new CheckoutError("This promotion requires a higher cart value.");
  }
  if (promotion.branchRestrictions.length && !promotion.branchRestrictions.some((restriction) => restriction.branchId === branchId)) throw new CheckoutError("This promotion is not available from the selected branch.");
  if (promotion.areaRestrictions.length && (!areaId || !promotion.areaRestrictions.some((restriction) => restriction.areaId === areaId))) throw new CheckoutError("This promotion is not available in the selected delivery area.");
  const consumingOrder = { status: { in: consumingRedemptionOrderStatuses } };
  if (promotion.usageLimit != null && await client.promotionRedemption.count({ where: { promotionId: promotion.id, order: consumingOrder } }) >= promotion.usageLimit) {
    throw new CheckoutError("This promotion has reached its usage limit.");
  }
  if (customerId && promotion.perCustomerLimit != null && await client.promotionRedemption.count({ where: { promotionId: promotion.id, customerId, order: consumingOrder } }) >= promotion.perCustomerLimit) {
    throw new CheckoutError("You have reached the usage limit for this promotion.");
  }
  if (promotion.firstOrderOnly && customerId) {
    // Serialize first-order checks across every promotion code for this customer.
    await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`customer:first-order:${customerId}`}))`;
    if (await client.order.count({ where: { customerId, status: consumingOrder.status } }) > 0) throw new CheckoutError("This promotion is for a first order only.");
  }
  let discount: Prisma.Decimal;
  try {
    ({ discount } = calculatePromotionDiscount(promotion, lines));
  } catch (error) {
    throw new CheckoutError(error instanceof Error ? error.message : "This promotion does not apply to the cart.");
  }
  return { promotion, discount: promotion.benefit === "FREE_DELIVERY" ? decimal(0) : discount, deliveryDiscount: promotion.benefit === "FREE_DELIVERY" ? deliveryFee : decimal(0) };
}

async function evaluatePromotion(client: PromotionClient, code: string | undefined, lines: PromotionLine[], subtotal: Prisma.Decimal, deliveryFee: Prisma.Decimal, branchId: string, areaId: string | undefined, customerId?: string, lockUsage = false) {
  // A supplied code takes precedence. Code-less promotions are automatic and never stack.
  if (lockUsage) await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${code ? `promotion:${code}` : "promotion:automatic"}))`;
  if (code) {
    const promotion = await client.promotion.findUnique({ where: { code }, include: { targets: true, branchRestrictions: true, areaRestrictions: true } }) as PromotionForQuote | null;
    try {
      return await evaluateCandidate(client, promotion, lines, subtotal, deliveryFee, branchId, areaId, customerId);
    } catch (error) {
      throw new CheckoutError(error instanceof Error ? error.message.replace("This promotion is", "This promotion code is") : "This promotion code is invalid or inactive.");
    }
  }

  const promotions = await client.promotion.findMany({
    where: { code: null, isActive: true },
    include: { targets: true, branchRestrictions: true, areaRestrictions: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  }) as PromotionForQuote[];
  const eligible = await Promise.all(promotions.map(async (promotion) => {
    try {
      return await evaluateCandidate(client, promotion, lines, subtotal, deliveryFee, branchId, areaId, customerId);
    } catch {
      return null;
    }
  }));
  return selectBestAutomaticPromotion(eligible.filter((promotion): promotion is NonNullable<typeof promotion> => promotion !== null));
}

export async function quoteCheckout(input: CheckoutRequest, authenticatedCustomerId?: string) {
  const legacyProductIds = input.items.map((item) => item.productId);
  const products = await db.product.findMany({
    // `legacyId` is retained for carts persisted before Phase 3; publicId is the
    // canonical identifier for newly emitted storefront payloads.
    where: { OR: [{ publicId: { in: legacyProductIds } }, { legacyId: { in: legacyProductIds } }], isActive: true, archivedAt: null, category: { isActive: true, archivedAt: null } },
    include: { category: { select: { id: true, name: true } }, optionGroups: { include: { values: { where: { isActive: true } } } }, variants: { where: { isActive: true }, orderBy: { publicId: "asc" } } },
  });
  if (products.length !== new Set(legacyProductIds).size) throw new CheckoutError("One or more products are unavailable.");

  const selectedBranch = input.branchId
    ? await db.branch.findFirst({ where: { OR: [{ legacyId: input.branchId }, { publicId: input.branchId }], isActive: true } })
    : null;
  if (!selectedBranch) throw new CheckoutError("Select an available branch.");
  if (input.mode === "delivery" && !selectedBranch.deliveryEnabled) throw new CheckoutError("Delivery is not available from this branch.");
  if (input.mode === "pickup" && !selectedBranch.pickupEnabled) throw new CheckoutError("Pickup is not available from this branch.");
  if (input.mode === "delivery" && !input.areaId) throw new CheckoutError("Select a delivery area.");
  if (input.mode === "delivery" && !input.address) throw new CheckoutError("Provide a delivery address.");

  const coverage =
    input.mode === "delivery"
      ? await db.branchDeliveryCoverage.findFirst({
          where: {
            branchId: selectedBranch.id,
            isActive: true,
            area: { OR: [{ legacyId: input.areaId! }, { publicId: input.areaId! }], isActive: true },
          },
          include: { area: true },
        })
      : null;
  if (input.mode === "delivery" && !coverage) throw new CheckoutError("This branch does not serve the selected area.");
  if (!(await isValidFulfillmentSlot(selectedBranch.legacyId ?? selectedBranch.publicId, input.mode, input.scheduledStartAt, input.scheduledEndAt))) throw new CheckoutError("The selected fulfillment time is no longer available.");

  const quantities = new Map<string, number>();
  const lines = input.items.map((item) => {
    const product = products.find((candidate) => candidate.publicId === item.productId || candidate.legacyId === item.productId)!;
    const variant = item.variantId
      ? product.variants.find((candidate) => candidate.publicId === item.variantId)
      : product.variants.find((candidate) => candidate.isDefault);
    if (!variant) throw new CheckoutError(`The selected variant is no longer available for ${product.name}.`);
    if (input.mode === "delivery" && !product.isDeliveryEnabled) throw new CheckoutError(`${product.name} is not available for delivery.`);
    if (input.mode === "pickup" && !product.isPickupEnabled) throw new CheckoutError(`${product.name} is not available for pickup.`);
    const quantityKey = `${product.id}:${variant.id}`;
    quantities.set(quantityKey, (quantities.get(quantityKey) ?? 0) + item.quantity);

    if (new Set(item.optionValueIds).size !== item.optionValueIds.length) throw new CheckoutError(`Duplicate options are not allowed for ${product.name}.`);
    const options = item.optionValueIds.map((legacyId) => {
      const group = product.optionGroups.find((candidate) => candidate.values.some((value) => value.legacyId === legacyId));
      const value = group?.values.find((candidate) => candidate.legacyId === legacyId);
      if (!group || !value) throw new CheckoutError(`An option is no longer available for ${product.name}.`);
      return { group, value };
    });
    for (const group of product.optionGroups) {
      const count = options.filter((option) => option.group.id === group.id).length;
      const minimum = group.isRequired ? Math.max(1, group.minSelections) : 0;
      const maximum = group.allowsMultiple ? group.maxSelections : 1;
      if (count < minimum || (maximum != null && count > maximum)) throw new CheckoutError(`Select valid options for ${product.name}.`);
    }
    const unitPrice = options.reduce((price, option) => price.plus(option.value.priceDelta), decimal(variant.price));
    return { item, product, variant, options, unitPrice, quantity: item.quantity, lineTotal: unitPrice.mul(item.quantity) };
  });

  for (const line of lines) {
    const quantity = quantities.get(`${line.product.id}:${line.variant.id}`)!;
    if (quantity < line.product.minQuantity || (line.product.maxQuantity && quantity > line.product.maxQuantity) || quantity % line.product.quantityIncrement !== 0) throw new CheckoutError(`Quantity is not allowed for ${line.product.name}.`);
  }

  const subtotal = lines.reduce((total, line) => total.plus(line.lineTotal), decimal(0));
  if (coverage && subtotal.lessThan(coverage.minimumOrderValue)) throw new CheckoutError("The minimum order value for this area has not been reached.");
  const deliveryFee = coverage?.deliveryFee ?? decimal(0);
  const customer = input.promotionCode
    ? authenticatedCustomerId
      ? await db.customer.findFirst({ where: { id: authenticatedCustomerId, userId: { not: null } }, select: { id: true } })
      : await db.customer.findFirst({ where: { phone: { in: kuwaitPhoneLookupValues(input.contact.phone) }, userId: null }, select: { id: true } })
    : null;
  const appliedPromotion = await evaluatePromotion(db, input.promotionCode, lines, subtotal, deliveryFee, selectedBranch.id, coverage?.areaId, customer?.id);
  const discountTotal = appliedPromotion?.discount ?? decimal(0);
  const deliveryDiscount = appliedPromotion?.deliveryDiscount ?? decimal(0);
  return { branch: selectedBranch, coverage, lines, subtotal, deliveryFee, discountTotal: discountTotal.plus(deliveryDiscount), promotion: appliedPromotion?.promotion ?? null, total: subtotal.minus(discountTotal).plus(deliveryFee).minus(deliveryDiscount) };
}

function orderNumber() {
  return `PS-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function createOrder(input: CheckoutRequest, authenticatedCustomerId?: string) {
  const recentOrders = await db.order.count({
    where: { contactPhone: { in: kuwaitPhoneLookupValues(input.contact.phone) }, createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
  });
  if (recentOrders >= 3) throw new CheckoutError("Too many recent orders. Please wait before trying again.");
  const quote = await quoteCheckout(input, authenticatedCustomerId);
  const payment = paymentDetails(input.paymentMethod);
  const now = new Date();
  const reservationExpiry = payment.method === PaymentMethod.CASH ? null : new Date(now.getTime() + ONLINE_RESERVATION_TTL_MS);

  const created = await db.$transaction(async (tx) => {
    const reservationSnapshots: Array<{ quantity: number; line: typeof quote.lines[number] }> = [];
    for (const line of quote.lines) {
      const updated = await tx.$queryRaw<Array<{ quantity: number }>>`
        UPDATE "InventoryLevel"
        SET "reserved" = "reserved" + ${line.item.quantity}, "updatedAt" = NOW()
        WHERE "branchId" = ${quote.branch.id}::uuid
           AND "productId" = ${line.product.id}::uuid
           AND "variantId" = ${line.variant.id}::uuid
           AND "quantity" - "reserved" >= ${line.item.quantity}
        RETURNING "quantity"`;
      if (updated.length !== 1) throw new CheckoutError(`${line.product.name} is out of stock at this branch.`);
      reservationSnapshots.push({ quantity: updated[0].quantity, line });
    }

    const customer = await resolveCheckoutCustomer(tx, input.contact, authenticatedCustomerId);
    const appliedPromotion = await evaluatePromotion(tx, input.promotionCode, quote.lines, quote.subtotal, quote.deliveryFee, quote.branch.id, quote.coverage?.areaId, customer?.id, true);
    const discountTotal = appliedPromotion?.discount ?? decimal(0);
    const deliveryDiscount = appliedPromotion?.deliveryDiscount ?? decimal(0);
    const total = quote.subtotal.minus(discountTotal).plus(quote.deliveryFee).minus(deliveryDiscount);
    const created = await tx.order.create({
      data: {
        orderNumber: orderNumber(),
        trackingToken: randomBytes(24).toString("base64url"),
        customerId: customer?.id,
        branchId: quote.branch.id,
        coverageId: quote.coverage?.id,
        fulfillmentMode: input.mode === "delivery" ? FulfillmentMode.DELIVERY : FulfillmentMode.PICKUP,
        paymentMethod: payment.method,
        paymentStatus: payment.status,
        contactName: input.contact.name,
        contactPhone: input.contact.phone,
        addressSnapshot: input.address ?? undefined,
        scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : undefined,
        scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : undefined,
        customerNote: input.customerNote,
        subtotal: quote.subtotal,
        discountTotal: discountTotal.plus(deliveryDiscount),
        deliveryFee: quote.deliveryFee,
        total,
        items: {
          create: quote.lines.map((line) => ({
            productId: line.product.id,
            variantId: line.variant.id,
            productName: line.product.name,
            productNameAr: line.product.nameAr,
            sku: line.variant.sku ?? line.product.sku,
            imagePath: line.product.primaryImagePath,
            categoryIdSnapshot: line.product.category.id,
            categoryNameSnapshot: line.product.category.name,
            unitPrice: line.unitPrice,
            unitCost: line.variant.cost,
            quantity: line.item.quantity,
            lineTotal: line.lineTotal,
            note: line.item.note,
            options: {
              create: line.options.map(({ group, value }) => ({
                optionValueId: value.id,
                groupName: group.name,
                groupNameAr: group.nameAr,
                value: value.value,
                valueAr: value.valueAr,
                priceDelta: value.priceDelta,
              })),
            },
          })),
        },
        reservations: {
          create: quote.lines.map((line) => ({
            branchId: quote.branch.id,
            productId: line.product.id,
            variantId: line.variant.id,
            quantity: line.item.quantity,
            expiresAt: reservationExpiry,
          })),
        },
        payments: {
          create: {
            provider: payment.provider,
            method: payment.method,
            status: payment.status,
            amount: total,
            merchantTrackId: `PAY-${randomBytes(12).toString("hex")}`,
          },
        },
        statusHistory: { create: { toStatus: "NEW", note: "Order created" } },
        redemptions: appliedPromotion ? { create: { promotionId: appliedPromotion.promotion.id, customerId: customer?.id, amount: discountTotal.plus(deliveryDiscount) } } : undefined,
      },
      include: { payments: true, reservations: true, customer: { select: { email: true } } },
    });
    for (const [index, snapshot] of reservationSnapshots.entries()) {
      const reservation = created.reservations[index];
      await writeInventoryMovement(tx, {
        branchId: quote.branch.id, productId: snapshot.line.product.id, variantId: snapshot.line.variant.id,
        orderId: created.id, type: "RESERVATION", quantity: 0,
        beforeQuantity: snapshot.quantity, afterQuantity: snapshot.quantity, reason: "ORDER_RESERVATION", reasonValue: "checkout",
        referenceType: "inventoryReservation", referenceId: reservation.id, correlationId: created.id,
        note: "Inventory reserved for checkout", actorId: undefined,
      });
    }
    return created;
  });
  notifyOrderCreated({ ...created, email: created.customer?.email ?? input.contact.email });
  void notifyStaff({ title: "New order received", body: `Order ${created.orderNumber} is awaiting fulfillment.`, href: "/admin/orders", roles: ["OWNER", "MANAGER", "ORDER_STAFF"] });
  return created;
}
