"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang } from "@/lib/i18n";

export function useHasMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export interface CartItem {
  key: string;
  productId: number;
  slug: string;
  categorySlug: string;
  name: string;
  ar_name: string;
  photo: string;
  price: number;
  qty: number;
  note: string;
  options: { optionId: number; choiceId: number; label: string }[];
}

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  setQty: (key: string, qty: number) => void;
  setNote: (key: string, note: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: () => number;
  total: () => number;
}

interface WishlistState {
  ids: number[];
  toggle: (id: number) => void;
  has: (id: number) => boolean;
}

export type OrderMode = "delivery" | "pickup";
export type DeliveryTimeType = "asap" | "scheduled";

export interface DeliveryTime {
  type: DeliveryTimeType;
  date: string;
  start: string;
  end: string;
}

interface DeliveryState {
  mode: OrderMode;
  branchId: number | null;
  branchName: string | null;
  branchArName: string | null;
  areaId: number | null;
  areaName: string | null;
  areaArName: string | null;
  timeType: DeliveryTimeType;
  expectedDate: string | null;
  expectedStart: string | null;
  expectedEnd: string | null;
  name: string;
  phone: string;
  addressType: "home" | "apartment" | "office";
  block: string;
  street: string;
  building: string;
  avenue: string;
  paci: string;
  additional: string;
  payment: string;
  setMode: (m: OrderMode) => void;
  setBranch: (id: number, name?: string, arName?: string) => void;
  setArea: (id: number, name: string, arName: string) => void;
  setDeliveryTime: (t: DeliveryTime) => void;
  setContact: (name: string, phone: string) => void;
  setAddress: (a: {
    addressType?: DeliveryState["addressType"];
    block?: string;
    street?: string;
    building?: string;
    avenue?: string;
    paci?: string;
    additional?: string;
  }) => void;
  setPayment: (payment: string) => void;
}

export const useLang = create<LangState>()(
  persist(
    (set) => ({
      lang: "ar",
      setLang: (lang) => set({ lang }),
    }),
    {
      name: "ps-lang",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.key === item.key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === item.key ? { ...i, qty: i.qty + (item.qty ?? 1) } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty: item.qty ?? 1, note: item.note ?? "" }] };
        }),
      setQty: (key, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, qty } : i)),
        })),
      setNote: (key, note) =>
        set((state) => ({
          items: state.items.map((i) => (i.key === key ? { ...i, note } : i)),
        })),
      remove: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      total: () => get().items.reduce((n, i) => n + i.price * i.qty, 0),
    }),
    {
      name: "ps-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((x) => x !== id)
            : [...state.ids, id],
        })),
      has: (id) => get().ids.includes(id),
    }),
    {
      name: "ps-wishlist",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function useLocationSet(): boolean {
  const mode = useDelivery((s) => s.mode);
  const areaId = useDelivery((s) => s.areaId);
  const branchId = useDelivery((s) => s.branchId);
  return (mode === "delivery" && !!areaId) || (mode === "pickup" && !!branchId);
}

export function deliveryAddressComplete(a: {
  block: string;
  street: string;
  building: string;
}): boolean {
  return !!a.block.trim() && !!a.street.trim() && !!a.building.trim();
}

export const useDelivery = create<DeliveryState>()(
  persist(
    (set) => ({
      mode: "delivery",
      branchId: null,
      branchName: null,
      branchArName: null,
      areaId: null,
      areaName: null,
      areaArName: null,
      timeType: "scheduled",
      expectedDate: null,
      expectedStart: null,
      expectedEnd: null,
      name: "",
      phone: "",
      addressType: "home",
      block: "",
      street: "",
      building: "",
      avenue: "",
      paci: "",
      additional: "",
      payment: "cash",
      setMode: (mode) => set({ mode }),
      setBranch: (branchId, name, arName) =>
        set((s) => ({
          branchId,
          branchName: name ?? s.branchName,
          branchArName: arName ?? s.branchArName,
        })),
      setArea: (areaId, areaName, areaArName) => set({ areaId, areaName, areaArName }),
      setDeliveryTime: ({ type, date, start, end }) =>
        set({ timeType: type, expectedDate: date, expectedStart: start, expectedEnd: end }),
      setContact: (name, phone) => set({ name, phone }),
      setAddress: (a) =>
        set((s) => ({
          addressType: a.addressType ?? s.addressType,
          block: a.block ?? s.block,
          street: a.street ?? s.street,
          building: a.building ?? s.building,
          avenue: a.avenue ?? s.avenue,
          paci: a.paci ?? s.paci,
          additional: a.additional ?? s.additional,
        })),
      setPayment: (payment) => set({ payment }),
    }),
    {
      name: "ps-delivery",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
