import { MediaUploader } from "@/components/admin/MediaUploader";
import { requireAdminPage } from "@/server/auth";

export default async function MediaPage() {
  await requireAdminPage("catalog");

  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Media</p><h1 className="mt-1 text-3xl font-bold">Upload media</h1><p className="mt-2 text-sm text-[#666]">Files are uploaded directly to protected Supabase Storage using a short-lived signed URL.</p></div><div className="mt-6"><MediaUploader /></div></>;
}
