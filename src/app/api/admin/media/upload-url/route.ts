import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { supabaseAdmin } from "@/server/supabase";

export const runtime = "nodejs";

const BUCKET = "media";
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const uploadRequestSchema = z.object({
  contentType: z.string().trim(),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  name: z.string().trim().min(1).max(255),
});

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;

  const parsed = uploadRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid upload request." }, { status: 400 });
  }

  const extension = extensions[parsed.data.contentType.toLowerCase()];
  if (!extension) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP, GIF, AVIF, MP4, and WebM files are allowed." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Media uploads are not configured." }, { status: 503 });
  const path = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    console.error("Unable to create Supabase signed upload URL.", error);
    return NextResponse.json({ error: "Unable to prepare the upload. Verify the media bucket configuration." }, { status: 502 });
  }

  const media = await db.mediaAsset.create({ data: { path: data.path, name: parsed.data.name, contentType: parsed.data.contentType.toLowerCase(), size: parsed.data.size, uploadedById: authorization.user.id } });
  return NextResponse.json({ id: media.id, path: data.path, signedUrl: data.signedUrl, bucket: BUCKET });
}
