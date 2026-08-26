import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { expireOnlineReservationOrder } from "@/server/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;

function requestedBatchSize(request: Request) {
  const configured = new URL(request.url).searchParams.get("limit") ?? process.env.RESERVATION_EXPIRY_BATCH_SIZE;
  const parsed = Number(configured ?? DEFAULT_BATCH_SIZE);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_BATCH_SIZE;
  return Math.min(parsed, MAX_BATCH_SIZE);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();
  const batchSize = requestedBatchSize(request);
  const candidates = await db.inventoryReservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
      order: { paymentMethod: { not: "CASH" }, paymentStatus: "PENDING" },
    },
    select: { orderId: true },
    distinct: ["orderId"],
    orderBy: [{ expiresAt: "asc" }, { orderId: "asc" }],
    take: batchSize,
  });

  let expiredOrders = 0;
  let releasedReservations = 0;
  let skippedOrders = 0;
  let failedOrders = 0;
  for (const candidate of candidates) {
    try {
      const result = await expireOnlineReservationOrder(candidate.orderId, now);
      if (result.outcome === "expired") {
        expiredOrders += 1;
        releasedReservations += result.releasedReservations;
      } else {
        skippedOrders += 1;
      }
    } catch {
      failedOrders += 1;
    }
  }

  const result = {
    batchSize,
    candidateOrders: candidates.length,
    processedOrders: expiredOrders + skippedOrders,
    expiredOrders,
    releasedReservations,
    skippedOrders,
    failedOrders,
    hasMore: candidates.length === batchSize,
    durationMs: Date.now() - startedAt,
  };
  // A partial batch must surface as a scheduler failure so the next run retries it.
  return NextResponse.json(result, { status: failedOrders ? 503 : 200 });
}
