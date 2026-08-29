import {
  InventoryMovementType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReservationStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("@/server/db", () => ({ db: dbMock }));

import {
  expireOnlineReservationOrder,
  settleKnetPayment,
  requestOrderRefund,
  transitionCashOrder,
  type KnetSettlementInput,
} from "@/server/services/payments";

type TestState = {
  order: {
    id: string;
    orderNumber: string;
    trackingToken: string;
    branchId: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    total: Prisma.Decimal;
    currencyCode: string;
  };
  items: Array<{ productId: string; variantId: string; quantity: number }>;
  reservations: Array<{
    id: string;
    orderId: string;
    branchId: string;
    productId: string;
    variantId: string;
    quantity: number;
    status: ReservationStatus;
    expiresAt: Date | null;
    createdAt: Date;
  }>;
  payments: Array<{
    id: string;
    orderId: string;
    provider: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: Prisma.Decimal;
    currencyCode: string;
    merchantTrackId: string;
    providerRef: string | null;
    failureReason: string | null;
    providerPayload: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }>;
  inventory: { quantity: number; reserved: number };
  movements: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  histories: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
};

function onlineState(): TestState {
  const now = new Date();
  return {
    order: {
      id: "00000000-0000-4000-8000-000000000001",
      orderNumber: "PS-TEST-1",
      trackingToken: "tracking-token-with-enough-entropy",
      branchId: "00000000-0000-4000-8000-000000000002",
      status: OrderStatus.NEW,
      paymentMethod: PaymentMethod.KNET,
      paymentStatus: PaymentStatus.PENDING,
      total: new Prisma.Decimal("10.000"),
      currencyCode: "KWD",
    },
    items: [{ productId: "00000000-0000-4000-8000-000000000003", variantId: "00000000-0000-4000-8000-000000000006", quantity: 2 }],
    reservations: [{
      id: "00000000-0000-4000-8000-000000000004",
      orderId: "00000000-0000-4000-8000-000000000001",
      branchId: "00000000-0000-4000-8000-000000000002",
      productId: "00000000-0000-4000-8000-000000000003",
      variantId: "00000000-0000-4000-8000-000000000006",
      quantity: 2,
      status: ReservationStatus.ACTIVE,
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
    }],
    payments: [{
      id: "00000000-0000-4000-8000-000000000005",
      orderId: "00000000-0000-4000-8000-000000000001",
      provider: "mock-knet",
      method: PaymentMethod.KNET,
      status: PaymentStatus.PENDING,
      amount: new Prisma.Decimal("10.000"),
      currencyCode: "KWD",
      merchantTrackId: "PAY-TEST-1",
      providerRef: null as string | null,
      failureReason: null as string | null,
      providerPayload: null,
      createdAt: now,
      updatedAt: now,
    }],
    inventory: { quantity: 5, reserved: 2 },
    movements: [] as Array<Record<string, unknown>>,
    events: [] as Array<Record<string, unknown>>,
    histories: [] as Array<Record<string, unknown>>,
    audits: [] as Array<Record<string, unknown>>,
  };
}

function cashState() {
  const state = onlineState();
  state.order.paymentMethod = PaymentMethod.CASH;
  state.order.paymentStatus = PaymentStatus.CASH_DUE;
  state.payments[0].provider = "cash";
  state.payments[0].method = PaymentMethod.CASH;
  state.payments[0].status = PaymentStatus.CASH_DUE;
  state.reservations[0].expiresAt = null;
  return state;
}

function transactionFor(state: TestState) {
  const loadedOrder = () => ({
    ...state.order,
    customer: { email: "customer@example.test" },
    items: state.items.map((item) => ({ ...item })),
    payments: state.payments.map((payment) => ({ ...payment })),
    reservations: state.reservations.map((reservation) => ({ ...reservation })),
  });
  const loadedPayment = (trackId: string) => {
    const payment = state.payments.find((candidate) => candidate.merchantTrackId === trackId);
    return payment ? { ...payment, order: loadedOrder() } : null;
  };

  return {
    payment: {
      findUnique: vi.fn(async ({ where }: { where: { merchantTrackId: string } }) => loadedPayment(where.merchantTrackId)),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; status: PaymentStatus }; data: Record<string, unknown> }) => {
        const payment = state.payments.find((candidate) => candidate.id === where.id);
        if (!payment || payment.status !== where.status) return { count: 0 };
        Object.assign(payment, data);
        return { count: 1 };
      }),
    },
    order: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => where.id === state.order.id ? loadedOrder() : null),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (
          where.id !== state.order.id ||
          (where.status != null && where.status !== state.order.status) ||
          (where.paymentMethod != null && where.paymentMethod !== state.order.paymentMethod) ||
          (where.paymentStatus != null && where.paymentStatus !== state.order.paymentStatus)
        ) return { count: 0 };
        Object.assign(state.order, data);
        return { count: 1 };
      }),
    },
    inventoryReservation: {
      updateMany: vi.fn(async ({ where, data }: {
        where: { id?: unknown; orderId?: unknown; status?: unknown; expiresAt?: null | { gt: Date } };
        data: { status: ReservationStatus };
      }) => {
        const reservation = state.reservations.find((candidate) => candidate.id === where.id);
        if (!reservation || reservation.orderId !== where.orderId || reservation.status !== where.status) return { count: 0 };
        if (where.expiresAt === null && reservation.expiresAt !== null) return { count: 0 };
        if (where.expiresAt?.gt && (!reservation.expiresAt || reservation.expiresAt <= where.expiresAt.gt)) return { count: 0 };
        reservation.status = data.status;
        return { count: 1 };
      }),
    },
    inventoryLevel: {
      updateMany: vi.fn(async ({ where, data }: {
        where: { reserved?: { gte: number }; quantity?: { gte: number } };
        data: { reserved?: { decrement: number }; quantity?: { decrement: number } };
      }) => {
        const reservedMinimum = where.reserved?.gte ?? 0;
        const quantityMinimum = where.quantity?.gte ?? 0;
        if (state.inventory.reserved < reservedMinimum || state.inventory.quantity < quantityMinimum) return { count: 0 };
        state.inventory.reserved -= data.reserved?.decrement ?? 0;
        state.inventory.quantity -= data.quantity?.decrement ?? 0;
        return { count: 1 };
      }),
    },
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const quantity = values.find((value): value is number => typeof value === "number") ?? 0;
      if (state.inventory.reserved < quantity) return [];
      state.inventory.reserved -= quantity;
      if (strings.join("").includes('"quantity" = "quantity" -')) {
        if (state.inventory.quantity < quantity) return [];
        state.inventory.quantity -= quantity;
      }
      return [{ quantity: state.inventory.quantity }];
    }),
    inventoryMovement: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.movements.push(data);
        return data;
      }),
    },
    paymentEvent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (state.events.some((event) => event.eventKey === data.eventKey)) throw new Error("duplicate event");
        state.events.push(data);
        return data;
      }),
    },
    orderStatusHistory: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.histories.push(data);
        return data;
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.audits.push(data);
        return data;
      }),
    },
  };
}

