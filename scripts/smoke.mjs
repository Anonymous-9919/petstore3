import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright-core";

const port = Number(process.env.SMOKE_PORT || 3101);
const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;
const startsServer = !process.env.SMOKE_BASE_URL;

const catalog = {
  categories: [
    {
      id: 1,
      name: "Smoke Food",
      ar_name: "طعام تجريبي",
      slug: "smoke-food",
      photo: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      cover_photo: null,
      cover_photo_large: null,
      order: 1,
      description: "",
      ar_description: "",
    },
  ],
  products: [
    {
      id: 1,
      name: "Smoke Kibble",
      ar_name: "طعام تجريبي",
      description: "A local browser smoke-test product.",
      ar_description: "",
      short_description: "",
      ar_short_description: "",
      price: 2.5,
      striked_price: null,
      currency: "KD",
      slug: "smoke-kibble",
      photo: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      photo_thumb: "",
      photo_small: "",
      photo_medium: "",
      gallery: [],
      allow_special_remarks: true,
      hide_quantity_box: false,
      hide_buy_button: false,
      enable_buy_now: true,
      not_available: false,
      show_quick_add_to_cart: true,
      allow_preordering: false,
      min_addable_quantity: null,
      max_addable_quantity: null,
      options: [],
      options_groups: [],
      category_id: 1,
      category_slug: "smoke-food",
      published_date: null,
    },
  ],
};

function startServer() {
  const args = ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)];
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], { stdio: "inherit" });
  }
  return spawn("npm", args, { stdio: "inherit" });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The Next development server has not finished starting.
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function run() {
  const server = startsServer ? startServer() : null;
  let browser;

  try {
    if (server) await waitForServer();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== baseUrl) return route.abort();
      if (url.pathname === "/api/storefront/catalog") {
        return route.fulfill({ json: catalog });
      }
      if (url.pathname === "/api/storefront/fulfillment") {
        return route.fulfill({
          json: {
            branches: [{ id: 1, name: "Smoke Branch", nameAr: "فرع تجريبي" }],
            provinces: [],
          },
        });
      }
      return route.continue();
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByRole("img", { name: "Smoke Food" }).click();
    await page.getByText("Smoke Kibble", { exact: true }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.waitForURL("**/select/branch");
    await page.getByRole("button", { name: "Pickup" }).click();
    await page.getByText("Smoke Branch", { exact: true }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await page.waitForURL(baseUrl + "/");

    await page.goto(`${baseUrl}/product/smoke-food/smoke-kibble`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByLabel("Cart").click();
    await page.getByRole("button", { name: "Go to checkout" }).click();
    await page.waitForURL("**/checkout/details");
    await page.getByText("Contact Information", { exact: true }).waitFor();

    console.log("Browser smoke passed: catalog, branch selection, cart, and checkout details.");
  } finally {
    await browser?.close();
    if (server) server.kill();
  }
}

run().catch((error) => {
  if (/Executable doesn't exist/.test(String(error))) {
    console.error("Chromium is not installed. Run: npx playwright@1.62.1 install chromium");
  }
  console.error(error);
  process.exitCode = 1;
});
