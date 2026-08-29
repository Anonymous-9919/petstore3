import "server-only";

import {
  InventoryMovementType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReservationStatus,
} from "@prisma/client";
import { db } from "@/server/db";
import { writeInventoryMovement } from "@/server/services/inventory-ledger";

const paymentInclude = {
  order: {
    include: {
      items: { select: { productId: true, variantId: true, quantity: true } },
      reservations: true,
    },
  },
} satisfies Prisma.PaymentInclude;

const cashOrderInclude = {
  customer: { select: { email: true } },
  items: { select: { productId: true, variantId: true, quantity: true } },
  payments: true,
  reservations: true,
} satisfies Prisma.OrderInclude;

const settlementOrderSelect = {
  id: true,
  orderNumber: true,
  trackingToken: true,
  status: true,
  paymentStatus: true,
  total: true,
  currencyCode: true,
} satisfies Prisma.OrderSelect;

const cashResultSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  total: true,
  currencyCode: true,
  customer: { select: { email: true } },
} satisfies Prisma.OrderSelect;

type TransactionClient = Prisma.TransactionClient;
type LoadedPayment = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;
type LoadedCashOrder = Prisma.OrderGetPayload<{ include: typeof cashOrderInclude }>;
type InventoryBackedOrder = Pick<LoadedPayment["order"], "id" | "branchId" | "items" | "reservations">;

export type PaymentIntegrityCode =
  | "NOT_FOUND"
  | "CONTEXT_MISMATCH"
  | "CONTRADICTORY_OUTCOME"
  | "INVALID_STATE"
  | "INVALID_RESERVATIONS"
  | "INVENTORY_MISMATCH";

export class PaymentIntegrityError extends Error {
  constructor(message: string, readonly code: PaymentIntegrityCode) {
    super(message);
    this.name = "PaymentIntegrityError";
  }
}

export type KnetSettlementInput = {
  trackId: string;
  outcome: "CAPTURED" | "FAILED";
  context: {
    paymentId: string;
    orderId: string;
    trackingToken: string;
    provider: string;
    amount: string;
    currencyCode: string;
    providerReference: string;
  };
  payload: Record<string, string>;
};

function integrityError(message: string, code: PaymentIntegrityCode): never {
  throw new PaymentIntegrityError(message, code);
}

function canonicalCurrency(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "414" || normalized === "KD") return "KWD";
  return normalized;
}

function payloadValues(payload: Record<string, string>, keys: string[]) {
  const accepted = new Set(keys.map((key) => key.toLowerCase()));
  return Object.entries(payload)
    .filter(([key]) => accepted.has(key.toLowerCase()))
    .map(([, value]) => value.trim())
    .filter(Boolean);
}

function validateCallbackPayload(input: KnetSettlementInput) {
  const trackIds = payloadValues(input.payload, ["trackid", "merchantTrackId", "udf1"]);
  if (trackIds.length === 0 || trackIds.some((value) => value !== input.trackId)) {
    integrityError("The payment callback reference does not match.", "CONTEXT_MISMATCH");
  }

  const results = payloadValues(input.payload, ["result"]);
  if (
    results.length === 0 ||
    results.some((value) => (value.toUpperCase() === "CAPTURED") !== (input.outcome === "CAPTURED"))
  ) {
    integrityError("The payment callback result does not match.", "CONTEXT_MISMATCH");
  }

  let expectedAmount: Prisma.Decimal;
  try {
    expectedAmount = new Prisma.Decimal(input.context.amount);
  } catch {
    integrityError("The expected payment amount is invalid.", "CONTEXT_MISMATCH");
  }
  const amounts = payloadValues(input.payload, ["amt", "amount"]);
  if (amounts.length === 0 || amounts.some((value) => {
    try {
      return !new Prisma.Decimal(value).equals(expectedAmount);
    } catch {
      return true;
    }
  })) {
    integrityError("The payment callback amount does not match.", "CONTEXT_MISMATCH");
  }

  const expectedCurrency = canonicalCurrency(input.context.currencyCode);
  const currencies = payloadValues(input.payload, ["currency", "currencyCode"]);
  if (currencies.length === 0 || currencies.some((value) => canonicalCurrency(value) !== expectedCurrency)) {
    integrityError("The payment callback currency does not match.", "CONTEXT_MISMATCH");
  }

  const providerReferences = payloadValues(input.payload, ["paymentId", "providerRef"]);
  if (
    !input.context.providerReference ||
    providerReferences.length === 0 ||
    providerReferences.some((value) => value !== input.context.providerReference)
  ) {
    integrityError("The payment provider reference does not match.", "CONTEXT_MISMATCH");
  }

  const providers = payloadValues(input.payload, ["provider"]);
  if (providers.some((value) => value !== input.context.provider)) {
    integrityError("The payment provider does not match.", "CONTEXT_MISMATCH");
  }
}

