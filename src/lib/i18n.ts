import { storeData } from "@/data/loader";

export type Lang = "ar" | "en";

export type Msg = { en: string; ar: string };

const ct = (storeData.settings?.custom_texts || {}) as Record<string, string>;

function use(key: string, fallbackEn: string, fallbackAr?: string): Msg {
  return {
    en: ct[key] || fallbackEn,
    ar: ct[`${key}_ar`] || fallbackAr || fallbackEn,
  };
}

const messages: Record<string, Msg> = {
  addToCart: use("add_to_cart", "Add to Cart", "اضف للسلة"),
  add: { en: "Add", ar: "أضف" },
  buyNow: { en: "Buy Now", ar: "اشتر الآن" },
  description: use("product_description", "Description", "الوصف"),
  specialRemarks: use("special_request_product", "Special Requests", "ملاحظات"),
  shareWithFriend: { en: "SHARE WITH A FRIEND", ar: "SHARE WITH A FRIEND" },
  delivery: use("delivery", "Delivery", "توصيل"),
  pickup: use("pickup", "Pickup", "استلام"),
  deliverTo: { en: "Deliver to", ar: "توصيل الى" },
  earliestArrival: use("earliest_arrival", "Earliest arrival", "أقرب وصول"),
  earliestPickup: use("earliest_pickup", "Earliest pickup", "أقرب استلام"),
  change: { en: "Edit", ar: "تغيير" },
  filterSort: { en: "Filter & Sort", ar: "التصفية و الترتيب" },
  selectLocation: use("select_location", "Select your location", "اختر منطقتك"),
  selectArea: { en: "Select Area", ar: "اختر منطقتك" },
  areaPlaceholder: { en: "Choose location", ar: "اختر منطقة" },
  chooseArea: { en: "Choose your area", ar: "اختر منطقتك" },
  ourBranches: { en: "Our Branches", ar: "أفرعنا" },
  connectWithUs: { en: "Connect with us", ar: "تواصل معنا" },
  search: { en: "Search", ar: "ابحث" },
  searchPlaceholder: { en: "Search...", ar: "...ابحث" },
  searchResults: { en: "Search Results", ar: "نتائج البحث" },
  noResults: { en: "No products found", ar: "لا توجد منتجات" },
  cart: { en: "Cart", ar: "السلة" },
  myCart: { en: "My Cart", ar: "سلة المشتريات" },
  favorites: { en: "Favorites", ar: "المفضلة" },
  myFavorites: { en: "My Favorites", ar: "المفضلة" },
  noFavorites: { en: "No favorites yet", ar: "لا توجد منتجات مفضلة" },
  goToCheckout: use("go_to_checkout", "Go to checkout", "الذهاب الى الدفع"),
  checkout: { en: "Checkout", ar: "الدفع" },
  reviewOrder: use("review_order", "Review Order", "مراجعة الطلب"),
  placeOrder: use("place_order", "Place Order", "اتمام الطلب"),
  outOfStock: use("out_of_stock", "Out of stock", "غير متوفر"),
  notAvailable: use("not_available", "Not Available", "غير متاح"),
  specialRequest: use("special_request_product", "Special Requests", "ملاحظات"),
  selectVariant: use("select_a_variant", "Select a variant", "الرجاء اختيار الصنف"),
  qty: { en: "Quantity", ar: "الكمية" },
  subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
  deliveryFee: { en: "Delivery Fee", ar: "رسوم التوصيل" },
  deliveryFees: { en: "Delivery services", ar: "خدمات التوصيل" },
  total: { en: "Total", ar: "الإجمالي" },
  emptyCart: { en: "Your cart is empty", ar: "سلة مشترياتك فارغة" },
  home: { en: "Home", ar: "الرئيسية" },
  startShopping: { en: "Start shopping", ar: "ابدأ التسوق" },
  categories: { en: "Categories", ar: "الأقسام" },
  mostSelling: use("most_selling", "Most Selling", "الاكثر مبيعا"),
  newestProducts: use("newest_products", "Newest Products", "احدث المنتجات"),
  sortBy: { en: "Sort by", ar: "الترتيب حسب" },
  featured: { en: "Featured", ar: "الترتيب الافتراضي" },
  sortMostSelling: { en: "Most Selling", ar: "الاكثر مبيعا" },
  sortNewest: { en: "Newest", ar: "الأحدث" },
  sortPriceLowHigh: { en: "Price: Low to High", ar: "السعر: من الأقل للأعلى" },
  sortPriceHighLow: { en: "Price: High to Low", ar: "السعر: من الأعلى للأقل" },
  sortTitle: { en: "Sort", ar: "الترتيب" },
  filtersTitle: { en: "Filters", ar: "التصفية" },
  clearLink: { en: "clear", ar: "امسح" },
  priceGroup: { en: "Price", ar: "السعر" },
  nameGroup: { en: "Name", ar: "الاسم" },
  dateGroup: { en: "Date", ar: "التاريخ" },
  lowToHigh: { en: "Low to High", ar: "الأقل إلى الأعلى" },
  highToLow: { en: "High to Low", ar: "الأعلى إلى الأقل" },
  aToZ: { en: "A to Z", ar: "أ - ي" },
  zToA: { en: "Z to A", ar: "ي - أ" },
  oldest: { en: "Oldest", ar: "الأقدم" },
  categoriesFs: { en: "Categories", ar: "الاصناف" },
  availableProducts: { en: "Available Products", ar: "المنتجات المتاحة" },
  applyFilters: { en: "Apply Filters", ar: "تطبيق" },
  applyRange: { en: "Apply", ar: "تطبيق" },
  clearRange: { en: "Clear", ar: "مسح" },
  account: { en: "Account", ar: "حسابي" },
  myAccount: { en: "My Account", ar: "حسابي" },
  trackOrder: { en: "Track Order", ar: "تتبع الطلب" },
  previousOrders: { en: "Previous Orders", ar: "الطلبات السابقة" },
  wallet: { en: "Wallet", ar: "المحفظة" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },
  selectBranch: { en: "Select Branch", ar: "اختر الفرع" },
  contactUs: { en: "Contact Us", ar: "اتصل بنا" },
  website: { en: "Website", ar: "الموقع" },
  whatsapp: { en: "WhatsApp", ar: "واتساب" },
  instagram: { en: "Instagram", ar: "انستغرام" },
  phone: { en: "Phone", ar: "الهاتف" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  branch: { en: "Branch", ar: "الفرع" },
  availableNow: { en: "Available", ar: "متوفر" },
  notProvided: use("no_provided_location", "This store does not provide a location", "هذا المتجر لا يتوفر لديه معلومات عن العنوان"),
  orderModeNote: { en: "Select your order type", ar: "اختر نوع الطلب" },
  arrivalTime: { en: "Arrival time", ar: "موعد التسليم" },
  asap: { en: "ASAP", ar: "في اقرب وقت" },
  scheduleForLater: { en: "Schedule for later", ar: "توصيل لاحقا" },
  schedulePickupForLater: { en: "Schedule pickup for later", ar: "استلام لاحقا" },
  today: { en: "Today", ar: "اليوم" },
  close: { en: "Close", ar: "إغلاق" },
  done: { en: "Done", ar: "حفظ" },
};

export function getMsg(key: keyof typeof messages): Msg {
  return messages[key];
}

export function buildT(lang: Lang) {
  return (key: keyof typeof messages): string => {
    const m = messages[key];
    return lang === "ar" && m.ar ? m.ar : m.en;
  };
}
