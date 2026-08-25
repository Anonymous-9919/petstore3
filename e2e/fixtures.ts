import type { Page } from "@playwright/test";

export const catalog = {
  categories: [{ id: 1, name: "Smoke Food", ar_name: "Smoke Food", slug: "smoke-food", photo: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", cover_photo: null, cover_photo_large: null, order: 1, description: "", ar_description: "" }],
  products: [{ id: 1, name: "Smoke Kibble", ar_name: "Smoke Kibble", description: "A local browser test product.", ar_description: "", short_description: "", ar_short_description: "", price: 2.5, striked_price: null, currency: "KD", slug: "smoke-kibble", photo: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", photo_thumb: "", photo_small: "", photo_medium: "", gallery: [], allow_special_remarks: true, hide_quantity_box: false, hide_buy_button: false, enable_buy_now: true, not_available: false, show_quick_add_to_cart: true, allow_preordering: false, min_addable_quantity: null, max_addable_quantity: null, options: [], options_groups: [], category_id: 1, category_slug: "smoke-food", published_date: null }],
};

export function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function mockStorefront(page: Page) {
  await page.route("**/api/storefront/catalog", (route) => route.fulfill({ json: catalog }));
  await page.route("**/api/storefront/fulfillment", (route) => route.fulfill({ json: { branches: [{ id: 1, name: "Smoke Branch", nameAr: "Smoke Branch" }], provinces: [] } }));
}

export function expectNoConsoleErrors(errors: string[]) {
  if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
}
