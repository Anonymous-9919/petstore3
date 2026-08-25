import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

export const storefrontCatalogTag = "storefront-catalog";

export function revalidateStorefrontCatalog() {
  revalidateTag(storefrontCatalogTag, { expire: 0 });
  revalidatePath("/api/storefront/catalog");
  revalidatePath("/", "layout");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/product/[CategorySlug]/[...ProductSlug]", "page");
}

export function revalidateStorefrontContent() {
  revalidatePath("/", "page");
}

export function revalidateStorefrontPopups() {
  revalidateTag("storefront-popups", { expire: 0 });
  revalidatePath("/", "layout");
}
