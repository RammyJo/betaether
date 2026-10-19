import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "dist");
const PORT = process.env.PORT || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const candidates = [join(DIST, clean)];
  if (!extname(clean)) candidates.push(join(DIST, clean, "index.html"));
  for (const c of candidates) {
    try {
      const s = await stat(c);
      if (s.isDirectory()) continue;
      return c;
    } catch { /* keep looking */ }
  }
  return null;
}

createServer(async (req, res) => {
  let file = await resolve(req.url || "/");
  let status = 200;
  if (!file) { file = join(DIST, "404.html"); status = 404; }
  try {
    const data = await readFile(file);
    res.writeHead(status, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(500).end("Server error");
  }
}).listen(PORT, () => {
  console.log(`Adventures of Pebbles running at http://localhost:${PORT}`);
});
