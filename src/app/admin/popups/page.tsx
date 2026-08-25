import { PopupManager } from "@/components/admin/PopupManager";
import { requireAdminPage } from "@/server/auth";

export default async function AdminPopupsPage() {
  await requireAdminPage("marketing");
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Marketing</p><h1 className="mt-1 text-3xl font-bold">Popups</h1><p className="mt-2 text-sm text-black/60">Anonymous impression and CTA-click totals only. No visitor identifiers are stored.</p></div><div className="mt-6"><PopupManager /></div></>;
}
