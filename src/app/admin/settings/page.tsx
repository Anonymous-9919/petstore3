import { StoreSettingsManager } from "@/components/admin/StoreSettingsManager";
import { requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

export default async function StoreSettingsPage() {
  await requireAdminPage("settings");
  const setting = await db.storeSetting.findUnique({ where: { id: "default" } });
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Store content</p><h1 className="mt-1 text-3xl font-bold">Store settings</h1></div><StoreSettingsManager setting={setting} /></>;
}
