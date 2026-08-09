const fs = require("fs");
const { chromium } = require("playwright-core");
const exec = "C:/Users/osama/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";
const products = JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));

(async () => {
  const browser = await chromium.launch({ executablePath: exec, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const missing = [];
  const results = [];
  let n = 0;
  for (const p of products) {
    n++;
    const url = `https://petstorekuwait.vercel.app/product/${p.category_slug || "category"}/${p.slug}`;
    let body = "";
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(500);
      body = await page.evaluate(() => document.body.innerText.slice(0, 120));
    } catch (e) {
      body = "ERROR " + e.message.slice(0, 60);
    }
    const isMissing =
      body.includes("المنتج غير موجود") || body.includes("Product not found");
    results.push({ slug: p.slug, cat: p.category_slug, ok: !isMissing, body: body.replace(/\n+/g, " ").slice(0, 80) });
    if (isMissing) missing.push(p.slug);
    if (n % 100 === 0) console.log("checked", n, "missing so far", missing.length);
  }
  fs.writeFileSync("_qa/audit-product-urls.json", JSON.stringify(results, null, 2));
  console.log("DONE. total", products.length, "missing", missing.length);
  missing.forEach((m) => console.log("MISSING:", m));
  await browser.close();
})();
