import { NextResponse } from "next/server";
import { z } from "zod";
import { canManage, currentUser } from "@/server/auth";
import { notifyOrderStatusChanged } from "@/server/notifications/email";
import { notifyStaff } from "@/server/notifications/staff";
import { transitionCashOrder } from "@/server/services/payments";

const updateSchema = z.object({ status: z.enum(["ASSIGNED_TO_BRANCH", "CANCELLED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const user = await currentUser();
  if (!user || !canManage(user.role, "orders")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  const { orderId } = await context.params;

  try {
    const result = await transitionCashOrder({
      orderId,
      targetStatus: parsed.data.status,
      actorId: user.id,
    });
    if (result.changed) {
      notifyOrderStatusChanged({ ...result.order, email: result.email });
      void notifyStaff({ title: "Order status updated", body: `Order ${result.order.orderNumber} is now ${result.order.status.replaceAll("_", " ")}.`, href: "/admin/orders", roles: ["OWNER", "MANAGER", "ORDER_STAFF"], excludeUserId: user.id });
    }
    return NextResponse.json({ id: result.order.id, status: result.order.status });
  } catch (error) {
    console.error("Unable to update order status.", error);
    return NextResponse.json({ error: "Unable to update order. Refresh the order and try again." }, { status: 409 });
  }
}
