// Teste de contraste: rode com o servidor ligado (npm run dev).
// Mede o contraste de todo texto visível contra o fundo opaco mais próximo (WCAG 2.1).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.FLOWBOT_URL ?? "http://127.0.0.1:4173/";
(async () => { const b = await chromium.launch(); const ruins = [];
 for (const tema of ["dark","light"]) for (const [url, prep] of [["", null], ["whatsapp.html", null], ["landing/", null], ["estudio/#agentes", null], ["estudio/#fluxo", "passos"], ["estudio/#oficina", "oficina"], ["estudio/#simulador", "sim"], ["estudio/#versoes", null]]) {
  const c = await b.newContext({ viewport:{width:1280,height:900} }); await c.addInitScript(t => localStorage.setItem("flowbot-tema", t), tema);
  const p = await c.newPage(); await p.goto(BASE + url, {waitUntil:"networkidle"}); await p.waitForTimeout(400);
  // Landing: rola a página inteira para acender as frases que aparecem com a rolagem, como a pessoa vê.
  if (url.startsWith("landing")) { for (let y = 0; y < 20000; y += 400) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(60); } await p.waitForTimeout(1200); }
  if (prep==="passos") await p.click('[data-vista="passos"]');
  if (prep==="oficina") { await p.click('[data-acao="exemplo-oficina"]'); await p.waitForTimeout(300); }
  if (prep==="sim") { await p.click('[data-dizer="oi"]'); await p.waitForTimeout(300); }
  const r = await p.evaluate(() => {
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) { const n = s.match(/color\(srgb ([\d. ]+)(?:\/ ([\d.]+))?\)/); if (n) { const v = n[1].trim().split(/\s+/).map(Number); return [v[0]*255,v[1]*255,v[2]*255, n[2]?Number(n[2]):1]; } return null; } const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0],v[1],v[2],v[3]??1]; };
    const lum = ([r,g,b]) => { const f = (c) => { c/=255; return c<=.03928? c/12.92 : ((c+.055)/1.055)**2.4; }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
    const fundo = (el) => { let cor = [0,0,0,0]; const camadas = []; for (let e = el; e; e = e.parentElement) { const bg = parse(getComputedStyle(e).backgroundColor); if (bg && bg[3] > 0) { camadas.push(bg); if (bg[3] >= 1) break; } } let base = [255,255,255]; if (camadas.length && camadas.at(-1)[3] >= 1) base = camadas.pop().slice(0,3); else base = document.documentElement.dataset.theme==="light"?[250,250,248]:[11,11,11]; for (const c of camadas.reverse()) base = base.map((x,i)=> c[i]*c[3] + x*(1-c[3])); return base; };
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const vistos = new Set();
    while (w.nextNode()) { const t = w.currentNode; if (!t.textContent.trim()) continue; const el = t.parentElement; if (vistos.has(el)) continue; vistos.add(el);
      if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue; if (el.closest("[aria-hidden=true], .leaflet-container, .sr-only, :disabled, [aria-disabled=true], .skip-link")) continue;
      const cs = getComputedStyle(el); if (cs.visibility === "hidden" || Number(cs.opacity) < .99) continue;
      const fg = parse(cs.color); if (!fg) continue; const bg = fundo(el); const f = fg.slice(0,3).map((x,i)=> x*fg[3] + bg[i]*(1-fg[3]));
      const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
      const grande = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (grande ? 3 : 4.5)) out.push(ratio.toFixed(2) + " " + el.tagName + "." + el.className.toString().slice(0,40) + " «" + t.textContent.trim().slice(0,30) + "»");
    } return out; });
  r.forEach(x => ruins.push(tema + " " + url + " " + x)); await c.close();
 }
 console.log(ruins.length ? ruins.join("\n") : "todos os textos visíveis passam AA"); await b.close(); process.exit(ruins.length ? 1 : 0); })();
