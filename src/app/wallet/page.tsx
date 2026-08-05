"use client";

import { Wallet } from "lucide-react";
import { SubHeader } from "@/components/Header";
import { useLang } from "@/lib/state";
import { fmtPrice } from "@/lib/utils";

export default function WalletPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  return (
    <>
      <SubHeader title={ar ? "المحفظة" : "Wallet"} />
      <div className="px-4 py-4">
        <div className="rounded-[7px] bg-white p-6 text-center shadow-sm">
          <Wallet size={40} className="mx-auto text-brand" />
          <p className="mt-2 text-[13px] text-[#666]">
            {ar ? "رصيدك الحالي" : "Your balance"}
          </p>
          <p className="mt-1 text-[24px] font-bold text-brand">{fmtPrice(0, lang)}</p>
        </div>
      </div>
    </>
  );
}
