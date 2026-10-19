import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const DIST = "dist";
const files = [];
(function walk(d){ for (const e of readdirSync(d)) { const p = join(d,e); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(DIST);
const htmls = files.filter(f => f.endsWith(".html"));
let issues = [];
for (const f of htmls) {
  const h = readFileSync(f, "utf8");
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const desc = /<meta name="description" content="([^"]*)"/.exec(h);
  const blank = h.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];
  const lonest = blank.filter((tag) => !/rel="[^"]*noopener/.test(tag));
  if (h1 !== 1) issues.push(`${f}: h1 count = ${h1}`);
  if (title.length > 65) issues.push(`${f}: title ${title.length} chars`);
  if (title.length < 12) issues.push(`${f}: title too short "${title}"`);
  if (!desc || !desc[1] || desc[1].length < 20) issues.push(`${f}: weak description`);
  if (lonest.length) issues.push(`${f}: target=_blank without noopener`);
}
console.log("Pages:", htmls.length);
console.log("Issues:", issues.length);
issues.forEach(i => console.log("  " + i));
