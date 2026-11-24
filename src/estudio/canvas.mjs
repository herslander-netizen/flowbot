// Canvas do editor (computador): passos em colunas, ligações, zoom, panorâmica e enquadramento.
// Só transform no palco: arrastar e dar zoom não recalcula layout.
import { TIPOS, PAPEIS, PORTAS_DE_ERRO, nomeDaPorta, resumoDoNo } from "./catalogo.mjs";
import { organizarFluxo } from "./fluxo.mjs";
import { personagem, papelDo } from "./personagens.mjs";
import { html } from "../ui/componentes.mjs";
import { icone } from "../ui/icones.mjs";

export const NO_L = 216; export const NO_A = 88; const COL = 288; const LIN = 120; const MARGEM = 40;
const ZOOM_MIN = 0.2; const ZOOM_MAX = 1.6;
const vista = { x: 0, y: 0, z: 1, enquadrada: false };

function posicoes(doc) {
  const org = organizarFluxo(doc);
  const pos = new Map();
  for (const no of doc.nodes) pos.set(no.id, { x: MARGEM + org.coluna.get(no.id) * COL, y: MARGEM + 40 + org.linha.get(no.id) * LIN });
  return { pos, largura: MARGEM * 2 + org.colunas * COL - (COL - NO_L), altura: MARGEM * 2 + 40 + org.linhasMax * LIN - (LIN - NO_A) };
}

