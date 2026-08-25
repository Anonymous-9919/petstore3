"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type StoreSetting = { name: string; nameAr: string; slogan: string | null; sloganAr: string | null; currencyCode: string; currencyLabel: string; currencyLabelAr: string; currencyDecimals: number; deliveryEnabled: boolean; pickupEnabled: boolean; email: string | null; phone: string | null; whatsapp: string | null };
const defaults: StoreSetting = { name: "", nameAr: "", slogan: null, sloganAr: null, currencyCode: "KWD", currencyLabel: "KD", currencyLabelAr: "", currencyDecimals: 3, deliveryEnabled: true, pickupEnabled: true, email: null, phone: null, whatsapp: null };

export function StoreSettingsManager({ setting }: { setting: StoreSetting | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = setting ?? defaults;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim() || null;
    const payload = { name: String(form.get("name")).trim(), nameAr: String(form.get("nameAr")).trim(), slogan: text("slogan"), sloganAr: text("sloganAr"), currencyCode: String(form.get("currencyCode")).trim(), currencyLabel: String(form.get("currencyLabel")).trim(), currencyLabelAr: String(form.get("currencyLabelAr")).trim(), currencyDecimals: Number(form.get("currencyDecimals")), deliveryEnabled: form.get("deliveryEnabled") === "on", pickupEnabled: form.get("pickupEnabled") === "on", email: text("email"), phone: text("phone"), whatsapp: text("whatsapp") };
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to save settings.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save settings."); } finally { setBusy(false); }
  }
  const field = "mt-1 block w-full rounded border border-black/15 px-3 py-2";
  return <form onSubmit={submit} className="mt-6 max-w-3xl space-y-6"><section className="grid gap-4 rounded-xl border border-black/10 bg-white p-5 sm:grid-cols-2"><h2 className="sm:col-span-2 text-lg font-bold">Store identity</h2><label className="text-sm font-medium">Name<input name="name" required defaultValue={value.name} className={field} /></label><label className="text-sm font-medium">Arabic name<input name="nameAr" required defaultValue={value.nameAr} className={field} /></label><label className="text-sm font-medium">Slogan<input name="slogan" defaultValue={value.slogan ?? ""} className={field} /></label><label className="text-sm font-medium">Arabic slogan<input name="sloganAr" defaultValue={value.sloganAr ?? ""} className={field} /></label></section><section className="grid gap-4 rounded-xl border border-black/10 bg-white p-5 sm:grid-cols-2"><h2 className="sm:col-span-2 text-lg font-bold">Commerce and contact</h2><label className="text-sm font-medium">Currency code<input name="currencyCode" required defaultValue={value.currencyCode} className={field} /></label><label className="text-sm font-medium">Currency label<input name="currencyLabel" required defaultValue={value.currencyLabel} className={field} /></label><label className="text-sm font-medium">Arabic currency label<input name="currencyLabelAr" required defaultValue={value.currencyLabelAr} className={field} /></label><label className="text-sm font-medium">Decimal places<input name="currencyDecimals" type="number" min="0" max="6" required defaultValue={value.currencyDecimals} className={field} /></label><label className="text-sm font-medium">Email<input name="email" type="email" defaultValue={value.email ?? ""} className={field} /></label><label className="text-sm font-medium">Phone<input name="phone" defaultValue={value.phone ?? ""} className={field} /></label><label className="text-sm font-medium">WhatsApp<input name="whatsapp" defaultValue={value.whatsapp ?? ""} className={field} /></label><div className="flex items-end gap-5 pb-2 text-sm"><label className="flex items-center gap-2"><input name="deliveryEnabled" type="checkbox" defaultChecked={value.deliveryEnabled} /> Delivery enabled</label><label className="flex items-center gap-2"><input name="pickupEnabled" type="checkbox" defaultChecked={value.pickupEnabled} /> Pickup enabled</label></div></section>{error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save settings"}</button></form>;
}
