import { NextResponse } from "next/server";
import { fulfillmentSlots, storefrontBranch, storefrontFulfillment } from "@/server/services/fulfillment";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = Number(searchParams.get("branchId"));
  const mode = searchParams.get("mode");
  if (Number.isInteger(branchId) && branchId > 0 && (mode === "delivery" || mode === "pickup")) {
    return NextResponse.json({ days: await fulfillmentSlots(branchId, mode) });
  }
  if (Number.isInteger(branchId) && branchId > 0) {
    const branch = await storefrontBranch(branchId);
    return branch ? NextResponse.json({ branch }) : NextResponse.json({ error: "Branch not found." }, { status: 404 });
  }
  return NextResponse.json(await storefrontFulfillment());
}
