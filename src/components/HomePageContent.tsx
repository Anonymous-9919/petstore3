"use client";

import { useState } from "react";
import CategoryCard from "@/components/CategoryCard";
import DeliveryBar from "@/components/DeliveryBar";
import { FilterSortBar, FilterSortDrawer, hasSelection, resetFsState, type FsState } from "@/components/FilterSort";
import { HomeHeader, MobileHeader } from "@/components/Header";
import AreaBottomBar from "@/components/AreaBottomBar";
import MobileCarousel from "@/components/MobileCarousel";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import StoreInfoMobile from "@/components/StoreInfoMobile";
import SortedProductList from "@/components/SortedProductList";
import { useDelivery } from "@/lib/state";
import { useCatalog } from "@/hooks/useCatalog";

type Banner = { path: string; mobilePath: string | null; alt: string | null; altAr: string | null };
type Announcement = { announcementText: string | null; announcementTextAr: string | null; announcementCtaLabel: string | null; announcementCtaLabelAr: string | null; announcementCtaUrl: string | null };

export function HomePageContent({ banners, announcement }: { banners: Banner[]; announcement: Announcement | null }) {
  const [fsOpen, setFsOpen] = useState(false);
  const [fsState, setFsState] = useState<FsState>(resetFsState);
  const [applied, setApplied] = useState<FsState | null>(null);
  const areaId = useDelivery((s) => s.areaId);
  const { categories, products } = useCatalog();
  const cats = [...categories].sort((a, b) => a.order - b.order);
  const active = applied && hasSelection(applied) ? applied : null;

  return <><div className="lg:hidden"><MobileHeader /></div><div className="hidden lg:block"><HomeHeader /></div><div className="pt-[55px] lg:pt-0"><AnnouncementBar announcement={announcement} /><MobileCarousel banners={banners} /><StoreInfoMobile /></div><DeliveryBar /><div className="h-10" /><FilterSortBar onOpen={() => { setFsState(applied ?? resetFsState()); setFsOpen(true); }}/>{active ? <SortedProductList products={products} state={active} /> : <div className="grid grid-cols-2 gap-0 px-[9px]">{cats.map((category) => <CategoryCard key={category.id} category={category} />)}</div>}<div className="h-[115px]" /><div className="h-[60px]" /><AreaBottomBar /><FilterSortDrawer open={fsOpen} state={fsState} onChange={setFsState} onClose={() => setFsOpen(false)} onApply={() => { setApplied(fsState); setFsOpen(false); }} onClear={(state) => setApplied(state)} /></>;
}