function validatePaymentContext(payment: LoadedPayment, input: KnetSettlementInput) {
  let expectedAmount: Prisma.Decimal;
  try {
    expectedAmount = new Prisma.Decimal(input.context.amount);
  } catch {
    integrityError("The expected payment amount is invalid.", "CONTEXT_MISMATCH");
  }
  const expectedCurrency = canonicalCurrency(input.context.currencyCode);
  if (
    payment.id !== input.context.paymentId ||
    payment.orderId !== input.context.orderId ||
    payment.order.id !== input.context.orderId ||
    payment.order.trackingToken !== input.context.trackingToken ||
    payment.merchantTrackId !== input.trackId ||
    payment.provider !== input.context.provider ||
    payment.method !== PaymentMethod.KNET ||
    payment.order.paymentMethod !== PaymentMethod.KNET ||
    !payment.amount.equals(expectedAmount) ||
    !payment.amount.equals(payment.order.total) ||
    canonicalCurrency(payment.currencyCode) !== expectedCurrency ||
    canonicalCurrency(payment.order.currencyCode) !== expectedCurrency ||
    (payment.providerRef != null && payment.providerRef !== input.context.providerReference)
  ) {
    integrityError("The payment does not match the expected order context.", "CONTEXT_MISMATCH");
  }
}

function quantitiesByInventoryKey(reservations: InventoryBackedOrder["reservations"]) {
  const quantities = new Map<string, { branchId: string; productId: string; variantId: string; quantity: number }>();
  for (const reservation of reservations) {
    if (!reservation.variantId) integrityError("Inventory reservations must identify a variant.", "INVALID_RESERVATIONS");
    const key = `${reservation.branchId}:${reservation.productId}:${reservation.variantId}`;
    const current = quantities.get(key);
    if (current) current.quantity += reservation.quantity;
    else quantities.set(key, { branchId: reservation.branchId, productId: reservation.productId, variantId: reservation.variantId, quantity: reservation.quantity });
  }
  return quantities;
}

function assertConsumableReservations(order: InventoryBackedOrder, kind: "CASH" | "ONLINE", now: Date) {
  if (!order.branchId || order.items.length === 0) {
    integrityError("The order has no reservable inventory items.", "INVALID_RESERVATIONS");
  }

  const expected = new Map<string, number>();
  for (const item of order.items) {
    if (!item.productId || !item.variantId || item.quantity <= 0) {
      integrityError("The order contains an invalid inventory item.", "INVALID_RESERVATIONS");
    }
    const key = `${order.branchId}:${item.productId}:${item.variantId}`;
    expected.set(key, (expected.get(key) ?? 0) + item.quantity);
  }

  const actual = quantitiesByInventoryKey(order.reservations);
  if (actual.size !== expected.size) {
    integrityError("Required inventory reservations are missing.", "INVALID_RESERVATIONS");
  }
  for (const [key, quantity] of expected) {
    if (actual.get(key)?.quantity !== quantity) {
      integrityError("Required inventory reservations do not match the order.", "INVALID_RESERVATIONS");
    }
  }

  for (const reservation of order.reservations) {
    if (
      reservation.orderId !== order.id ||
      reservation.branchId !== order.branchId ||
      reservation.quantity <= 0 ||
      reservation.status !== ReservationStatus.ACTIVE
    ) {
      integrityError("Required inventory reservations are unavailable.", "INVALID_RESERVATIONS");
    }
    if (kind === "CASH" && reservation.expiresAt != null) {
      integrityError("Cash inventory reservations must not expire automatically.", "INVALID_RESERVATIONS");
    }
    if (kind === "ONLINE" && (reservation.expiresAt == null || reservation.expiresAt <= now)) {
      integrityError("The online payment reservation has expired.", "INVALID_RESERVATIONS");
    }
  }
}

