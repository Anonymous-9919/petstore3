const fs = require("fs");
const buf = fs.readFileSync("src/data/products.json");
const s = buf.toString("utf8");
const i = s.indexOf("moochie-pat");
console.log("index", i);
console.log("context:", JSON.stringify(s.slice(i, i + 60)));
console.log("hex:", buf.slice(i, i + 30).toString("hex"));
const re = /"slug": "([^"]+)"/g;
const slugs = [];
let m;
while ((m = re.exec(s))) slugs.push(m[1]);
console.log("total slugs", slugs.length);
const weird = slugs.filter((sl) => !/^[a-z0-9-]+$/i.test(sl));
console.log("weird slugs", weird.length);
weird.forEach((w) =>
  console.log("  ", JSON.stringify(w), w.split("").map((c) => c.codePointAt(0).toString(16)).join(" "))
);
