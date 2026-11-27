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

// ── Estados operacionais (ver assets/components.css: .op-state e .state-block) ──
// Textos padrão; cada tela pode trocar o texto, mas não inventar estados novos.
export const ESTADOS = {
  conectado: { icone: "ok", texto: "Conectado" },
  desconectado: { icone: "nuvemoff", texto: "Não conectado" },
  demonstracao: { icone: "info", texto: "Demonstração" },
  carregando: { icone: "relogio", texto: "Carregando" },
  salvando: { icone: "relogio", texto: "Salvando" },
  "nao-salvo": { icone: "alerta", texto: "Alterações não salvas" },
  conflito: { icone: "alerta", texto: "Conflito de versão" },
  validacao: { icone: "alerta", texto: "Precisa de correção" },
  permissao: { icone: "cadeado", texto: "Sem permissão" },
  indisponivel: { icone: "nuvemoff", texto: "Serviço indisponível" },
  erro: { icone: "alerta", texto: "Erro" },
  vazio: { icone: "info", texto: "Sem dados" },
};
export function estadoOperacional(estado, texto) {
  const e = ESTADOS[estado] ?? ESTADOS.vazio;
  return `<span class="op-state" data-estado="${estado}">${html(texto ?? e.texto)}</span>`;
}
export function blocoDeEstado({ estado = "vazio", titulo, texto = "", acao = "" }) {
  const e = ESTADOS[estado] ?? ESTADOS.vazio;
  return `<div class="state-block" data-estado="${estado}" role="${["erro", "conflito", "permissao"].includes(estado) ? "alert" : "status"}">${icone(e.icone)}<p class="state-block__title">${html(titulo ?? e.texto)}</p>${texto ? `<p class="state-block__text">${html(texto)}</p>` : ""}${acao}</div>`;
}

// ── Folha inferior (celular): arrastar a alça ou o cabeçalho para baixo fecha, como nos apps nativos ──
export function ligarArrasteDaFolha(gaveta, fechar) {
  if (!gaveta || matchMedia("(min-width: 768px)").matches) return;
  const alvos = [gaveta.querySelector(".drawer__grab"), gaveta.querySelector(".drawer__head")].filter(Boolean);
  let inicio = null;
  const mover = (e) => { if (!inicio) return; const dy = Math.max(0, e.clientY - inicio.y); gaveta.style.transform = `translateY(${dy}px)`; inicio.dy = dy; };
  const soltar = () => {
    if (!inicio) return; const { dy, t } = inicio; inicio = null;
    gaveta.style.transition = "transform var(--duration-base) var(--ease-out)";
    const rapido = dy / Math.max(1, Date.now() - t) > 0.6;
    if (dy > 90 || (rapido && dy > 30)) { gaveta.style.transform = "translateY(100%)"; setTimeout(fechar, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180); }
    else { gaveta.style.transform = ""; setTimeout(() => { gaveta.style.transition = ""; }, 220); }
  };
  for (const a of alvos) {
    a.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, a, input, select, textarea")) return;
      inicio = { y: e.clientY, dy: 0, t: Date.now() }; gaveta.style.transition = "none";
      try { a.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
    });
    a.addEventListener("pointermove", mover); a.addEventListener("pointerup", soltar); a.addEventListener("pointercancel", soltar);
  }
}

// ── Teclado virtual: marca o body para esconder barras fixas e dar espaço ao campo ──
export function observarTeclado() {
  window.visualViewport?.addEventListener("resize", () => {
    document.body.classList.toggle("teclado", innerHeight - visualViewport.height > 150);
  });
}