async function consumeReservations(
  tx: TransactionClient,
  order: InventoryBackedOrder,
  kind: "CASH" | "ONLINE",
  now: Date,
  note: string,
  actorId?: string,
) {
  for (const reservation of order.reservations) {
    const transitioned = await tx.inventoryReservation.updateMany({
      where: {
        id: reservation.id,
        orderId: order.id,
        status: ReservationStatus.ACTIVE,
        ...(kind === "CASH" ? { expiresAt: null } : { expiresAt: { gt: now } }),
      },
      data: { status: ReservationStatus.CONSUMED },
    });
    if (transitioned.count !== 1) {
      integrityError("An inventory reservation changed before it could be consumed.", "INVALID_RESERVATIONS");
    }
  }

  for (const inventory of quantitiesByInventoryKey(order.reservations).values()) {
    const updated = await tx.$queryRaw<Array<{ quantity: number }>>`
      UPDATE "InventoryLevel"
      SET "reserved" = "reserved" - ${inventory.quantity}, "quantity" = "quantity" - ${inventory.quantity}, "updatedAt" = NOW()
      WHERE "branchId" = ${inventory.branchId}::uuid AND "productId" = ${inventory.productId}::uuid
        AND "variantId" = ${inventory.variantId}::uuid
        AND "reserved" >= ${inventory.quantity} AND "quantity" >= ${inventory.quantity}
      RETURNING "quantity"`;
    if (updated.length !== 1) {
      integrityError("Reserved inventory could not be consumed.", "INVENTORY_MISMATCH");
    }
    await writeInventoryMovement(tx, {
      branchId: inventory.branchId, productId: inventory.productId, variantId: inventory.variantId, orderId: order.id,
      type: InventoryMovementType.SALE, quantity: -inventory.quantity,
      beforeQuantity: updated[0].quantity + inventory.quantity, afterQuantity: updated[0].quantity,
      reason: "ORDER_SALE", reasonValue: "payment captured", referenceType: "order", referenceId: order.id, correlationId: order.id,
      note, actorId,
    });
  }
}

async function releaseActiveReservations(
  tx: TransactionClient,
  order: Pick<InventoryBackedOrder, "id" | "reservations">,
  status: typeof ReservationStatus.RELEASED | typeof ReservationStatus.EXPIRED,
  note: string,
  actorId?: string,
) {
  if (order.reservations.some((reservation) => reservation.status === ReservationStatus.CONSUMED)) {
    integrityError("Consumed inventory cannot be released.", "INVALID_RESERVATIONS");
  }

  const released = [];
  for (const reservation of order.reservations) {
    if (reservation.status !== ReservationStatus.ACTIVE) continue;
    const transitioned = await tx.inventoryReservation.updateMany({
      where: { id: reservation.id, orderId: order.id, status: ReservationStatus.ACTIVE },
      data: { status },
    });
    if (transitioned.count !== 1) {
      integrityError("An inventory reservation changed before it could be released.", "INVALID_RESERVATIONS");
    }
    released.push(reservation);
  }

  for (const inventory of quantitiesByInventoryKey(released).values()) {
    const updated = await tx.$queryRaw<Array<{ quantity: number }>>`
      UPDATE "InventoryLevel"
      SET "reserved" = "reserved" - ${inventory.quantity}, "updatedAt" = NOW()
      WHERE "branchId" = ${inventory.branchId}::uuid AND "productId" = ${inventory.productId}::uuid
        AND "variantId" = ${inventory.variantId}::uuid
        AND "reserved" >= ${inventory.quantity}
      RETURNING "quantity"`;
    if (updated.length !== 1) {
      integrityError("Reserved inventory could not be released.", "INVENTORY_MISMATCH");
    }
    await writeInventoryMovement(tx, {
      branchId: inventory.branchId, productId: inventory.productId, variantId: inventory.variantId, orderId: order.id,
      type: InventoryMovementType.RELEASE, quantity: 0,
      beforeQuantity: updated[0].quantity, afterQuantity: updated[0].quantity,
      reason: "ORDER_RELEASE", reasonValue: status === ReservationStatus.EXPIRED ? "reservation expired" : "reservation released", referenceType: "order", referenceId: order.id, correlationId: order.id,
      note, actorId,
    });
  }
  return released.length;
}

