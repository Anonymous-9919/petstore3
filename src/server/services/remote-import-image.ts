import "server-only";

import { randomUUID } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { supabaseAdmin } from "@/server/supabase";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
};

function privateAddress(address: string) {
  if (address.includes(":")) return address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:");
  const [a, b] = address.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function safeUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Remote images must use a public HTTPS URL.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) throw new Error("Remote image host is not public.");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("Remote image host is not public.");
  return url;
}

/** Downloads only bounded public images, then stores them under the approved media path. */
export async function importRemoteImage(rawUrl: string) {
  let url = await safeUrl(rawUrl);
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Remote image redirect is invalid.");
      url = await safeUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error("Remote image could not be downloaded.");
    const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? "";
    const extension = extensions[contentType];
    const advertisedSize = Number(response.headers.get("content-length") ?? 0);
    if (!extension || (advertisedSize && (!Number.isFinite(advertisedSize) || advertisedSize > MAX_IMAGE_BYTES))) throw new Error("Remote image must be a supported image smaller than 10 MB.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Remote image must be a supported image smaller than 10 MB.");
    const admin = supabaseAdmin();
    if (!admin) throw new Error("Media uploads are not configured.");
    const path = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const { error } = await admin.storage.from("media").upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error("Remote image could not be stored.");
    return { path, contentType, size: bytes.length, sourceUrl: url.toString() };
  }
  throw new Error("Remote image exceeded the redirect limit.");
}
