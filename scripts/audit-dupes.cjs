const fs = require("fs");
const data = JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));
const seen = new Map();
for (const p of data) {
  if (!seen.has(p.slug)) seen.set(p.slug, []);
  seen.get(p.slug).push(p);
}
let groups = 0;
for (const [slug, arr] of seen) {
  if (arr.length > 1) {
    groups++;
    if (groups <= 40) {
      console.log("SLUG:", JSON.stringify(slug));
      arr.forEach((p) =>
        console.log(
          "   id=" + p.id,
          "cat=" + p.category_slug,
          "name=" + JSON.stringify(p.name).slice(0, 60),
          "price=" + p.price,
          "photo=" + (p.photo || "").slice(0, 30)
        )
      );
    }
  }
}
console.log("duplicate slug groups:", groups);
