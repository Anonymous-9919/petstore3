// Fetches missing product descriptions (EN + AR) from petstorekuwait.com via Playwright.
// For each product in products.json with empty description, navigates to the source
// product page in two separate browser contexts (en then ar) to capture both languages.

const { chromium } = require("playwright-core");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const fs = require("node:fs");

const PRODUCTS_PATH = path.join(__dirname, "..", "src", "data", "products.json");
const BASE = "https://www.petstorekuwait.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const products = JSON.parse(await readFile(PRODUCTS_PATH, "utf8"));
  const missing = products.filter(
    (p) => (!p.description || p.description.trim() === "") ||
           (!p.ar_description || p.ar_description.trim() === "")
  );
  const byId = new Map();
  for (const p of products) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  const uniqueIds = [...new Set(missing.map((p) => p.id))];
  console.log(`> total products: ${products.length}`);
  console.log(`> rows with empty desc: ${missing.length}`);
  console.log(`> unique IDs to fetch: ${uniqueIds.length}`);

  const candidates = [
    process.env.PLAYWRIGHT_BROWSER_PATH,
    "C:\\Users\\osama\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe",
  ].filter(Boolean);
  let execPath;
  for (const c of candidates) {
    if (fs.existsSync(c)) { execPath = c; break; }
  }
  console.log(`> using browser: ${execPath || "(default)"}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: execPath,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  // Build a context with English locale
  const makeCtx = (locale) => browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: locale,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    extraHTTPHeaders: { "Accept-Language": locale },
  });

  const fetchInLocale = async (locale) => {
    const ctx = await makeCtx(locale);
    const page = await ctx.newPage();
    const results = new Map();
    // Track current page language (source site may auto-set based on IP/locale).
    // After loading each product we may need to toggle if the page shows the wrong language.
    const isArabicContent = (s) => /[\u0600-\u06FF]/.test(s || "");

    for (let i = 0; i < uniqueIds.length; i++) {
      const id = uniqueIds[i];
      const p = byId.get(id);
      const url = `${BASE}/product/${p.category_slug}/${p.slug}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
        try {
          await page.waitForSelector("#description, [class*='loader']", { timeout: 8000 });
        } catch {}
        await sleep(800);
        // Poll for description
        let desc = "";
        for (let j = 0; j < 10; j++) {
          desc = await page.evaluate(() => {
            const el = document.querySelector("#description");
            return el ? el.innerHTML.trim() : "";
          });
          if (desc) break;
          await sleep(400);
        }
        // If we want EN and the page rendered AR (or vice versa), click the toggle.
        const gotAr = isArabicContent(desc);
        const wantAr = locale === "ar";
        if (desc && gotAr !== wantAr) {
          // Try clicking via JS to bypass overlay issues
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const t = btns.find(b => b.innerText.trim() === "ع" || b.innerText.trim() === "EN" || b.innerText.trim() === "En");
            if (t) t.click();
          });
          await sleep(1500);
          for (let j = 0; j < 10; j++) {
            desc = await page.evaluate(() => {
              const el = document.querySelector("#description");
              return el ? el.innerHTML.trim() : "";
            });
            if (desc && isArabicContent(desc) === wantAr) break;
            await sleep(400);
          }
        }
        if (desc) results.set(id, desc);
        process.stdout.write(`  ${locale}[${i + 1}/${uniqueIds.length}] id=${id} ${desc.length}b ${isArabicContent(desc) ? "AR" : "EN"}\n`);
      } catch (e) {
        process.stdout.write(`  ${locale}[${i + 1}/${uniqueIds.length}] id=${id} ERR ${e.message.slice(0, 50)}\n`);
      }
    }
    await ctx.close();
    return results;
  };

  console.log("> fetching EN descriptions...");
  const enResults = await fetchInLocale("en");
  console.log(`> got ${enResults.size} EN descriptions`);

  console.log("> fetching AR descriptions...");
  const arResults = await fetchInLocale("ar");
  console.log(`> got ${arResults.size} AR descriptions`);

  await browser.close();

  // Apply updates
  let changed = 0;
  for (const p of products) {
    const enDesc = enResults.get(p.id);
    const arDesc = arResults.get(p.id);
    let touched = false;
    if ((!p.description || p.description.trim() === "") && enDesc) {
      p.description = enDesc;
      touched = true;
    }
    if ((!p.ar_description || p.ar_description.trim() === "") && arDesc) {
      p.ar_description = arDesc;
      touched = true;
    }
    if (touched) changed++;
  }

  if (changed > 0) {
    await writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 1));
    console.log(`\n> wrote products.json: ${changed} rows updated`);
  } else {
    console.log(`\n> no updates written`);
  }

  const stillMissing = products.filter(
    (p) => (!p.description || p.description.trim() === "") ||
           (!p.ar_description || p.ar_description.trim() === "")
  );
  console.log(`> rows still missing any desc: ${stillMissing.length}`);
})();
