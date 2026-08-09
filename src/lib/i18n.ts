const messages: Record<string, { en: string; ar: string }> = {
  addToCart: { en: "Add to Cart", ar: "اضف للسلة" },
  add: { en: "Add", ar: "أضف" },
  buyNow: { en: "Buy Now", ar: "اشتر الآن" },
  description: { en: "Description", ar: "الوصف" },
  specialRemarks: { en: "Special Requests", ar: "ملاحظات" },
  shareWithFriend: { en: "SHARE WITH A FRIEND", ar: "SHARE WITH A FRIEND" },
  delivery: { en: "Delivery", ar: "توصيل" },
  pickup: { en: "Pickup", ar: "استلام" },
  deliverTo: { en: "Deliver to", ar: "توصيل الى" },
  earliestArrival: { en: "Earliest arrival", ar: "أقرب وصول" },
  earliestPickup: { en: "Earliest pickup", ar: "أقرب استلام" },
  change: { en: "Change", ar: "تغيير" },
  filterSort: { en: "Filter & Sort", ar: "التصفية و الترتيب" },
  selectLocation: { en: "Select your location", ar: "اختر منطقتك" },
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
  myCart: { en: "Shopping Cart", ar: "سلة المشتريات" },
  favorites: { en: "Favorites", ar: "المفضلة" },
  myFavorites: { en: "My Favorites", ar: "المفضلة" },
  noFavorites: { en: "No favorites yet", ar: "لا توجد منتجات مفضلة" },
  goToCheckout: { en: "Go to checkout", ar: "الذهاب الى الدفع" },
  checkout: { en: "Checkout", ar: "الدفع" },
  reviewOrder: { en: "Review Order", ar: "مراجعة الطلب" },
  placeOrder: { en: "Place Order", ar: "اتمام الطلب" },
  outOfStock: { en: "Out of stock", ar: "غير متوفر" },
  notAvailable: { en: "Not Available", ar: "غير متاح" },
  specialRequest: { en: "Special Requests", ar: "ملاحظات" },
  selectVariant: { en: "Select a variant", ar: "الرجاء اختيار الصنف" },
  qty: { en: "Quantity", ar: "الكمية" },
  subtotal: { en: "Subtotal", ar: "الإجمالي" },
  deliveryFee: { en: "Delivery Fee", ar: "رسوم التوصيل" },
  deliveryFees: { en: "Delivery services", ar: "خدمات التوصيل" },
  total: { en: "Total", ar: "المجموع" },
  emptyCart: { en: "Your cart is empty", ar: "سلة مشترياتك فارغة" },
  home: { en: "Home", ar: "الرئيسية" },
  startShopping: { en: "Start shopping", ar: "ابدأ التسوق" },
  contactInfo: { en: "Contact Information", ar: "معلومات التواصل" },
  name: { en: "Name", ar: "الاسم" },
  phoneNumber: { en: "Phone Number", ar: "رقم الهاتف" },
  next: { en: "Next", ar: "التالي" },
  pay: { en: "Pay", ar: "أدفع" },
  cardNumber: { en: "Card number", ar: "رقم البطاقة" },
  expiry: { en: "Expiry", ar: "تاريخ الانتهاء" },
  cvv: { en: "CVV", ar: "رمز التحقق" },
  sandboxNotice: { en: "Sandbox test gateway - no real payment is charged.", ar: "بوابة اختبارية - لا يتم خصم أي مبلغ حقيقي." },
  orderPlaced: { en: "Order placed successfully", ar: "تم استلام طلبك بنجاح" },
  orderNumber: { en: "Order number", ar: "رقم الطلب" },
  helpReach: { en: "Help us find you faster", ar: "ساعدنا في الوصول اليك بسرعة ودقة" },
  deliveryTime: { en: "Delivery time", ar: "وقت التوصيل" },
  purchases: { en: "Items", ar: "المشتريات" },
  edit: { en: "Edit", ar: "تعديل" },
  remove: { en: "Remove", ar: "إزالة" },
  cash: { en: "Cash", ar: "كاش" },
  knet: { en: "Debit Card", ar: "بطاقة سحب آلي" },
  credit: { en: "Credit Card", ar: "بطاقة ائتمان" },
  applePay: { en: "Apple Pay (KNET)", ar: "أبل باي (كي نت)" },
  paymentMethod: { en: "Payment Method", ar: "طريقة الدفع" },
  homeType: { en: "Home", ar: "منزل" },
  apartment: { en: "Apartment", ar: "شقة" },
  office: { en: "Office", ar: "مكتب" },
  addressDetails: { en: "Address Details", ar: "تفاصيل العنوان" },
  deliveryAreaAddress: { en: "Delivery Area & Address", ar: "منطقة التوصيل والعنوان" },
  block: { en: "Block", ar: "قطعة" },
  street: { en: "Street", ar: "شارع" },
  building: { en: "House #", ar: "رقم المنزل" },
  buildingName: { en: "Building Name/#", ar: "رقم/اسم المبنى" },
  avenue: { en: "Avenue", ar: "جادة" },
  floor: { en: "Floor", ar: "طابق" },
  apartmentNum: { en: "Apartment #", ar: "شقة" },
  officeNum: { en: "Office #", ar: "مكتب" },
  paci: { en: "PACI", ar: "الرقم المدني للمبنى" },
  additional: { en: "Additional", ar: "اضافي" },
  method: { en: "Method", ar: "الطريقة" },
  deliveryMethod: { en: "Delivery", ar: "توصيل" },
  pickupMethod: { en: "Pickup", ar: "استلام" },
};

export type Lang = "ar" | "en";

export type Msg = { en: string; ar: string };

export function getMsg(key: keyof typeof messages): { en: string; ar: string } {
  const msg = messages[key];
  if (!msg) return { en: key, ar: key };
return msg;
}

export function buildT(lang: "ar" | "en") {
  return (key: string): string => {
    const m = (messages as Record<string, { en: string; ar: string }>)[key];
    if (!m) return key;
    if (!m.ar || !m.en) return m.en || m.ar || key;
    return lang === "ar" && m.ar ? m.ar : m.en;
  };
}