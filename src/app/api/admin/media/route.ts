import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z.object({ query: z.string().trim().max(200).default("") });

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const parsed = querySchema.safeParse({ query: new URL(request.url).searchParams.get("query") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid media search." }, { status: 400 });
  const query = parsed.data.query;
  const media = await db.mediaAsset.findMany({
    where: query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { path: { contains: query, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(media);
}
