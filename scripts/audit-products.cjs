const fs = require("fs");
const data = JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));
console.log("total products:", data.length);
const targets = [
  "moochie-paté-with-tuna",
  "moochie-paté-chicken-1",
  "protein-premium-adult-cat-paté-beef-400g",
  "padovan-granpâté-fruits",
];
for (const t of targets) {
  const p = data.find((x) => x.slug === t);
  if (p) {
    console.log("FOUND", JSON.stringify(t), "=>", p.category_slug, "|", p.name.slice(0, 40));
  } else {
    console.log("MISSING", JSON.stringify(t));
    const similar = data.filter((x) => x.slug.includes(t.slice(0, 10)));
    console.log("  similar:", similar.map((x) => x.slug).slice(0, 5));
  }
}
const slugs = data.map((p) => p.slug);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
console.log("duplicate slugs:", dupes.length);
const withPat = data.filter((p) => p.slug.includes("pat"));
console.log("products with pat in slug:", withPat.length);
withPat.forEach((p) => console.log("  ", JSON.stringify(p.slug), p.category_slug));
