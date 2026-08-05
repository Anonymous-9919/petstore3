export interface Category {
  id: number;
  name: string;
  ar_name: string;
  slug: string;
  photo: string;
  cover_photo: string | null;
  cover_photo_large: string | null;
  order: number;
  description: string;
  ar_description: string;
  products?: unknown[];
}

export interface OptionChoice {
  id: number;
  value: string;
  ar_value: string;
  price: number;
  striked_price: number;
  photo: string | null;
  photo_thumb: string | null;
  preselected: number;
  sort_order: number;
}

export interface ProductOption {
  id: number;
  name: string;
  ar_name: string;
  choices: OptionChoice[];
}

export interface Product {
  id: number;
  name: string;
  ar_name: string;
  description: string;
  ar_description: string;
  short_description: string;
  ar_short_description: string;
  price: number;
  striked_price: number | null;
  currency: string;
  slug: string;
  photo: string;
  photo_thumb: string;
  photo_small: string;
  photo_medium: string;
  gallery: unknown[];
  allow_special_remarks: boolean;
  hide_quantity_box: boolean;
  hide_buy_button: boolean;
  enable_buy_now: boolean;
  not_available: boolean;
  show_quick_add_to_cart: boolean;
  allow_preordering: boolean;
  min_addable_quantity: number | null;
  max_addable_quantity: number | null;
  options: ProductOption[];
  options_groups: unknown[];
  category_id: number;
  category_slug: string;
  published_date: string | null;
}

export interface Area {
  id: number;
  name: string;
  ar_name: string;
  province_en: string;
  price: number;
  minimum_order_value: number;
  area_id: number;
  branch: number;
  branch_name: string;
  branch_name_ar: string;
  area_lat?: string;
  area_lng?: string;
}

export interface Province {
  name: string;
  ar_name: string;
}

export interface Branch {
  id: number;
  name: string;
  ar_name: string;
}

export interface StoreData {
  name: string;
  ar_name: string;
  slogan: string;
  ar_slogan: string;
  logo: string;
  logo_ar: string;
  cover: string;
  cover_medium: string;
  cover_large: string;
  country_code: string | null;
  settings: {
    currency_english: string;
    currency_local: string;
    currency_iso: string;
    currency_decimals: number;
    minimum_order: number;
    custom_texts: Record<string, string>;
    enable_delivery: boolean;
    enable_pickup: boolean;
    show_order_mode: boolean;
  };
}
