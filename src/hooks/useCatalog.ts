"use client";

import { useEffect, useState } from "react";
import type { Category, Product } from "@/lib/types";

const initial = { categories: [] as Category[], products: [] as Product[], loading: true, error: false };

export function useCatalog() {
  const [state, setState] = useState(initial);
  useEffect(() => {
    let active = true;
    fetch("/api/storefront/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog unavailable")))
      .then((data: { categories: Category[]; products: Product[] }) => { if (active) setState({ categories: data.categories, products: data.products, loading: false, error: false }); })
      .catch(() => { if (active) setState((current) => ({ ...current, loading: false, error: true })); });
    return () => { active = false; };
  }, []);
  return state;
}