function isIdempotentSettlement(payment: LoadedPayment, outcome: KnetSettlementInput["outcome"]) {
  const target = outcome === "CAPTURED" ? PaymentStatus.PAID : PaymentStatus.FAILED;
  if (payment.status === target) {
    if (payment.order.paymentStatus !== target) {
      integrityError("The payment and order terminal states do not match.", "INVALID_STATE");
    }
    return true;
  }
  if (payment.status !== PaymentStatus.PENDING) {
    integrityError("A terminal payment outcome cannot be reversed.", "CONTRADICTORY_OUTCOME");
  }
  if (payment.order.paymentStatus !== PaymentStatus.PENDING || payment.order.status !== OrderStatus.NEW) {
    integrityError("The order is not available for payment settlement.", "INVALID_STATE");
  }
  return false;
}

async function loadPayment(tx: TransactionClient, trackId: string) {
  return tx.payment.findUnique({ where: { merchantTrackId: trackId }, include: paymentInclude });
}

async function settlementOrder(tx: TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({ where: { id: orderId }, select: settlementOrderSelect });
  if (!order) integrityError("The payment order no longer exists.", "NOT_FOUND");
  return order;
}

export async function settleKnetPayment(input: KnetSettlementInput) {
  return db.$transaction(async (tx) => {
    let payment = await loadPayment(tx, input.trackId);
    if (!payment) integrityError("The payment was not found.", "NOT_FOUND");
    validatePaymentContext(payment, input);
    validateCallbackPayload(input);
    if (isIdempotentSettlement(payment, input.outcome)) return settlementOrder(tx, payment.orderId);

    const now = new Date();
    const captured = input.outcome === "CAPTURED";
    if (captured) assertConsumableReservations(payment.order, "ONLINE", now);

    const targetPaymentStatus = captured ? PaymentStatus.PAID : PaymentStatus.FAILED;
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: {
        status: targetPaymentStatus,
        providerRef: input.context.providerReference,
        providerPayload: input.payload,
        failureReason: captured ? null : input.payload.result || "KNET payment failed",
      },
    });
    if (claimed.count !== 1) {
      payment = await loadPayment(tx, input.trackId);
      if (!payment) integrityError("The payment was not found.", "NOT_FOUND");
      validatePaymentContext(payment, input);
      if (isIdempotentSettlement(payment, input.outcome)) return settlementOrder(tx, payment.orderId);
      integrityError("The payment outcome changed concurrently.", "CONTRADICTORY_OUTCOME");
    }

    const targetOrderStatus = captured ? OrderStatus.NEW : OrderStatus.PAYMENT_FAILED;
    const orderUpdated = await tx.order.updateMany({
      where: {
        id: payment.orderId,
        status: OrderStatus.NEW,
        paymentMethod: PaymentMethod.KNET,
        paymentStatus: PaymentStatus.PENDING,
      },
      data: { status: targetOrderStatus, paymentStatus: targetPaymentStatus, ...(captured ? { paidAt: now } : {}) },
    });
    if (orderUpdated.count !== 1) {
      integrityError("The order changed before payment settlement completed.", "INVALID_STATE");
    }

    if (captured) {
      await consumeReservations(tx, payment.order, "ONLINE", now, "KNET payment captured");
    } else {
      await releaseActiveReservations(tx, payment.order, ReservationStatus.RELEASED, "KNET payment failed");
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: OrderStatus.NEW,
          toStatus: OrderStatus.PAYMENT_FAILED,
          note: "Online payment failed",
        },
      });
    }

    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventKey: `payment:${payment.id}:${targetPaymentStatus}`,
        eventType: captured ? "captured" : "failed",
        payload: input.payload,
      },
    });
    return settlementOrder(tx, payment.orderId);
  });
}

