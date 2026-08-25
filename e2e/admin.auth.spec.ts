import { expect, test } from "@playwright/test";
import { captureConsoleErrors, expectNoConsoleErrors } from "./fixtures";

const enabled = Boolean(process.env.E2E_ADMIN_STORAGE_STATE);
const category = { id: "category-1", name: "QA Food", nameAr: "QA Food", archivedAt: null };
const product = { id: "product-1", categoryId: category.id, slug: "qa-kibble", sku: null, name: "QA Kibble", nameAr: "QA Kibble", description: null, descriptionAr: null, shortDescription: null, shortDescriptionAr: null, basePrice: "2.500", compareAtPrice: null, primaryImagePath: null, sortOrder: 0, isActive: true, isFeatured: false, allowPreorder: false, isDeliveryEnabled: true, isPickupEnabled: true, minQuantity: 1, maxQuantity: null, quantityIncrement: 1, archivedAt: null, category: { name: category.name, nameAr: category.nameAr } };

test.describe("authenticated admin catalog", () => {
  test.skip(!enabled, "Set E2E_ADMIN_STORAGE_STATE to an authorized, disposable Playwright storage-state file.");

  test("navigates catalog and exercises mocked product lifecycle plus API errors", async ({ page }) => {
    const errors = captureConsoleErrors(page);
    let products = [structuredClone(product)];
    await page.route("**/api/admin/categories", (route) => route.fulfill({ json: [category] }));
    await page.route("**/api/admin/products?*", (route) => route.fulfill({ json: { products, pagination: { total: products.length, totalPages: 1 } } }));
    await page.route("**/api/admin/products", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      products = [{ ...structuredClone(product), ...body, id: "product-2", category: product.category }, ...products];
      await route.fulfill({ status: 201, json: products[0] });
    });
    await page.route("**/api/admin/products/product-1", (route) => route.fulfill({ json: { ...product, images: [], optionGroups: [], inventoryLevels: [] } }));

    await page.goto("/admin/products");
    await expect(page.getByRole("complementary", { name: "Admin navigation" }).getByRole("link", { name: "Products" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("QA Kibble", { exact: true })).toBeVisible();
    await page.getByRole("heading", { name: "New product" }).locator("..").getByLabel("Category").selectOption(category.id);
    await page.getByLabel("Slug").fill("qa-created");
    await page.getByLabel("Name (English)").fill("QA Created");
    await page.getByLabel("Name (Arabic)").fill("QA Created");
    await page.getByLabel("Base price (KWD)").fill("3.5");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page.getByText("QA Created", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).last().click();
    await expect(page.getByRole("button", { name: "Save product" })).toBeVisible();
    await page.goto("/admin/products?catalog=qa");
    await expect(page).toHaveURL(/\/admin\/products\?catalog=qa$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/products$/);
    expectNoConsoleErrors(errors);
  });

  test("shows a readable product-load error", async ({ page }) => {
    await page.route("**/api/admin/products?*", (route) => route.fulfill({ status: 500, json: { error: "Unable to load products." } }));
    await page.route("**/api/admin/categories", (route) => route.fulfill({ json: [] }));
    await page.goto("/admin/products");
    await expect(page.getByText("Unable to load products.", { exact: true })).toBeVisible();
  });
});