export function desenharCanvas(doc, { selecionado, avisosPorNo, atual = null }) {
  const { pos, largura, altura } = posicoes(doc);
  const ligadas = new Set(selecionado ? doc.edges.filter((e) => e.from === selecionado || e.to === selecionado).map((e) => e.id) : []);
  // Modo foco: com um passo selecionado, o que não se liga a ele fica em segundo plano.
  const vizinhos = new Set(selecionado ? [selecionado, ...doc.edges.filter((e) => e.from === selecionado).map((e) => e.to), ...doc.edges.filter((e) => e.to === selecionado).map((e) => e.from)] : []);
  const goto = selecionado && doc.nodes.find((n) => n.id === selecionado && n.type === "logic.goto"); if (goto) vizinhos.add(goto.config.target);
  let arestas = ""; let rotulos = "";
  const porOrigem = new Map();
  for (const e of doc.edges) porOrigem.set(e.from, [...(porOrigem.get(e.from) ?? []), e]);
  for (const [origem, lista] of porOrigem) {
    const a = pos.get(origem); if (!a) continue;
    lista.forEach((e, i) => {
      const b = pos.get(e.to); if (!b) return;
      const y1 = a.y + NO_A / 2 + (i - (lista.length - 1) / 2) * 14;
      const x1 = a.x + NO_L; const x2 = b.x; const y2 = b.y + NO_A / 2;
      const meio = Math.max(40, (x2 - x1) / 2);
      const d = `M${x1},${y1} C${x1 + meio},${y1} ${x2 - meio},${y2} ${x2},${y2}`;
      const classe = "edge" + (PORTAS_DE_ERRO.has(e.port) ? " edge--error" : "") + (ligadas.has(e.id) ? " edge--active" : selecionado ? " edge--dim" : "");
      arestas += `<path d="${d}" class="${classe}" marker-end="url(#seta)"/>`;
      if (lista.length > 1 || e.port !== "next") rotulos += `<span class="edge-tag${PORTAS_DE_ERRO.has(e.port) ? " edge-tag--error" : ""}${ligadas.has(e.id) ? " edge-tag--active" : ""}" style="left:${x1 + 8}px;top:${y1 - 9}px">${html(nomeDaPorta(e.port))}</span>`;
    });
  }
  // Retornos ("voltar para"): arco tracejado por cima, para não confundir com o caminho normal.
  for (const no of doc.nodes.filter((n) => n.type === "logic.goto")) {
    const a = pos.get(no.id); const b = pos.get(no.config?.target); if (!a || !b) continue;
    const x1 = a.x + NO_L / 2; const x2 = b.x + NO_L / 2; const topo = Math.min(a.y, b.y) - 34;
    arestas += `<path d="M${x1},${a.y} C${x1},${topo} ${x2},${topo} ${x2},${b.y}" class="edge edge--return${selecionado === no.id ? " edge--active" : ""}" marker-end="url(#seta-retorno)"/>`;
    rotulos += `<span class="edge-tag edge-tag--return" style="left:${(x1 + x2) / 2 - 40}px;top:${topo + 4}px">${icone("retorno", "icon icon--xs")}volta até ${no.config.maxVisits}×</span>`;
  }
  const nos = doc.nodes.map((no) => {
    const p = pos.get(no.id); const papel = papelDo(no); const avisos = avisosPorNo.get(no.id)?.length ?? 0;
    const tipo = TIPOS[no.type];
    return `<button type="button" class="node node--canvas${avisos ? " node--warn" : ""}${atual === no.id ? " node--live" : ""}${selecionado && !vizinhos.has(no.id) ? " node--dim" : ""}" data-no="${html(no.id)}" ${selecionado === no.id ? 'aria-pressed="true"' : 'aria-pressed="false"'} style="--papel:${PAPEIS[papel].cor};transform:translate(${p.x}px,${p.y}px)" aria-label="${html((tipo?.rotulo ?? no.type) + ": " + no.id + (avisos ? ", " + avisos + " aviso(s)" : ""))}">
      <span class="node__head">${personagem(papel, 20)}<span class="node__type">${html(tipo?.rotulo ?? no.type)}</span>${avisos ? icone("alerta", "icon icon--sm node__warn") : ""}${no.id === doc.flow.entryNodeId ? '<span class="node__entry">entrada</span>' : ""}</span>
      <span class="node__id">${html(no.id)}</span>
      <span class="node__text">${html(resumoDoNo(no))}</span>
    </button>`;
  }).join("");
  return `<div class="canvas" id="canvas" tabindex="0" role="application" aria-roledescription="mapa do fluxo" aria-label="Mapa do fluxo. Arraste para mover, Ctrl e roda do mouse ou + e − para zoom, F para enquadrar.">
    <div class="canvas__stage" id="palco" style="width:${largura}px;height:${altura}px" data-largura="${largura}" data-altura="${altura}">
      <svg class="canvas__edges" width="${largura}" height="${altura}" aria-hidden="true">
        <defs>
          <marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="edge__arrow"/></marker>
          <marker id="seta-retorno" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="edge__arrow edge__arrow--return"/></marker>
        </defs>
        ${arestas}
      </svg>
      <div class="canvas__tags" aria-hidden="true">${rotulos}</div>
      ${nos}
    </div>
  </div>
  ${doc.nodes.length > 14 ? minimapa(doc, pos, largura, altura, selecionado, avisosPorNo) : ""}
  <div class="canvas__controls" role="toolbar" aria-label="Zoom do mapa">
    <button type="button" class="btn btn--ghost btn--icon btn--sm" data-zoom="-1" aria-label="Diminuir zoom">${icone("menos")}</button>
    <span class="canvas__zoom" id="zoom-valor" aria-live="polite">100%</span>
    <button type="button" class="btn btn--ghost btn--icon btn--sm" data-zoom="1" aria-label="Aumentar zoom">${icone("mais")}</button>
    <span class="canvas__sep" aria-hidden="true"></span>
    <button type="button" class="btn btn--ghost btn--icon btn--sm" data-zoom="fit" aria-label="Enquadrar o fluxo inteiro" data-tip="Enquadrar (F)">${icone("enquadrar")}</button>
  </div>`;
}

