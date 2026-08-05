import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "src", "data");
const ASSETS = path.join(__dirname, "..", "public", "assets");

const load = async (f) => JSON.parse(await readFile(path.join(DATA, f), "utf8"));

const urlToFile = (url) => {
  const u = url.split("?")[0];
  const ext = (u.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const h = createHash("md5").update(url).digest("hex").slice(0, 12);
  return `${h}.${ext}`;
};

const collect = async () => {
  const urls = [];
  const seen = new Set();
  const add = (u) => {
    if (typeof u === "string" && u.startsWith("http") && !seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  };

  const walk = (v) => {
    if (typeof v === "string") {
      if (v.includes("tapcom-live.ams3.cdn.digitaloceanspaces.com")) {
        add(v);
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (v && typeof v === "object") {
      for (const k of Object.values(v)) walk(k);
    }
  };

  for (const f of ["store.json", "categories.json", "products.json", "delivery.json"]) {
    walk(await load(f));
  }

  return urls;
};

const download = async (url, file) => {
  const dest = path.join(ASSETS, file);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
};

await mkdir(ASSETS, { recursive: true });

let manifest = {};
try {
  manifest = JSON.parse(await readFile(path.join(ASSETS, "manifest.json"), "utf8"));
} catch {}

const urls = await collect();
console.log(`unique images: ${urls.length}`);

let ok = 0, fail = 0;
const queue = [...urls];
const workers = Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const url = queue.shift();
    const file = urlToFile(url);
    if (manifest[url]) {
      ok += 1;
      continue;
    }
    try {
      await download(url, file);
      manifest[url] = `/assets/${file}`;
      ok += 1;
    } catch (e) {
      fail += 1;
      console.log(`  FAIL ${url} -> ${e.message}`);
    }
    if ((ok + fail) % 100 === 0) console.log(`  ${ok + fail}/${urls.length}`);
  }
});
await Promise.all(workers);
await writeFile(path.join(ASSETS, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log(`done: ok=${ok} fail=${fail}`);

const rewrite = async (file) => {
  const p = path.join(DATA, file);
  let s = await readFile(p, "utf8");
  for (const [url, local] of Object.entries(manifest)) {
    s = s.split(url).join(local);
  }
  await writeFile(p, s);
  console.log(`rewrote ${file}`);
};

for (const f of ["store.json", "categories.json", "products.json", "delivery.json"]) {
  await rewrite(f);
}
