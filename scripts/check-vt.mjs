import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
})("dist");

const htmls = files.filter((f) => f.endsWith(".html"));
let dupes = 0;
let pagesWithNames = 0;
let total = 0;

for (const f of htmls) {
  const h = readFileSync(f, "utf8");
  const names = [...h.matchAll(/view-transition-name:\s*([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
  total += names.length;
  if (names.length) pagesWithNames++;
  const seen = new Map();
  for (const n of names) seen.set(n, (seen.get(n) || 0) + 1);
  const d = [...seen.entries()].filter(([, c]) => c > 1);
  if (d.length) {
    dupes++;
    console.log(`DUPLICATE in ${f}: ${d.map(([n, c]) => `${n} x${c}`).join(", ")}`);
  }
}

console.log(`pages: ${htmls.length}, with transition names: ${pagesWithNames}, names total: ${total}`);
console.log(dupes === 0 ? "PASS  no duplicate view-transition-name anywhere" : `FAIL  ${dupes} page(s) with duplicates`);
