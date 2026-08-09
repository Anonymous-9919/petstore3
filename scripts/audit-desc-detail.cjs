const data = JSON.parse(require("fs").readFileSync("src/data/products.json", "utf8"));
const missing = data.filter(p => !p.description || p.description.trim() === "");
console.log("=== 44 products missing description ===\n");
missing.forEach(p => {
  const slug = p.category_slug + "/" + p.slug;
  const sd = (p.short_description || "").trim();
  const asd = (p.ar_short_description || "").trim();
  console.log("id=" + p.id, "[" + p.category_slug + "]");
  console.log("  name:", p.name);
  console.log("  ar_name:", p.ar_name || "(missing)");
  console.log("  short_description:", JSON.stringify(sd));
  console.log("  ar_short_description:", JSON.stringify(asd));
  console.log("");
});
console.log("=== Source check (live petstorekuwait.com) ===\n");
const ids = [...new Set(missing.map(p => p.id))];
const sample = data.filter(p => ids.includes(p.id)).slice(0, 10);
