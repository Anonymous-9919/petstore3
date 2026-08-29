import { HomePageContent } from "@/components/HomePageContent";
import { getHomepageStorefrontContent } from "@/server/storefront-content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { banners, announcement } = await getHomepageStorefrontContent();
  return <HomePageContent banners={banners} announcement={announcement} />;
}
