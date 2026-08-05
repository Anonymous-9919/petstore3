import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "src", "data");

const exists = async (p) => {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
};
const loadJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const BASE = "https://www.petstorekuwait.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(p, body) {
  const res = await fetch(BASE + p, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(`${p} -> ${res.status}`);
  return res.json();
}
async function get(p) {
  const res = await fetch(BASE + p, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${p} -> ${res.status}`);
  return res.json();
}

await mkdir(OUT, { recursive: true });

let store;
if (await exists(path.join(OUT, "store.json"))) {
  store = await loadJson(path.join(OUT, "store.json"));
  console.log("> /store/ (cached)");
} else {
  console.log("> /store/");
  store = await post("/store/", {
    products: [],
    savedArea: null,
    address: null,
    country_code: null,
    channel: "web"
  });
  await writeFile(path.join(OUT, "store.json"), JSON.stringify(store, null, 1));
}

let catResp;
if (await exists(path.join(OUT, "categories.json"))) {
  catResp = await loadJson(path.join(OUT, "categories.json"));
  console.log("> /products_second_load/ (cached)");
} else {
  console.log("> /products_second_load/");
  catResp = await post("/products_second_load/", {
    used_components: {},
    country_code: null,
    channel: "web"
  });
  await writeFile(path.join(OUT, "categories.json"), JSON.stringify(catResp, null, 1));
}

if (!(await exists(path.join(OUT, "static-pages.json")))) {
  console.log("> /fetch_static_pages/");
  try {
    const pages = await get("/fetch_static_pages/");
    await writeFile(path.join(OUT, "static-pages.json"), JSON.stringify(pages, null, 1));
  } catch (e) {
    console.log("  static pages failed:", e.message);
  }
}

if (!(await exists(path.join(OUT, "delivery.json")))) {
  console.log("> /delivery_charges_second_load/");
  const dc = await post("/delivery_charges_second_load/", { country_code: null });
  await writeFile(path.join(OUT, "delivery.json"), JSON.stringify(dc, null, 1));
} else {
  console.log("> /delivery_charges_second_load/ (cached)");
}

const categories = (catResp.categories || []).filter((c) => c && typeof c.id === "number");
const availableCategories = categories.map((c) => c.id);
console.log(`> categories: ${categories.length}`);

let allProducts;
if (await exists(path.join(OUT, "products.json"))) {
  allProducts = await loadJson(path.join(OUT, "products.json"));
  console.log(`> products (cached): ${allProducts.length}`);
} else {
  allProducts = [];
  let failed = [];
  for (const c of categories) {
    let page = 1;
    let pages = 1;
    let count = 0;
    do {
      try {
        const res = await post("/category_product_list_fetch_branch/", {
          category_id: c.id,
          page,
          used_components: {},
          availableCategories,
          branch_id: null,
          channel: "web"
        });
        const list = res.products || [];
        count += list.length;
        for (const p of list) {
          allProducts.push({ ...p, category_id: c.id, category_slug: c.slug });
        }
        pages = res.pages || 1;
        page += 1;
        await sleep(120);
      } catch (e) {
        console.log(`  category ${c.id} page ${page} failed:`, e.message);
        failed.push({ id: c.id, page });
        break;
      }
    } while (page <= pages);
    console.log(`  ${c.slug} -> ${count} products`);
    await sleep(120);
  }

  await writeFile(path.join(OUT, "products.json"), JSON.stringify(allProducts, null, 1));
  console.log(`TOTAL products: ${allProducts.length}`);
  if (failed.length) console.log("FAILED:", failed);
}

console.log("> /load_product_details/ (details pass)");
let done = 0;
const missing = allProducts.filter(
  (p) => !(p.description || p.ar_description || (p.options || []).length || (p.gallery || []).length)
);
for (const p of allProducts) {
  if (!(p.description || p.ar_description || (p.options || []).length || (p.gallery || []).length)) {
    continue;
  }
  done += 1;
}
for (const p of missing) {
  let ok = false;
  for (let attempt = 0; attempt < 4 && !ok; attempt++) {
    try {
      const d = await post("/load_product_details/", { product_id: p.id, country_code: "KD" });
      p.description = d.description || "";
      p.ar_description = d.ar_description || "";
      p.gallery = d.gallery || [];
      p.variant_keys = d.variant_keys || [];
      p.options = d.options || [];
      p.options_groups = d.options_groups || [];
      ok = true;
      done += 1;
    } catch (e) {
      await sleep(800 * (attempt + 1));
    }
  }
  if (!ok) {
    console.log(`  detail ${p.id} failed after retries`);
    p.description = p.description || "";
    p.ar_description = p.ar_description || "";
    p.gallery = p.gallery || [];
  }
  if (done % 100 === 0) console.log(`  ${done}/${allProducts.length}`);
  await sleep(450);
}
await writeFile(path.join(OUT, "products.json"), JSON.stringify(allProducts, null, 1));
console.log(`DETAILS fetched for ${done}/${allProducts.length}`);
console.log(`products with desc: ${allProducts.filter((x) => x.description || x.ar_description).length}`);
console.log(`products with options: ${allProducts.filter((x) => (x.options || []).length).length}`);
console.log(`products with gallery: ${allProducts.filter((x) => (x.gallery || []).length).length}`);
if (failed.length) console.log("FAILED:", failed);
console.log("Done.");
