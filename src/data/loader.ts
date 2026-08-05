import storeJson from "@/data/store.json";
import categoriesJson from "@/data/categories.json";
import deliveryJson from "@/data/delivery.json";
import type { Area, Branch, Category, Product, Province, StoreData } from "@/lib/types";

export const storeData = storeJson as unknown as StoreData;
export const categoryList = (categoriesJson as unknown as { categories: Category[] }).categories;
export const deliveryData = deliveryJson as unknown as {
  branches: Branch[];
  provinces: Province[];
  areas: Area[];
  branch_delivery_charges: Area[];
  delivery_charges: unknown[];
};

let productsPromise: Promise<Product[]> | null = null;

export function getProducts(): Promise<Product[]> {
  if (!productsPromise) {
    productsPromise = import("@/data/products.json").then(
      (m) => (m as unknown as { default: Product[] }).default as Product[]
    );
  }
  return productsPromise;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.slug === slug);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categoryList.find((c) => c.slug === slug);
}

export function getCategoryName(cat: Category | undefined, lang: "ar" | "en"): string {
  if (!cat) return "";
  return lang === "ar" && cat.ar_name ? cat.ar_name : cat.name;
}

export function getBranchAreas(branchId: number): Area[] {
  return (deliveryData.branch_delivery_charges || []).filter((a) => a.branch === branchId);
}

export function getProvinces(): Province[] {
  return deliveryData.provinces || [];
}

export function getBranches(): Branch[] {
  return deliveryData.branches || [];
}

export function sortCategories(list: Category[]): Category[] {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
