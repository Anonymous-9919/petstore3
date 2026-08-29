import { expect, test } from "@playwright/test";

test.describe("public storefront", () => {
  test("renders fixture catalog with labelled, keyboard-accessible controls", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Toggle language" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Search" }).first()).toBeVisible();
    await expect(page.locator("a[href^='/category/']").first()).toBeVisible();

    await page.getByRole("button", { name: "Toggle language" }).first().focus();
    await expect(page.getByRole("button", { name: "Toggle language" }).first()).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByRole("button", { name: "Toggle language" }).first().press("Enter");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    expect(errors).toEqual([]);
  });

  test("adapts to the active viewport without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const filterButton = page.getByRole("button", { name: /filter|التصفية/i });
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    await expect(page.getByRole("button", { name: "close" })).toBeVisible();
    await page.getByRole("button", { name: "close" }).click();
    await expect(page.getByRole("button", { name: "close" })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });
});