export type OnlineReservationExpiryResult = {
  outcome: "expired" | "skipped";
  releasedReservations: number;
};

export async function expireOnlineReservationOrder(orderId: string, now = new Date()): Promise<OnlineReservationExpiryResult> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payments: true, reservations: true },
    });
    if (!order || order.paymentMethod === PaymentMethod.CASH || order.paymentStatus !== PaymentStatus.PENDING) {
      return { outcome: "skipped", releasedReservations: 0 };
    }
    if (!order.reservations.some((reservation) => reservation.status === ReservationStatus.ACTIVE && reservation.expiresAt != null && reservation.expiresAt <= now)) {
      return { outcome: "skipped", releasedReservations: 0 };
    }
    if (order.status !== OrderStatus.NEW || order.reservations.some((reservation) => reservation.status === ReservationStatus.CONSUMED)) {
      integrityError("The expiring order has an invalid inventory state.", "INVALID_STATE");
    }

    const pendingPayments = order.payments.filter((payment) => payment.status === PaymentStatus.PENDING);
    if (pendingPayments.length !== 1) {
      integrityError("The expiring order does not have one pending payment.", "INVALID_STATE");
    }
    const payment = pendingPayments[0];
    if (
      payment.method !== order.paymentMethod ||
      !payment.amount.equals(order.total) ||
      canonicalCurrency(payment.currencyCode) !== canonicalCurrency(order.currencyCode)
    ) {
      integrityError("The expiring payment does not match its order.", "CONTEXT_MISMATCH");
    }

    const paymentClaimed = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED, failureReason: "Inventory reservation expired" },
    });
    if (paymentClaimed.count !== 1) return { outcome: "skipped", releasedReservations: 0 };

    const orderClaimed = await tx.order.updateMany({
      where: { id: order.id, status: OrderStatus.NEW, paymentStatus: PaymentStatus.PENDING },
      data: { status: OrderStatus.PAYMENT_FAILED, paymentStatus: PaymentStatus.FAILED },
    });
    if (orderClaimed.count !== 1) {
      integrityError("The order changed before its reservations expired.", "INVALID_STATE");
    }

    const releasedReservations = await releaseActiveReservations(
      tx,
      order,
      ReservationStatus.EXPIRED,
      "Online checkout reservation expired",
    );
    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventKey: `payment:${payment.id}:reservation-expired`,
        eventType: "reservation_expired",
        payload: { expiredAt: now.toISOString() },
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: OrderStatus.NEW,
        toStatus: OrderStatus.PAYMENT_FAILED,
        note: "Online payment reservation expired",
      },
    });
    return { outcome: "expired", releasedReservations };
  });
}

export type CashOrderTargetStatus = "ASSIGNED_TO_BRANCH" | "CANCELLED";

function validateCashPayment(order: LoadedCashOrder, expectedStatus: typeof PaymentStatus.CASH_DUE | typeof PaymentStatus.FAILED) {
  if (order.payments.length !== 1) {
    integrityError("The cash order does not have one payment record.", "INVALID_STATE");
  }
  const payment = order.payments[0];
  if (
    payment.provider !== "cash" ||
    payment.method !== PaymentMethod.CASH ||
    payment.status !== expectedStatus ||
    !payment.amount.equals(order.total) ||
    canonicalCurrency(payment.currencyCode) !== canonicalCurrency(order.currencyCode)
  ) {
    integrityError("The cash payment does not match its order.", "CONTEXT_MISMATCH");
  }
  return payment;
}

function isIdempotentCashTransition(order: LoadedCashOrder, targetStatus: CashOrderTargetStatus) {
  if (order.status !== targetStatus) return false;
  const expectedPaymentStatus = targetStatus === "CANCELLED" ? PaymentStatus.FAILED : PaymentStatus.CASH_DUE;
  if (order.paymentStatus !== expectedPaymentStatus) {
    integrityError("The cash order and payment terminal states do not match.", "INVALID_STATE");
  }
  validateCashPayment(order, expectedPaymentStatus);
  return true;
}