function settlementInput(state: TestState, outcome: KnetSettlementInput["outcome"]): KnetSettlementInput {
  const payment = state.payments[0];
  const providerReference = `mock-knet:${payment.id}`;
  return {
    trackId: payment.merchantTrackId,
    outcome,
    context: {
      paymentId: payment.id,
      orderId: state.order.id,
      trackingToken: state.order.trackingToken,
      provider: payment.provider,
      amount: payment.amount.toFixed(3),
      currencyCode: payment.currencyCode,
      providerReference,
    },
    payload: {
      provider: payment.provider,
      result: outcome === "CAPTURED" ? "CAPTURED" : "DECLINED",
      trackid: payment.merchantTrackId,
      udf1: payment.merchantTrackId,
      amt: payment.amount.toFixed(3),
      currencyCode: payment.currencyCode,
      paymentId: providerReference,
    },
  };
}

function useState(state: TestState) {
  const tx = transactionFor(state);
  dbMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
  return tx;
}

beforeEach(() => {
  dbMock.$transaction.mockReset();
});

describe("payment and reservation integrity", () => {
  it("settles concurrent duplicate captures once", async () => {
    const state = onlineState();
    useState(state);
    const input = settlementInput(state, "CAPTURED");

    const results = await Promise.all([settleKnetPayment(input), settleKnetPayment(input)]);

    expect(results).toHaveLength(2);
    expect(state.payments[0].status).toBe(PaymentStatus.PAID);
    expect(state.order.paymentStatus).toBe(PaymentStatus.PAID);
    expect(state.reservations[0].status).toBe(ReservationStatus.CONSUMED);
    expect(state.inventory).toEqual({ quantity: 3, reserved: 0 });
    expect(state.movements).toHaveLength(1);
    expect(state.movements[0]).toMatchObject({ type: InventoryMovementType.SALE, quantity: -2 });
    expect(state.events).toHaveLength(1);
  });

  it("does not allow a contradictory callback to reverse the winning terminal outcome", async () => {
    const state = onlineState();
    useState(state);
    const captured = settlementInput(state, "CAPTURED");
    const failed = settlementInput(state, "FAILED");

    const results = await Promise.allSettled([settleKnetPayment(captured), settleKnetPayment(failed)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejection = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejection?.reason).toMatchObject({ code: "CONTRADICTORY_OUTCOME" });
    expect(state.payments[0].status).toBe(PaymentStatus.PAID);
    expect(state.order.paymentStatus).toBe(PaymentStatus.PAID);
    expect(state.movements).toHaveLength(1);
    expect(state.events).toHaveLength(1);
  });

  it("rejects capture before changing payment state when a reservation is missing or expired", async () => {
    const missing = onlineState();
    missing.reservations = [];
    useState(missing);
    await expect(settleKnetPayment(settlementInput(missing, "CAPTURED"))).rejects.toMatchObject({ code: "INVALID_RESERVATIONS" });
    expect(missing.payments[0].status).toBe(PaymentStatus.PENDING);
    expect(missing.order.paymentStatus).toBe(PaymentStatus.PENDING);

    const expired = onlineState();
    expired.reservations[0].expiresAt = new Date(Date.now() - 1);
    useState(expired);
    await expect(settleKnetPayment(settlementInput(expired, "CAPTURED"))).rejects.toMatchObject({ code: "INVALID_RESERVATIONS" });
    expect(expired.payments[0].status).toBe(PaymentStatus.PENDING);
    expect(expired.inventory).toEqual({ quantity: 5, reserved: 2 });
  });

  it("validates callback amount, currency, reference, and order token before settlement", async () => {
    const state = onlineState();
    useState(state);
    const input = settlementInput(state, "CAPTURED");
    input.payload.amt = "9.000";

    await expect(settleKnetPayment(input)).rejects.toMatchObject({ code: "CONTEXT_MISMATCH" });
    expect(state.payments[0].status).toBe(PaymentStatus.PENDING);
    expect(state.movements).toHaveLength(0);

    const tokenMismatch = settlementInput(state, "CAPTURED");
    tokenMismatch.context.trackingToken = "wrong-order-token";
    await expect(settleKnetPayment(tokenMismatch)).rejects.toMatchObject({ code: "CONTEXT_MISMATCH" });
  });

  it("releases stock once for concurrent duplicate failures", async () => {
    const state = onlineState();
    useState(state);
    const input = settlementInput(state, "FAILED");

    await Promise.all([settleKnetPayment(input), settleKnetPayment(input)]);

    expect(state.payments[0].status).toBe(PaymentStatus.FAILED);
    expect(state.order.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(state.reservations[0].status).toBe(ReservationStatus.RELEASED);
    expect(state.inventory).toEqual({ quantity: 5, reserved: 0 });
    expect(state.movements).toHaveLength(1);
    expect(state.movements[0]).toMatchObject({ type: InventoryMovementType.RELEASE, quantity: 0, beforeQuantity: 5, afterQuantity: 5, reason: "ORDER_RELEASE" });
    expect(state.events).toHaveLength(1);
  });

  it("consumes a non-expiring cash hold once under concurrent acceptance", async () => {
    const state = cashState();
    useState(state);
    const input = { orderId: state.order.id, targetStatus: "ASSIGNED_TO_BRANCH" as const, actorId: "staff-1" };

    const results = await Promise.all([transitionCashOrder(input), transitionCashOrder(input)]);

    expect(results.map((result) => result.changed).sort()).toEqual([false, true]);
    expect(state.order.status).toBe(OrderStatus.ASSIGNED_TO_BRANCH);
    expect(state.order.paymentStatus).toBe(PaymentStatus.CASH_DUE);
    expect(state.reservations[0].status).toBe(ReservationStatus.CONSUMED);
    expect(state.inventory).toEqual({ quantity: 3, reserved: 0 });
    expect(state.movements).toHaveLength(1);
    expect(state.histories).toHaveLength(1);
    expect(state.audits).toHaveLength(1);
  });

  it("refuses to accept a cash order without its complete active hold", async () => {
    const state = cashState();
    state.reservations = [];
    useState(state);

    await expect(transitionCashOrder({
      orderId: state.order.id,
      targetStatus: "ASSIGNED_TO_BRANCH",
      actorId: "staff-1",
    })).rejects.toMatchObject({ code: "INVALID_RESERVATIONS" });

    expect(state.order.status).toBe(OrderStatus.NEW);
    expect(state.order.paymentStatus).toBe(PaymentStatus.CASH_DUE);
    expect(state.payments[0].status).toBe(PaymentStatus.CASH_DUE);
    expect(state.inventory).toEqual({ quantity: 5, reserved: 2 });
    expect(state.movements).toHaveLength(0);
  });

  it("releases a cancelled cash hold once under duplicate requests", async () => {
    const state = cashState();
    useState(state);
    const input = { orderId: state.order.id, targetStatus: "CANCELLED" as const, actorId: "staff-1" };

    const results = await Promise.all([transitionCashOrder(input), transitionCashOrder(input)]);

    expect(results.map((result) => result.changed).sort()).toEqual([false, true]);
    expect(state.order.status).toBe(OrderStatus.CANCELLED);
    expect(state.order.paymentStatus).toBe(PaymentStatus.FAILED);
    expect(state.payments[0].status).toBe(PaymentStatus.FAILED);
    expect(state.reservations[0].status).toBe(ReservationStatus.RELEASED);
    expect(state.inventory).toEqual({ quantity: 5, reserved: 0 });
    expect(state.movements).toHaveLength(1);
    expect(state.movements[0]).toMatchObject({ type: InventoryMovementType.RELEASE, quantity: 0, beforeQuantity: 5, afterQuantity: 5, reason: "ORDER_RELEASE" });
    expect(state.events).toHaveLength(1);
    expect(state.histories).toHaveLength(1);
    expect(state.audits).toHaveLength(1);
  });

  it("does not expire cash holds and atomically expires an online order once", async () => {
    const cash = cashState();
    useState(cash);
    await expect(expireOnlineReservationOrder(cash.order.id)).resolves.toEqual({ outcome: "skipped", releasedReservations: 0 });
    expect(cash.reservations[0].status).toBe(ReservationStatus.ACTIVE);
    expect(cash.inventory.reserved).toBe(2);

    const online = onlineState();
    online.reservations[0].expiresAt = new Date(Date.now() - 1);
    useState(online);
    const results = await Promise.all([
      expireOnlineReservationOrder(online.order.id),
      expireOnlineReservationOrder(online.order.id),
    ]);
    expect(results.filter((result) => result.outcome === "expired")).toHaveLength(1);
    expect(online.order.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(online.payments[0].status).toBe(PaymentStatus.FAILED);
    expect(online.reservations[0].status).toBe(ReservationStatus.EXPIRED);
    expect(online.inventory).toEqual({ quantity: 5, reserved: 0 });
    expect(online.movements).toHaveLength(1);
    expect(online.events).toHaveLength(1);
  });

  it("records a settled delivery refund request without claiming that the payment was refunded", async () => {
    const state = cashState();
    state.order.status = OrderStatus.DELIVERED;
    state.order.paymentStatus = PaymentStatus.CASH_COLLECTED;
    state.payments[0].status = PaymentStatus.CASH_COLLECTED;
    useState(state);

    const results = await Promise.all([
      requestOrderRefund({ orderId: state.order.id, actorId: "staff-1", reason: "Damaged delivery" }),
      requestOrderRefund({ orderId: state.order.id, actorId: "staff-1", reason: "Damaged delivery" }),
    ]);

    expect(results.map((result) => result.changed).sort()).toEqual([false, true]);
    expect(state.order.status).toBe(OrderStatus.REFUND_REQUESTED);
    expect(state.order.paymentStatus).toBe(PaymentStatus.CASH_COLLECTED);
    expect(state.payments[0].status).toBe(PaymentStatus.CASH_COLLECTED);
    expect(state.histories).toEqual([expect.objectContaining({ fromStatus: OrderStatus.DELIVERED, toStatus: OrderStatus.REFUND_REQUESTED, note: "Damaged delivery" })]);
    expect(state.audits).toEqual([expect.objectContaining({ action: "order.refund.requested" })]);
  });

  it("does not allow a refund request before delivery and settlement", async () => {
    const state = cashState();
    useState(state);

    await expect(requestOrderRefund({ orderId: state.order.id, actorId: "staff-1", reason: "Customer request" })).rejects.toMatchObject({ code: "CONTRADICTORY_OUTCOME" });
    expect(state.order.status).toBe(OrderStatus.NEW);
    expect(state.payments[0].status).toBe(PaymentStatus.CASH_DUE);
  });
});
