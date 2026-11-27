import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

// Pages publica somente os arquivos estáticos listados aqui.
// Não incluir server/, functions/, db/, docs/, tests/, .github/ ou segredos.
const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const entries = ["index.html", "design-system.html", "manifest.webmanifest", "assets", "src", "landing", "estudio", "whatsapp.html"];
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const name of entries) {
  const path = join(root, name);
  if (!existsSync(path)) throw new Error("Arquivo público não encontrado: " + name);
  cpSync(path, join(dist, name), { recursive: true });
}
console.log("FlowBot Pages: arquivos públicos copiados para dist/.");