// Minimapa: só aparece em fluxos maiores, onde ajuda a se localizar. Clique leva para o ponto.
const MINI = 168;
function minimapa(doc, pos, largura, altura, selecionado, avisosPorNo) {
  // Fluxos muito largos ganham um minimapa mais alto para continuar clicável.
  const esc = Math.max(MINI / Math.max(largura, altura * 1.6), 40 / altura);
  const w = Math.min(Math.round(largura * esc), 260); const h = Math.round(altura * esc);
  const rets = doc.nodes.map((n) => { const p = pos.get(n.id); return `<rect x="${(p.x * esc).toFixed(1)}" y="${(p.y * esc).toFixed(1)}" width="${(NO_L * esc).toFixed(1)}" height="${(NO_A * esc).toFixed(1)}" rx="1.5" class="mini__node${n.id === selecionado ? " is-sel" : ""}${avisosPorNo.get(n.id)?.length ? " is-warn" : ""}"/>`; }).join("");
  return `<div class="canvas__mini" id="minimapa" data-escala="${esc}" aria-label="Minimapa: clique para ir a uma parte do fluxo" role="img"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rets}<rect id="mini-vista" class="mini__view" x="0" y="0" width="0" height="0"/></svg></div>`;
}
function atualizarMinimapa() {
  const mini = document.getElementById("minimapa"); const tela = document.getElementById("canvas"); if (!mini || !tela) return;
  const esc = Number(mini.dataset.escala); const r = document.getElementById("mini-vista");
  r.setAttribute("x", (-vista.x / vista.z * esc).toFixed(1)); r.setAttribute("y", (-vista.y / vista.z * esc).toFixed(1));
  r.setAttribute("width", (tela.clientWidth / vista.z * esc).toFixed(1)); r.setAttribute("height", (tela.clientHeight / vista.z * esc).toFixed(1));
}

function aplicar() {
  const palco = document.getElementById("palco"); if (!palco) return;
  palco.style.transform = `translate(${vista.x}px, ${vista.y}px) scale(${vista.z})`;
  const v = document.getElementById("zoom-valor"); if (v) v.textContent = Math.round(vista.z * 100) + "%";
  atualizarMinimapa();
}

// Primeira vista: legível (zoom mínimo de 80%) e começando pela entrada, à esquerda.
function vistaInicial() {
  const tela = document.getElementById("canvas"); const palco = document.getElementById("palco"); if (!tela || !palco) return;
  const w = Number(palco.dataset.largura); const h = Number(palco.dataset.altura);
  const z = Math.min(1, Math.max(0.8, Math.min((tela.clientWidth - 24) / w, (tela.clientHeight - 24) / h)));
  vista.z = z; vista.x = w * z < tela.clientWidth ? (tela.clientWidth - w * z) / 2 : 12; vista.y = Math.max(12, (tela.clientHeight - h * z) / 2); vista.enquadrada = true;
  aplicar();
}
export function enquadrar() {
  const tela = document.getElementById("canvas"); const palco = document.getElementById("palco"); if (!tela || !palco) return;
  const w = Number(palco.dataset.largura); const h = Number(palco.dataset.altura);
  const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min((tela.clientWidth - 24) / w, (tela.clientHeight - 24) / h)));
  vista.z = z; vista.x = (tela.clientWidth - w * z) / 2; vista.y = (tela.clientHeight - h * z) / 2; vista.enquadrada = true;
  aplicar();
}
export function zoom(fator, cx, cy) {
  const tela = document.getElementById("canvas"); if (!tela) return;
  const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, vista.z * fator));
  const px = cx ?? tela.clientWidth / 2; const py = cy ?? tela.clientHeight / 2;
  vista.x = px - (px - vista.x) * (z / vista.z); vista.y = py - (py - vista.y) * (z / vista.z); vista.z = z;
  aplicar();
}
export function mover(dx, dy) { vista.x += dx; vista.y += dy; aplicar(); }

