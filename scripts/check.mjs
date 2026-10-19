import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const DIST = "dist";
const files = [];
(function walk(d){ for (const e of readdirSync(d)) { const p = join(d,e); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(DIST);
const htmls = files.filter(f => f.endsWith(".html"));
const resolve = (href) => {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || clean.startsWith("http") || clean.startsWith("mailto:") || clean.startsWith("data:")) return true;
  const asFile = join(DIST, clean);
  if (existsSync(asFile) && !statSync(asFile).isDirectory()) return true;
  if (existsSync(join(asFile, "index.html"))) return true;
  return false;
};
const broken = [];
const seen = new Set();
for (const f of htmls) {
  const html = readFileSync(f, "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (!resolve(href)) { const k = f + " -> " + href; if (!seen.has(k)) { seen.add(k); broken.push(k); } }
  }
}
console.log("HTML files checked:", htmls.length);
console.log("Broken internal links/assets:", broken.length);
broken.slice(0, 25).forEach(b => console.log("  " + b));
// missing alt
let noAlt = 0, imgs = 0;
for (const f of htmls) { const h = readFileSync(f,"utf8"); for (const m of h.matchAll(/<img\b[^>]*>/g)) { imgs++; if (!/\balt=/.test(m[0])) noAlt++; } }
console.log(`Images: ${imgs}, missing alt: ${noAlt}`);
