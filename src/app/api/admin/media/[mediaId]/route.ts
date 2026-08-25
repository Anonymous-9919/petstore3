import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { supabaseAdmin } from "@/server/supabase";

const BUCKET = "media";
const paramsSchema = z.object({ mediaId: z.string().uuid() });

export async function DELETE(_request: Request, context: { params: Promise<{ mediaId: string }> }) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid media asset." }, { status: 400 });

  const media = await db.mediaAsset.findUnique({ where: { id: parsed.data.mediaId } });
  if (!media) return NextResponse.json({ error: "Media asset not found." }, { status: 404 });

  const path = media.path;
  const [product, image, option, category, banner, popup, orderItem] = await Promise.all([
    db.product.count({ where: { primaryImagePath: path } }),
    db.productImage.count({ where: { path } }),
    db.productOptionValue.count({ where: { imagePath: path } }),
    db.category.count({ where: { imagePath: path } }),
    db.storeAsset.count({ where: { OR: [{ path }, { mobilePath: path }] } }),
    db.popup.count({ where: { imagePath: path } }),
    db.orderItem.count({ where: { imagePath: path } }),
  ]);
  const references = product + image + option + category + banner + popup + orderItem;
  if (references) return NextResponse.json({ error: `This media is used by ${references} record${references === 1 ? "" : "s"} and cannot be deleted.` }, { status: 409 });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Media storage is not configured." }, { status: 503 });
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: "Unable to delete the media from storage." }, { status: 502 });

  await db.$transaction(async (tx) => {
    await tx.mediaAsset.delete({ where: { id: media.id } });
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "media.deleted", entityType: "mediaAsset", entityId: media.id, before: { path: media.path, name: media.name } } });
  });
  return new NextResponse(null, { status: 204 });
}