async function cashTransitionResult(tx: TransactionClient, orderId: string, changed: boolean) {
  const result = await tx.order.findUnique({ where: { id: orderId }, select: cashResultSelect });
  if (!result) integrityError("The cash order no longer exists.", "NOT_FOUND");
  const { customer, ...order } = result;
  return { order, email: customer?.email, changed };
}

export async function transitionCashOrder(input: {
  orderId: string;
  targetStatus: CashOrderTargetStatus;
  actorId: string;
}) {
  return db.$transaction(async (tx) => {
    let order = await tx.order.findUnique({ where: { id: input.orderId }, include: cashOrderInclude });
    if (!order || order.paymentMethod !== PaymentMethod.CASH) {
      integrityError("This cash order was not found.", "NOT_FOUND");
    }
    if (isIdempotentCashTransition(order, input.targetStatus)) {
      return cashTransitionResult(tx, order.id, false);
    }
    if (order.status !== OrderStatus.NEW || order.paymentStatus !== PaymentStatus.CASH_DUE) {
      integrityError("This order cannot be updated from its current state.", "CONTRADICTORY_OUTCOME");
    }
    const payment = validateCashPayment(order, PaymentStatus.CASH_DUE);
    if (input.targetStatus === "ASSIGNED_TO_BRANCH") {
      assertConsumableReservations(order, "CASH", new Date());
    } else if (order.reservations.some((reservation) => reservation.status === ReservationStatus.CONSUMED)) {
      integrityError("An accepted cash order cannot be cancelled as unprocessed.", "INVALID_RESERVATIONS");
    }

    const targetOrderStatus = input.targetStatus === "CANCELLED" ? OrderStatus.CANCELLED : OrderStatus.ASSIGNED_TO_BRANCH;
    const targetPaymentStatus = input.targetStatus === "CANCELLED" ? PaymentStatus.FAILED : PaymentStatus.CASH_DUE;
    const now = new Date();
    const claimed = await tx.order.updateMany({
      where: {
        id: order.id,
        status: OrderStatus.NEW,
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.CASH_DUE,
      },
      data: { status: targetOrderStatus, paymentStatus: targetPaymentStatus, ...(input.targetStatus === "ASSIGNED_TO_BRANCH" ? { acceptedAt: now } : { cancelledAt: now }) },
    });
    if (claimed.count !== 1) {
      order = await tx.order.findUnique({ where: { id: input.orderId }, include: cashOrderInclude });
      if (!order) integrityError("This cash order was not found.", "NOT_FOUND");
      if (isIdempotentCashTransition(order, input.targetStatus)) return cashTransitionResult(tx, order.id, false);
      integrityError("The cash order outcome changed concurrently.", "CONTRADICTORY_OUTCOME");
    }

    if (input.targetStatus === "ASSIGNED_TO_BRANCH") {
      await consumeReservations(tx, order, "CASH", new Date(), "Cash order accepted by branch", input.actorId);
    } else {
      const paymentUpdated = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.CASH_DUE },
        data: { status: PaymentStatus.FAILED, failureReason: "Cash order cancelled" },
      });
      if (paymentUpdated.count !== 1) {
        integrityError("The cash payment changed before cancellation completed.", "INVALID_STATE");
      }
      await releaseActiveReservations(tx, order, ReservationStatus.RELEASED, "Cash order cancelled", input.actorId);
      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventKey: `payment:${payment.id}:cash-cancelled`,
          eventType: "cash_cancelled",
          payload: { actorId: input.actorId },
        },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: OrderStatus.NEW,
        toStatus: targetOrderStatus,
        actorId: input.actorId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "order.status.updated",
        entityType: "order",
        entityId: order.id,
        before: { status: OrderStatus.NEW },
        after: { status: targetOrderStatus },
      },
    });
    return cashTransitionResult(tx, order.id, true);
  });
}

const operationalTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.NEW]: [OrderStatus.ASSIGNED_TO_BRANCH],
  [OrderStatus.ASSIGNED_TO_BRANCH]: [OrderStatus.ASSIGNED_TO_DRIVER],
  [OrderStatus.ASSIGNED_TO_DRIVER]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
};

