"use client";

import { History } from "lucide-react";
import { SubHeader } from "@/components/Header";
import { useLang } from "@/lib/state";

export default function OrdersPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  return (
    <>
      <SubHeader title={ar ? "الطلبات السابقة" : "Previous Orders"} />
      <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
        <History size={48} className="text-[#ccc]" />
        <p className="text-[15px] text-[#666]">
          {ar ? "لا توجد طلبات سابقة" : "No previous orders"}
        </p>
      </div>
    </>
  );
}
