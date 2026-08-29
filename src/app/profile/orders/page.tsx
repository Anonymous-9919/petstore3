"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { SubHeader } from "@/components/Header";
import { useLang } from "@/lib/state";

export default function OrdersPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const [orders, setOrders] = useState<Array<{ orderNumber: string; status: string; paymentStatus: string; total: string; currencyCode: string; createdAt: string; items: { productName: string; productNameAr: string; quantity: number }[] }> | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  useEffect(() => {
    fetch("/api/customer/orders").then(async (response) => {
      if (response.status === 401) { setUnauthorized(true); return; }
      setOrders(await response.json());
    }).catch(() => setOrders([]));
  }, []);
  return (
    <>
      <SubHeader title={ar ? "الطلبات السابقة" : "Previous Orders"} />
      {unauthorized ? <div className="px-4 py-8 text-center"><p className="text-[15px] text-[#666]">{ar ? "سجل الدخول لعرض طلباتك" : "Sign in to view your orders"}</p><Link href="/account" className="mt-4 inline-flex rounded bg-brand px-5 py-2.5 text-[14px] font-bold text-white">{ar ? "تسجيل الدخول" : "Sign in"}</Link></div> : orders && orders.length > 0 ? <div className="px-4 py-4">{orders.map((order) => <Link key={order.orderNumber} href={`/track/order?number=${encodeURIComponent(order.orderNumber)}`} className="mb-3 block rounded-[7px] bg-white p-4 shadow-sm"><div className="flex justify-between gap-3 text-[14px] font-bold text-ink"><span dir="ltr">{order.orderNumber}</span><span className="text-brand">{order.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-[13px] text-[#666]">{order.items.map((item) => `${item.quantity} x ${ar ? item.productNameAr : item.productName}`).join(", ")}</p><div className="mt-2 flex justify-between text-[13px] text-[#777]"><span>{new Date(order.createdAt).toLocaleDateString()}</span><span>{order.total} {order.currencyCode}</span></div></Link>)}</div> : <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
        <History size={48} className="text-[#ccc]" />
        <p className="text-[15px] text-[#666]">
          {ar ? "لا توجد طلبات سابقة" : "No previous orders"}
        </p>
      </div>}
    </>
  );
}
