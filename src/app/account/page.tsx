"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SubHeader } from "@/components/Header";
import { useLang } from "@/lib/state";

export default function AccountPage() {
  const router = useRouter();
  const lang = useLang((state) => state.lang);
  const ar = lang === "ar";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(mode === "login" ? "/api/customer/session" : "/api/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || (ar ? "تعذر إكمال الطلب" : "Unable to complete your request."));
      setSubmitting(false);
      return;
    }
    router.replace("/profile");
    router.refresh();
  }

  return (
    <>
      <SubHeader title={ar ? "الحساب" : "Account"} />
      <main className="px-4 py-4" dir={ar ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-md rounded-[7px] bg-white p-4 shadow-sm">
          <div className="mb-5 flex border-b border-[#ededed]">
            {(["login", "register"] as const).map((item) => (
              <button key={item} type="button" onClick={() => { setMode(item); setError(""); }} className={`flex-1 border-b-2 px-2 py-3 text-[14px] font-bold ${mode === item ? "border-brand text-brand" : "border-transparent text-[#777]"}`}>
                {item === "login" ? (ar ? "تسجيل الدخول" : "Sign in") : (ar ? "إنشاء حساب" : "Create account")}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            {mode === "register" && <label className="mb-3 block text-[13px] font-bold text-ink">{ar ? "الاسم" : "Name"}<input required name="name" autoComplete="name" className="mt-1.5 w-full rounded border border-[#dedede] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-brand" /></label>}
            <label className="mb-3 block text-[13px] font-bold text-ink">{ar ? "البريد الإلكتروني" : "Email"}<input required name="email" type="email" autoComplete="email" dir="ltr" className="mt-1.5 w-full rounded border border-[#dedede] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-brand" /></label>
            {mode === "register" && <label className="mb-3 block text-[13px] font-bold text-ink">{ar ? "رقم الهاتف" : "Phone number"}<input required name="phone" type="tel" autoComplete="tel" dir="ltr" className="mt-1.5 w-full rounded border border-[#dedede] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-brand" /></label>}
            <label className="block text-[13px] font-bold text-ink">{ar ? "كلمة المرور" : "Password"}<input required name="password" type="password" minLength={mode === "register" ? 8 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1.5 w-full rounded border border-[#dedede] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-brand" /></label>
            {error && <p role="alert" className="mt-3 text-[13px] text-[#d63b32]">{error}</p>}
            <button disabled={submitting} className="mt-5 h-11 w-full rounded bg-brand text-[14px] font-bold text-white disabled:opacity-60">{submitting ? (ar ? "جارٍ المعالجة..." : "Please wait...") : mode === "login" ? (ar ? "تسجيل الدخول" : "Sign in") : (ar ? "إنشاء حساب" : "Create account")}</button>
          </form>
        </div>
      </main>
    </>
  );
}