export async function requestOrderRefund(input: { orderId: string; actorId: string; reason: string }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { customer: { select: { email: true } }, payments: true } });
    if (!order) integrityError("This order was not found.", "NOT_FOUND");
    if (order.status === OrderStatus.REFUND_REQUESTED) return { order, email: order.customer?.email, changed: false };
    if (order.status !== OrderStatus.DELIVERED || (order.paymentStatus !== PaymentStatus.PAID && order.paymentStatus !== PaymentStatus.CASH_COLLECTED)) {
      integrityError("Only a settled delivered order can be submitted for refund.", "CONTRADICTORY_OUTCOME");
    }
    const settledPayment = order.payments.find((payment) => payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.CASH_COLLECTED);
    if (!settledPayment) integrityError("The settled payment record is unavailable.", "INVALID_STATE");

    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: OrderStatus.DELIVERED, paymentStatus: order.paymentStatus },
      data: { status: OrderStatus.REFUND_REQUESTED },
    });
    if (claimed.count !== 1) {
      const current = await tx.order.findUnique({ where: { id: order.id }, include: { customer: { select: { email: true } } } });
      if (current?.status === OrderStatus.REFUND_REQUESTED) return { order: current, email: current.customer?.email, changed: false };
      integrityError("The order changed concurrently.", "CONTRADICTORY_OUTCOME");
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: OrderStatus.DELIVERED, toStatus: OrderStatus.REFUND_REQUESTED, note: input.reason, actorId: input.actorId } });
    await tx.auditLog.create({ data: { actorId: input.actorId, action: "order.refund.requested", entityType: "order", entityId: order.id, before: { status: OrderStatus.DELIVERED, paymentStatus: order.paymentStatus }, after: { status: OrderStatus.REFUND_REQUESTED, reason: input.reason } } });
    const updated = await tx.order.findUnique({ where: { id: order.id } });
    if (!updated) integrityError("The order no longer exists.", "NOT_FOUND");
    return { order: updated, email: order.customer?.email, changed: true };
  });
}

export async function transitionOperationalOrder(input: { orderId: string; targetStatus: OrderStatus; actorId: string }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { customer: { select: { email: true } }, payments: true } });
    if (!order) integrityError("This order was not found.", "NOT_FOUND");
    if (order.status === input.targetStatus) return { order, email: order.customer?.email, changed: false };
    if (!operationalTransitions[order.status]?.includes(input.targetStatus)) integrityError("This order cannot be updated from its current state.", "CONTRADICTORY_OUTCOME");
    if (order.status === OrderStatus.NEW && (order.paymentMethod === PaymentMethod.CASH || order.paymentStatus !== PaymentStatus.PAID)) integrityError("Only paid online orders can be accepted for fulfillment.", "CONTRADICTORY_OUTCOME");
    const now = new Date();
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: input.targetStatus,
        ...(input.targetStatus === OrderStatus.ASSIGNED_TO_BRANCH ? { acceptedAt: now } : {}),
        ...(input.targetStatus === OrderStatus.DELIVERED ? { deliveredAt: now } : {}),
      },
    });
    if (claimed.count !== 1) integrityError("The order changed concurrently.", "CONTRADICTORY_OUTCOME");
    if (input.targetStatus === OrderStatus.DELIVERED && order.paymentMethod === PaymentMethod.CASH) {
      const payment = order.payments.find((candidate) => candidate.status === PaymentStatus.CASH_DUE);
      if (!payment) integrityError("The cash payment is not due.", "INVALID_STATE");
      const settled = await tx.payment.updateMany({ where: { id: payment.id, status: PaymentStatus.CASH_DUE }, data: { status: PaymentStatus.CASH_COLLECTED } });
      if (settled.count !== 1) integrityError("The cash payment changed concurrently.", "INVALID_STATE");
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.CASH_COLLECTED, paidAt: now } });
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: input.targetStatus, actorId: input.actorId } });
    await tx.auditLog.create({ data: { actorId: input.actorId, action: "order.status.updated", entityType: "order", entityId: order.id, before: { status: order.status }, after: { status: input.targetStatus } } });
    const updated = await tx.order.findUnique({ where: { id: order.id } });
    if (!updated) integrityError("The order no longer exists.", "NOT_FOUND");
    return { order: updated, email: order.customer?.email, changed: true };
  });
}