// Centraliza um passo sem mudar o zoom (ao selecionar pelo painel ou pela lista).
export function centralizar(id, { aproximar = false } = {}) {
  const tela = document.getElementById("canvas"); const no = tela?.querySelector(`.node[data-no="${CSS.escape(id)}"]`); if (!no) return;
  const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(no.style.transform); if (!m) return;
  // Vindo da busca ou de um aviso: se o zoom estiver longe demais para ler, aproxima antes de centralizar.
  if (aproximar && vista.z < 0.8) { const cx = Number(m[1]) + NO_L / 2; const cy = Number(m[2]) + NO_A / 2; vista.z = 0.8; vista.x = tela.clientWidth / 2 - cx * vista.z; vista.y = tela.clientHeight / 2 - cy * vista.z; aplicar(); return; }
  const x = Number(m[1]) * vista.z + vista.x; const y = Number(m[2]) * vista.z + vista.y;
  const fora = x < 0 || y < 0 || x + NO_L * vista.z > tela.clientWidth || y + NO_A * vista.z > tela.clientHeight;
  if (fora) { vista.x += tela.clientWidth / 2 - (x + NO_L * vista.z / 2); vista.y += tela.clientHeight / 2 - (y + NO_A * vista.z / 2); aplicar(); }
}

// Liga os gestos ao canvas recém-desenhado. Devolve true se um arrasto acabou de acontecer (para ignorar o clique).
let arrastou = false;
export const acabouDeArrastar = () => { const a = arrastou; arrastou = false; return a; };
export function ligarCanvas() {
  const tela = document.getElementById("canvas"); if (!tela) return;
  if (!vista.enquadrada) vistaInicial(); else aplicar();
  const ponteiros = new Map(); let inicio = null; let pinca = null;
  tela.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (!ponteiros.size) arrastou = false;
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.size === 1) { inicio = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y, moveu: false }; }
    if (ponteiros.size === 2) { const [a, b] = [...ponteiros.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), z: vista.z }; }
  });
  tela.addEventListener("pointermove", (e) => {
    if (!ponteiros.has(e.pointerId)) return;
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.size === 2 && pinca) {
      const [a, b] = [...ponteiros.values()]; const r = tela.getBoundingClientRect();
      const fator = (pinca.z * Math.hypot(a.x - b.x, a.y - b.y) / pinca.d) / vista.z;
      zoom(fator, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); arrastou = true; return;
    }
    if (!inicio) return;
    const dx = e.clientX - inicio.x; const dy = e.clientY - inicio.y;
    if (!inicio.moveu && Math.hypot(dx, dy) < 5) return;
    if (!inicio.moveu) { inicio.moveu = true; tela.setPointerCapture(e.pointerId); tela.classList.add("is-panning"); }
    vista.x = inicio.vx + dx; vista.y = inicio.vy + dy; aplicar();
  });
  const soltar = (e) => {
    ponteiros.delete(e.pointerId);
    if (inicio?.moveu) arrastou = true;
    if (ponteiros.size < 2) pinca = null;
    if (!ponteiros.size) { inicio = null; tela.classList.remove("is-panning"); }
  };
  document.getElementById("minimapa")?.addEventListener("click", (e) => {
    const mini = e.currentTarget; const esc = Number(mini.dataset.escala); const r = mini.querySelector("svg").getBoundingClientRect();
    const x = (e.clientX - r.left) / esc; const y = (e.clientY - r.top) / esc;
    vista.x = tela.clientWidth / 2 - x * vista.z; vista.y = tela.clientHeight / 2 - y * vista.z; aplicar();
  });
  tela.addEventListener("pointerup", soltar); tela.addEventListener("pointercancel", soltar);
  tela.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = tela.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoom(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
    else mover(-e.deltaX, -e.deltaY);
  }, { passive: false });
  tela.addEventListener("keydown", (e) => {
    if (e.target !== tela) return;
    const passo = 48;
    const mapa = { ArrowLeft: () => mover(passo, 0), ArrowRight: () => mover(-passo, 0), ArrowUp: () => mover(0, passo), ArrowDown: () => mover(0, -passo),
      "+": () => zoom(1.2), "=": () => zoom(1.2), "-": () => zoom(1 / 1.2), f: enquadrar, F: enquadrar, "0": enquadrar };
    if (mapa[e.key]) { e.preventDefault(); mapa[e.key](); }
  });
}
export function reiniciarVista() { vista.enquadrada = false; }
