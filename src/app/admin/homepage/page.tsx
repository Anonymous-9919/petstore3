import { HomepageBannerManager } from "@/components/admin/HomepageBannerManager";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { requireAdminPage } from "@/server/auth";

export default async function HomepageContentPage() {
  await requireAdminPage("homepage");
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Store content</p><h1 className="mt-1 text-3xl font-bold">Homepage content</h1><p className="mt-2 text-sm text-[#666]">Use an existing image path or URL. Media uploads remain managed separately.</p></div><div className="mt-6"><AnnouncementManager /></div><div className="mt-6"><HomepageBannerManager /></div></>;
}
