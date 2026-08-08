// Fetches missing product descriptions (EN + AR) from petstorekuwait.com via Playwright.
// For each product in products.json with empty description, navigates to the source
// product page and captures both languages by toggling the site language switch.
//
// The source site ignores Accept-Language / locale. Instead of trusting locale, we
// detect the language the page is currently showing via the toggle button label:
//   - button text "En"  => page is in Arabic (clicking switches to English)
//   - button text "ع"   => page is in English (clicking switches to Arabic)

const { chromium } = require("playwright-core");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const fs = require("node:fs");

const PRODUCTS_PATH = path.join(__dirname, "..", "src", "data", "products.json");
const BASE = "https://www.petstorekuwait.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isArabicContent = (s) => /[\u0600-\u06FF]/.test(s || "");

(async () => {
  const products = JSON.parse(await readFile(PRODUCTS_PATH, "utf8"));
  const missing = products.filter(
    (p) =>
      (!p.description || p.description.trim() === "") ||
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

  const makeCtx = (locale) =>
    browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      extraHTTPHeaders: { "Accept-Language": locale },
    });

  const toggleLabel = (page) =>
    page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("button, a, span, div"));
      const found = els.find((b) => {
        const tx = (b.innerText || "").trim();
        return tx === "En" || tx === "EN" || tx === "ع";
      });
      return found ? found.innerText.trim() : null;
    });

  const clickToggle = (page) =>
    page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("button, a, span, div"));
      const found = els.find((b) => {
        const tx = (b.innerText || "").trim();
        return tx === "En" || tx === "EN" || tx === "ع";
      });
      if (found) {
        found.click();
        return true;
      }
      return false;
    });

  const readDesc = (page) =>
    page.evaluate(() => {
      const el = document.querySelector("#description");
      return el ? el.innerHTML.trim() : "";
    });

  const pollDesc = async (page) => {
    let desc = "";
    for (let j = 0; j < 15; j++) {
      desc = await readDesc(page);
      if (desc) break;
      await sleep(500);
    }
    return desc;
  };

  const fetchInLocale = async (locale) => {
    const ctx = await makeCtx(locale);
    const page = await ctx.newPage();
    const results = new Map();
    const wantAr = locale === "ar";

    for (let i = 0; i < uniqueIds.length; i++) {
      const id = uniqueIds[i];
      const p = byId.get(id);
      const url = `${BASE}/product/${p.category_slug}/${p.slug}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
        await sleep(1000);

        // "En" shown => page currently Arabic; "ع" shown => page currently English.
        const label = await toggleLabel(page);
        const currentlyAr = label === "En";
        if (label && currentlyAr !== wantAr) {
          await clickToggle(page);
          await sleep(1500);
        }

        let desc = await pollDesc(page);

        // Sanity re-check: if content language still mismatches, toggle once more.
        const finalLabel = await toggleLabel(page);
        const finalCurrentlyAr = finalLabel === "En";
        if (desc && finalLabel && finalCurrentlyAr !== wantAr) {
          await clickToggle(page);
          await sleep(1200);
          for (let j = 0; j < 15; j++) {
            desc = await readDesc(page);
            if (desc && isArabicContent(desc) === wantAr) break;
            await sleep(500);
          }
        }

        results.set(id, desc);
        process.stdout.write(
          `  ${locale}[${i + 1}/${uniqueIds.length}] id=${id} ${desc.length}b ${isArabicContent(desc) ? "AR" : "EN"}\n`
        );
      } catch (e) {
        process.stdout.write(
          `  ${locale}[${i + 1}/${uniqueIds.length}] id=${id} ERR ${e.message.slice(0, 50)}\n`
        );
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

  // Apply updates with language sanity guard: never store a wrong-language capture.
  let changed = 0;
  for (const p of products) {
    const enDesc = enResults.get(p.id);
    const arDesc = arResults.get(p.id);
    let touched = false;
    if ((!p.description || p.description.trim() === "") && enDesc && !isArabicContent(enDesc)) {
      p.description = enDesc;
      touched = true;
    }
    if ((!p.ar_description || p.ar_description.trim() === "") && arDesc && isArabicContent(arDesc)) {
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
    (p) =>
      (!p.description || p.description.trim() === "") ||
      (!p.ar_description || p.ar_description.trim() === "")
  );
  console.log(`> rows still missing any desc: ${stillMissing.length}`);
})();
