import { NextResponse } from "next/server";
import { getCategoryStorefrontContent, getHomepageStorefrontContent } from "@/server/storefront-content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category");
  const content = category ? await getCategoryStorefrontContent(category) : await getHomepageStorefrontContent();
  return NextResponse.json(content, { headers: { "Cache-Control": "no-store" } });
}
