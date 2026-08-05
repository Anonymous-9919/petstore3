"use client";

import { use, useState } from "react";
import CategoryCard from "@/components/CategoryCard";
import DeliveryBar from "@/components/DeliveryBar";
import {
  FilterSortBar,
  FilterSortDrawer,
  hasSelection,
  resetFsState,
  type FsState,
} from "@/components/FilterSort";
import { HomeHeader, MobileHeader } from "@/components/Header";
import AreaBottomBar from "@/components/AreaBottomBar";
import MobileCarousel from "@/components/MobileCarousel";
import StoreInfoMobile from "@/components/StoreInfoMobile";
import SortedProductList from "@/components/SortedProductList";
import { categoryList, getProducts, sortCategories } from "@/data/loader";
import { useDelivery } from "@/lib/state";

export default function HomePage() {
  const [fsOpen, setFsOpen] = useState(false);
  const [fsState, setFsState] = useState<FsState>(resetFsState);
  const [applied, setApplied] = useState<FsState | null>(null);
  const areaId = useDelivery((s) => s.areaId);
  const cats = sortCategories(categoryList);
  const products = use(getProducts());

  const active = applied && hasSelection(applied) ? applied : null;

  return (
    <>
      <div className="lg:hidden">
        <MobileHeader />
      </div>
      <div className="hidden lg:block">
        <HomeHeader />
      </div>
      <div className="lg:pt-0">
        <MobileCarousel />
        <StoreInfoMobile />
      </div>
      <DeliveryBar />
      <div className="h-10" />
      <FilterSortBar
        onOpen={() => {
          setFsState(applied ?? resetFsState());
          setFsOpen(true);
        }}
      />
      {active ? (
        <SortedProductList products={products} state={active} />
      ) : (
        <div className="grid grid-cols-2 gap-0 px-[9px]">
          {cats.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      )}
      <div className="h-[115px]" />
      <div className="h-[60px]" />
      <AreaBottomBar />
      <FilterSortDrawer
        open={fsOpen}
        state={fsState}
        onChange={setFsState}
        onClose={() => setFsOpen(false)}
        onApply={() => {
          setApplied(fsState);
          setFsOpen(false);
        }}
      />
    </>
  );
}
