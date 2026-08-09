const fs = require("fs");
const cats = JSON.parse(fs.readFileSync("src/data/categories.json", "utf8")).categories;
const products = JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));
const catSlugs = new Set(cats.map((c) => c.slug));
console.log("categories:", cats.length);
const bad = products.filter((p) => !catSlugs.has(p.category_slug));
console.log("products with category_slug not in categories:", bad.length);
bad.slice(0, 20).forEach((p) => console.log("  ", JSON.stringify(p.category_slug), "|", p.slug));
const notAvail = products.filter((p) => p.not_available);
console.log("not_available:", notAvail.length);
const hideBuy = products.filter((p) => p.hide_buy_button);
console.log("hide_buy_button:", hideBuy.length);
const noPhoto = products.filter((p) => !p.photo);
console.log("no photo:", noPhoto.length);
// options counts
const withOpts = products.filter((p) => p.options && p.options.length > 0);
console.log("with options:", withOpts.length);
