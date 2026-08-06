const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const BASE = "https://www.petstorekuwait.com";
const OUT = path.join(__dirname, "..", "src", "data");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(p, body) {
  const res = await fetch(BASE + p, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`${p} -> ${res.status}`);
  return res.json();
}

const log = (m) => console.log(m);

(async () => {
  log("> /products_second_load/ (categories)");
  const catResp = await post("/products_second_load/", { used_components: {}, country_code: null, channel: "web" });
  const categories = (catResp.categories || []).filter((c) => c && typeof c.id === "number");
  const availableCategories = categories.map((c) => c.id);
  log(`> categories: ${categories.length}`);

  const productsPath = path.join(OUT, "products.json");
  const existing = JSON.parse(await readFile(productsPath, "utf8"));
  const existingIds = new Set(existing.map((p) => p.id));
  log(`> existing products: ${existing.length} (unique ids: ${existingIds.size})`);

  const fresh = [];
  const newFromOrig = [];
  let failed = [];
  for (const c of categories) {
    let page = 1;
    let pages = 1;
    let count = 0;
    do {
      try {
        const res = await post("/category_product_list_fetch_branch/", {
          category_id: c.id,
          slug: c.slug,
          page,
          used_components: {},
          availableCategories,
          branch_id: null,
          country_code: null,
          channel: "web",
        });
        const list = res.products || [];
        count += list.length;
        for (const p of list) {
          const tagged = { ...p, category_id: c.id, category_slug: c.slug };
          fresh.push(tagged);
          if (!existingIds.has(p.id)) newFromOrig.push(tagged);
        }
        pages = res.pages || 1;
        page += 1;
        await sleep(120);
      } catch (e) {
        log(`  FAIL category ${c.slug} page ${page}: ${e.message}`);
        failed.push({ id: c.id, page });
        break;
      }
    } while (page <= pages);
    log(`  ${c.slug} -> ${count}`);
    await sleep(120);
  }

  log(`\n> fresh total: ${fresh.length}`);
  log(`> unique fresh ids: ${new Set(fresh.map(p=>p.id)).size}`);
  log(`> NEW (not in existing): ${newFromOrig.length}`);

  if (newFromOrig.length === 0) {
    log("Nothing to add.");
    return;
  }

  // Build a set of slugs in each category from existing to dedupe (in case same slug different id)
  const existingSlugsByCat = {};
  for (const p of existing) {
    const k = p.category_slug + "|" + p.slug;
    existingSlugsByCat[k] = true;
  }
  const toAdd = newFromOrig.filter((p) => !existingSlugsByCat[p.category_slug + "|" + p.slug]);
  log(`> to add (deduped by slug): ${toAdd.length}`);

  if (toAdd.length === 0) {
    log("All new products are duplicate slugs (already covered).");
    return;
  }

  const merged = existing.concat(toAdd);
  await writeFile(productsPath, JSON.stringify(merged, null, 1));
  log(`\n> wrote products.json: ${merged.length} (was ${existing.length}, +${toAdd.length})`);

  // Summary by category
  const byCat = {};
  for (const p of toAdd) byCat[p.category_slug] = (byCat[p.category_slug] || 0) + 1;
  log("\n> new products by category:");
  Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => log(`   ${k}: +${v}`));

  if (failed.length) log(`\n> failed pages: ${failed.length}`);
})();
