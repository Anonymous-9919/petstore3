import "server-only";

import { lookup } from "dns/promises";
import https from "https";
import { randomUUID } from "crypto";
import { inflateRawSync } from "zlib";
import { Readable, Transform } from "stream";
import { supabaseAdmin } from "@/server/supabase";

const BUCKET = "media";
export const MAX_REMOTE_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_ZIP_BYTES = 30 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 500;
const MAX_ZIP_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

function publicIpv4(address: string) {
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b, c] = p;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2))) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0 && c === 113));
}

async function safeHost(hostname: string) {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) throw new Error("Remote image hosts cannot be local or private.");
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  // Reject IPv6 rather than risk connecting to a loopback, unique-local, link-local, or other reserved address.
  if (!addresses.length || addresses.some(({ address, family }) => family !== 4 || !publicIpv4(address))) throw new Error("Remote image hosts must resolve only to public IPv4 addresses.");
  return addresses[0].address;
}

function detectedType(head: Buffer) {
  if (head.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (head.subarray(0, 6).toString("ascii") === "GIF87a" || head.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (head.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(head.subarray(8, 12).toString("ascii"))) return "image/avif";
  return null;
}

async function upload(path: string, type: string, body: Readable) {
  const admin = supabaseAdmin();
  if (!admin) throw new Error("Media storage is not configured.");
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) throw new Error("Unable to prepare media storage.");
  try {
    const response = await fetch(data.signedUrl, { method: "PUT", headers: { "content-type": type, "x-upsert": "false" }, body: Readable.toWeb(body) as ReadableStream, duplex: "half" } as RequestInit);
    if (!response.ok) throw new Error("Unable to upload image to media storage.");
    return path;
  } catch (error) {
    await admin.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

async function persistStream(input: Readable, declaredType: string | undefined) {
  const type = declaredType?.split(";", 1)[0].trim().toLowerCase();
  if (!type || !imageTypes[type]) throw new Error("Remote response is not an approved image type.");
  let size = 0; let head = Buffer.alloc(0); let checked = false;
  const validator = new Transform({ transform(chunk: Buffer, _encoding, callback) {
    size += chunk.length;
    if (size > MAX_REMOTE_IMAGE_BYTES) return callback(new Error("Image exceeds the 25 MB limit."));
    if (head.length < 16) head = Buffer.concat([head, chunk]).subarray(0, 16);
    if (!checked && head.length >= 12) { checked = true; if (detectedType(head) !== type) return callback(new Error("Remote image bytes do not match its declared type.")); }
    callback(null, chunk);
  }, flush(callback) { if (!checked || detectedType(head) !== type) callback(new Error("Remote image is invalid or incomplete.")); else callback(); } });
  input.pipe(validator);
  const path = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${imageTypes[type]}`;
  return upload(path, type, validator);
}

/** HTTPS only, with DNS pinned for every hop so redirects cannot reach private networks. */
export async function importRemoteImage(input: string) {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Image URL is invalid."); }
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Image URLs must be HTTPS without credentials or a custom port.");
    const address = await safeHost(url.hostname);
    const response = await new Promise<import("http").IncomingMessage>((resolve, reject) => {
      const request = https.get({ hostname: address, servername: url.hostname, path: `${url.pathname}${url.search}`, headers: { host: url.host }, lookup: (_host, _options, callback) => callback(null, address, 4), timeout: 10_000 }, resolve);
      request.once("timeout", () => request.destroy(new Error("Remote image request timed out.")));
      request.once("error", reject);
    });
    if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) { const location = response.headers.location; response.resume(); if (!location) throw new Error("Image redirect has no location."); url = new URL(location, url); continue; }
    if (response.statusCode !== 200) { response.resume(); throw new Error("Remote image server did not return success."); }
    return persistStream(response, response.headers["content-type"]);
  }
  throw new Error("Image URL exceeded the redirect limit.");
}

function zipEntries(zip: Buffer) {
  if (zip.length > MAX_ZIP_BYTES) throw new Error("Image ZIP must be 30 MB or smaller.");
  let end = -1; for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i -= 1) if (zip.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("Image ZIP has no valid central directory.");
  const count = zip.readUInt16LE(end + 10); let offset = zip.readUInt32LE(end + 16); let total = 0; const entries: Array<{ name: string; bytes: Buffer; type: string }> = [];
  if (count > MAX_ZIP_ENTRIES) throw new Error(`Image ZIP is limited to ${MAX_ZIP_ENTRIES} files.`);
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > zip.length || zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("Image ZIP central directory is invalid.");
    const method = zip.readUInt16LE(offset + 10); const compressed = zip.readUInt32LE(offset + 20); const uncompressed = zip.readUInt32LE(offset + 24); const nameLength = zip.readUInt16LE(offset + 28); const extraLength = zip.readUInt16LE(offset + 30); const commentLength = zip.readUInt16LE(offset + 32); const local = zip.readUInt32LE(offset + 42); const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"); offset += 46 + nameLength + extraLength + commentLength;
    if (!name || name.includes("\\") || name.startsWith("/") || name.split("/").includes("..") || name.endsWith("/")) throw new Error("Image ZIP contains an unsafe archive path.");
    if (![0, 8].includes(method) || uncompressed > MAX_REMOTE_IMAGE_BYTES || (total += uncompressed) > MAX_ZIP_UNCOMPRESSED_BYTES) throw new Error("Image ZIP contains unsupported or oversized content.");
    if (local + 30 > zip.length || zip.readUInt32LE(local) !== 0x04034b50) throw new Error("Image ZIP local entry is invalid.");
    const dataOffset = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28); const raw = zip.subarray(dataOffset, dataOffset + compressed); if (raw.length !== compressed) throw new Error("Image ZIP entry is truncated.");
    const bytes = method === 0 ? raw : inflateRawSync(raw); const type = detectedType(bytes.subarray(0, 16)); if (bytes.length !== uncompressed || !type) throw new Error("Image ZIP contains a non-image or invalid image.");
    entries.push({ name, bytes, type });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export async function importZipImages(zip: Buffer, targets: Array<{ row: number; handle: string; productSku?: string | null; variantSku?: string | null }>) {
  const target = new Map<string, number>();
  for (const item of targets) for (const key of [item.variantSku, item.productSku, item.handle]) if (key) target.set(key.trim().toLowerCase(), target.get(key.trim().toLowerCase()) ?? item.row);
  const result: Record<number, string[]> = {};
  for (const entry of zipEntries(zip)) {
    const basename = entry.name.split("/").pop()!.replace(/\.[^.]+$/, "").toLowerCase(); const row = target.get(basename);
    if (!row) continue;
    const path = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${imageTypes[entry.type]}`;
    (result[row] ??= []).push(await upload(path, entry.type, Readable.from(entry.bytes)));
  }
  return result;
}
