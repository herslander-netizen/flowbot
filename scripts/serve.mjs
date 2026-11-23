import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};
const porta = Number(process.env.PORT || 4173);

const servidor = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405); res.end(); return;
  }
  let caminho;
  try { caminho = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const arquivo = resolve(join(raiz, caminho === "/" ? "index.html" : "." + caminho));
  if (arquivo !== raiz && !arquivo.startsWith(raiz + sep)) {
    res.writeHead(403); res.end(); return;
  }
  // Não servir arquivos internos de desenvolvimento / repositório.
  if (caminho.includes("/.") || caminho.startsWith("/tests/") ||
    caminho.startsWith("/scripts/") || caminho.startsWith("/docs/") ||
    caminho.startsWith("/db/") || caminho === "/package.json") {
    res.writeHead(404); res.end(); return;
  }
  try {
    if (!(await stat(arquivo)).isFile()) throw new Error("not a file");
    const corpo = await readFile(arquivo);
    res.writeHead(200, {
      "content-type": tipos[extname(arquivo)] ?? "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "content-security-policy": "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    });
    res.end(req.method === "HEAD" ? undefined : corpo);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Não encontrado");
  }
});
servidor.listen(porta, "127.0.0.1", () =>
  process.stdout.write("FlowBot Prospecção: http://127.0.0.1:" + porta + "\n"));