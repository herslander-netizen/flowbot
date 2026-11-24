// Personagens da identidade (docs/identidade/agentes.md), em acabamento liso, para usar em tamanho pequeno.
import { PAPEIS, TIPOS } from "./catalogo.mjs";
import { icone } from "../ui/icones.mjs";

function bracos(n, l) { let d = ""; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; d += `M50,52 L${(50 + l * Math.cos(a)).toFixed(1)},${(52 + l * Math.sin(a)).toFixed(1)} `; } return d; }
function estrela() { let q = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 20 : 42; q += (i ? "L" : "M") + (50 + r * Math.cos(a)).toFixed(1) + "," + (54 + r * Math.sin(a)).toFixed(1); } return q + "Z"; }
const FORMAS = {
  flowbot: (c) => `<path d="${bracos(6, 34)}" stroke="${c}" stroke-width="28" stroke-linecap="round" fill="none"/><circle cx="50" cy="52" r="27" fill="${c}"/>`,
  recepcionista: (c) => `<path d="M12,48C12,25 29,11 50,11C71,11 88,25 88,48C88,70 71,83 50,83C44,83 38,82 33,80L17,90L21,71C15,65 12,57 12,48Z" fill="${c}"/>`,
  qualificador: (c) => `<path d="${estrela()}" fill="${c}" stroke="${c}" stroke-width="12" stroke-linejoin="round"/>`,
  passador: (c) => `<path d="M12,50 L88,18 L64,86 L48,60 Z" fill="${c}" stroke="${c}" stroke-width="12" stroke-linejoin="round"/>`,
  guardiao: (c) => `<path d="M50,86 C20,64 12,48 16,34 C20,20 38,16 50,30 C62,16 80,20 84,34 C88,48 80,64 50,86 Z" fill="${c}" stroke="${c}" stroke-width="10" stroke-linejoin="round"/>`,
};
const OLHOS = { flowbot: [50, "#fff"], recepcionista: [46, "#0B0B0B"], qualificador: [54, "#0B0B0B"], passador: [46, "#0B0B0B"], guardiao: [46, "#fff"] };

// contente: olhos em arco (concluído); apagado: olhos retos (sem conexão). Ver agentes.md, "Olhos".
export function personagem(papel, tamanho = 28, { olhar = "atento" } = {}) {
  const [y, cor] = OLHOS[papel] ?? OLHOS.flowbot;
  const olhos = olhar === "apagado"
    ? `<path d="M37,${y} h8 M55,${y} h8" stroke="${cor}" stroke-width="4" stroke-linecap="round"/>`
    : `<circle cx="41" cy="${y}" r="4.8" fill="${cor}"/><circle cx="59" cy="${y}" r="4.8" fill="${cor}"/>`;
  return `<svg class="persona" width="${tamanho}" height="${tamanho}" viewBox="0 0 100 100" aria-hidden="true">${(FORMAS[papel] ?? FORMAS.flowbot)(PAPEIS[papel]?.cor ?? PAPEIS.flowbot.cor)}${olhos}</svg>`;
}
export const papelDo = (no) => TIPOS[no?.type]?.papel ?? "flowbot";

// Agentes da oficina não são personagens: usam um ícone do tipo (código, Claude, pessoa).
export function marcaDoAgente(tipo) {
  const nome = { codigo: "engrenagem", ia: "faisca", pessoa: "check" }[tipo] ?? "info";
  return `<span class="agent-mark" data-tipo="${tipo}" aria-hidden="true">${icone(nome)}</span>`;
}
