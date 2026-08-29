"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckoutActionBar,
  CheckoutHeader,
  PhoneBoothIcon,
  UnderlineField,
  UnderlinePhoneField,
} from "@/components/Checkout";
import { getMsg } from "@/lib/i18n";
import { canonicalizeKuwaitPhone } from "@/lib/phone";
import { useCart, useDelivery, useLang } from "@/lib/state";

export default function CheckoutDetailsPage() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const t = getMsg;
  const items = useCart((s) => s.items);
  const storedName = useDelivery((s) => s.name);
  const storedPhone = useDelivery((s) => s.phone);
  const setContact = useDelivery((s) => s.setContact);

  const [name, setName] = useState(storedName);
  const [phone, setPhone] = useState(() =>
    storedPhone ? canonicalizeKuwaitPhone(storedPhone) ?? storedPhone : "+965"
  );
  const [err, setErr] = useState("");

  // Redirect if already have name and phone
  useEffect(() => {
    if (storedName.trim() && storedPhone.trim()) {
      router.push("/checkout/address");
    }
  }, [storedName, storedPhone, router]);

  if (items.length === 0) {
    return (
      <>
        <CheckoutHeader />
        <div className="px-4 pb-20 pt-[68px] text-center text-[15px] text-[#666]">
          {t("emptyCart")[ar ? "ar" : "en"]}
        </div>
      </>
    );
  }

  const next = () => {
    const canonicalPhone = canonicalizeKuwaitPhone(phone);
    if (!name.trim() || !canonicalPhone) {
      setErr(
        ar ? "يرجى تعبئة الاسم ورقم الهاتف" : "Please fill in your name and phone number"
      );
      return;
    }
    setErr("");
    setContact(name.trim(), canonicalPhone);
    router.push("/checkout/address");
  };

  return (
    <>
      <CheckoutHeader />
      <div className="mt-[55px] border-t border-[#dee2e6] bg-white pb-[80px] text-center">
        <div className="flex h-[5px] items-center gap-[6px] px-[4px] -mt-[3px]">
          <div className="h-[2px] flex-1 bg-brand" />
          <div className="h-[2px] flex-1 bg-[#d1cece]" />
        </div>
        <div className="mt-[96px]">
          <PhoneBoothIcon className="inline-block" />
        </div>
        <p className="mt-[14px] mb-0 text-[22px] font-bold leading-[31.4px] text-[#6c757d]">
          {t("contactInfo")[ar ? "ar" : "en"]}
        </p>
        <div className="px-[21px] text-start">
          <div className="mt-[56px]">
            <UnderlineField
              label={`${t("name")[ar ? "ar" : "en"]} *`}
              value={name}
              onChange={setName}
            />
          </div>
          <div className="mt-[42px]">
             <UnderlinePhoneField
               label={`${t("phoneNumber")[ar ? "ar" : "en"]} *`}
               value={phone}
               onChange={setPhone}
               placeholder="+1 (702) 123-4567"
             />
          </div>
          {err && <p className="mt-3 text-start text-[12px] text-red-500">{err}</p>}
        </div>
      </div>
      <CheckoutActionBar label={t("next")[ar ? "ar" : "en"]} onClick={next} />
    </>
  );
}
