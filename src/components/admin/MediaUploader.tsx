"use client";

import { ChangeEvent, useEffect, useState } from "react";

type UploadResponse = { path: string; signedUrl: string; bucket: string };
type MediaItem = { path: string; name: string; contentType: string; uploadedAt: string };
const RECENT_MEDIA_KEY = "petstore-admin-recent-media";

export function MediaUploader() {
  const [status, setStatus] = useState("");
  const [path, setPath] = useState("");
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(RECENT_MEDIA_KEY) ?? "[]") as MediaItem[];
      if (Array.isArray(saved)) setRecentMedia(saved.filter((item) => item && typeof item.path === "string"));
    } catch { window.localStorage.removeItem(RECENT_MEDIA_KEY); }
  }, []);

  function remember(item: MediaItem) {
    setRecentMedia((current) => {
      const next = [item, ...current.filter((existing) => existing.path !== item.path)].slice(0, 30);
      window.localStorage.setItem(RECENT_MEDIA_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("Preparing upload...");
    setPath("");
    try {
      const response = await fetch("/api/admin/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });
      const payload = await response.json() as UploadResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to prepare the upload.");

      setStatus("Uploading...");
      const upload = await fetch(payload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) throw new Error("The storage service rejected the upload.");

      setPath(payload.path);
      remember({ path: payload.path, name: file.name, contentType: file.type, uploadedAt: new Date().toISOString() });
      setStatus("Upload complete.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to upload the file.");
    } finally {
      event.target.value = "";
    }
  }

  return <div className="max-w-2xl rounded-xl border border-black/10 bg-white p-5">
    <label className="grid gap-2 text-sm font-medium">Select media file
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm" onChange={upload} className="rounded border border-black/15 p-2 font-normal" />
    </label>
    <p className="mt-3 text-sm text-[#666]">JPG, PNG, WebP, GIF, AVIF, MP4, or WebM. Maximum file size: 25 MB.</p>
    {status && <p className="mt-4 text-sm font-medium">{status}</p>}
    {path && <div className="mt-4 rounded border border-black/10 bg-[#f7f7f5] p-3 text-sm"><p className="font-medium">Storage path</p><code className="mt-1 block break-all text-[#666]">{path}</code><button type="button" onClick={() => void navigator.clipboard.writeText(path)} className="mt-2 rounded border border-black/15 px-2 py-1 font-medium">Copy path</button><p className="mt-2 text-[#666]">Use this path when assigning media to a product or category.</p></div>}
    {recentMedia.length > 0 && <section className="mt-6 border-t border-black/10 pt-5" aria-labelledby="recent-media-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="recent-media-title" className="font-semibold">Recent uploads</h2><p className="mt-1 text-sm text-[#666]">Stored only in this browser so you can find and reuse paths without uploading again.</p></div><label className="grid gap-1 text-sm font-medium">Search recent uploads<input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded border border-black/15 px-2 py-1 font-normal" /></label></div><ul className="mt-3 space-y-2">{recentMedia.filter((item) => `${item.name} ${item.path}`.toLowerCase().includes(query.toLowerCase())).map((item) => <li key={item.path} className="flex flex-wrap items-center justify-between gap-2 rounded border border-black/10 p-2 text-sm"><span className="min-w-0"><span className="block font-medium">{item.name || item.path.split("/").at(-1)}</span><code className="block break-all text-xs text-[#666]">{item.path}</code></span><button type="button" onClick={() => void navigator.clipboard.writeText(item.path)} className="rounded border border-black/15 px-2 py-1 font-medium">Copy path</button></li>)}</ul></section>}
    <p className="mt-5 text-xs text-[#666]">Deletion is intentionally unavailable here: media paths can be referenced by existing catalog content, and this upload-only integration cannot verify those references safely.</p>
  </div>;
}
