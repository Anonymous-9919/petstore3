const fs = require("fs");
const data = JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));
console.log("total products:", data.length);

const noDesc = data.filter(p => !p.description || p.description.trim() === "");
const noArDesc = data.filter(p => !p.ar_description || p.ar_description.trim() === "");
const noName = data.filter(p => !p.name || p.name.trim() === "");
const noArName = data.filter(p => !p.ar_name || p.ar_name.trim() === "");
const noShortDesc = data.filter(p => !p.short_description || p.short_description.trim() === "");
const noPhoto = data.filter(p => !p.photo || p.photo.trim() === "");

console.log("missing description:", noDesc.length);
console.log("missing ar_description:", noArDesc.length);
console.log("missing name:", noName.length);
console.log("missing ar_name:", noArName.length);
console.log("missing short_description:", noShortDesc.length);
console.log("missing photo:", noPhoto.length);

console.log("\n-- products missing description (first 20) --");
noDesc.slice(0, 20).forEach(p => console.log("  id=" + p.id, "cat=" + p.category_slug, "slug=" + p.slug, "|", p.name));

console.log("\n-- products missing BOTH desc + ar_desc --");
const bothMissing = data.filter(p => (!p.description || p.description.trim() === "") && (!p.ar_description || p.ar_description.trim() === ""));
console.log("count:", bothMissing.length);
bothMissing.slice(0, 20).forEach(p => console.log("  id=" + p.id, "cat=" + p.category_slug, "slug=" + p.slug, "|", p.name));
