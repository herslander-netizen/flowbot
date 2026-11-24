// Comportamentos de interface compartilhados por todos os módulos do FlowBot.
import { icone } from "./icones.mjs";

export function html(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export const formatar = {
  numero: (n) => new Intl.NumberFormat("pt-BR").format(n),
  percentual: (f) => new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 }).format(f),
  data: (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
  hora: (data) => data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
};

// ── Avisos (toasts): um tom só, saem sozinhos depois de 4,5 s ──
let pilha = null;
export function aviso(texto, { tipo = "info", acao = null, duracao = 4500 } = {}) {
  if (!pilha) {
    pilha = document.createElement("div");
    pilha.className = "toasts";
    pilha.setAttribute("role", "status");
    pilha.setAttribute("aria-live", "polite");
    document.body.appendChild(pilha);
  }
  const item = document.createElement("div");
  item.className = "toast" + (tipo === "info" ? "" : " toast--" + tipo);
  const nomeIcone = { success: "ok", danger: "alerta", info: "info" }[tipo] ?? "info";
  item.innerHTML = icone(nomeIcone) + "<span>" + html(texto) + "</span>";
  if (acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "toast__action";
    botao.textContent = acao.rotulo;
    botao.addEventListener("click", () => { acao.executar(); item.remove(); });
    item.appendChild(botao);
  }
  pilha.appendChild(item);
  while (pilha.children.length > 3) pilha.firstElementChild.remove();
  setTimeout(() => item.remove(), duracao);
}

// ── Foco preso dentro de gavetas e modais, devolvido ao fechar ──
const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
export function prenderFoco(container) {
  const aoTeclar = (evento) => {
    if (evento.key !== "Tab") return;
    const itens = [...container.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null);
    if (!itens.length) return;
    const primeiro = itens[0]; const ultimo = itens[itens.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
    else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
  };
  container.addEventListener("keydown", aoTeclar);
  return () => container.removeEventListener("keydown", aoTeclar);
}

// ── Tema: escuro é o padrão da marca; a escolha fica neste navegador ──
const CHAVE_TEMA = "flowbot-tema";
export function temaAtual() {
  try { return localStorage.getItem(CHAVE_TEMA) === "light" ? "light" : "dark"; } catch { return "dark"; }
}
export function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "light" ? "#FAFAF8" : "#0B0B0B");
  try { localStorage.setItem(CHAVE_TEMA, tema); } catch { /* sem armazenamento: segue só nesta visita */ }
}

// ── Menu suspenso: abre e fecha por botão com aria-expanded ──
export function alternarMenu(botao, aberto) {
  const menu = document.getElementById(botao.getAttribute("aria-controls"));
  if (!menu) return;
  const abrir = aberto ?? botao.getAttribute("aria-expanded") !== "true";
  botao.setAttribute("aria-expanded", String(abrir));
  menu.hidden = !abrir;
  if (abrir) menu.querySelector(".menu__item")?.focus();
}
export function fecharMenus(excecao = null) {
  document.querySelectorAll('[aria-haspopup="menu"][aria-expanded="true"]').forEach((b) => {
    if (b !== excecao) alternarMenu(b, false);
  });
}
