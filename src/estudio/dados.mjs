// Camada de acesso a dados do Bot Studio. A interface só fala com uma "fonte"; hoje a única fonte é a de
// demonstração. Quando o motor tiver um endpoint autenticado (gate 4 de docs/BOT_STUDIO_OFFLINE_D1.md,
// PR #18 do flow-bot), basta criar outra fonte com os mesmos métodos — nenhuma tela muda.
//
// O que já é real: o formato de entrada e saída da ponte offline do motor (`avaliarRascunhoStudio`,
// `packages/server/bin/studio-offline.mjs`). A interface monta a entrada exata e lê a saída exata, para o
// operador rodar a avaliação oficial na máquina dele e importar o resultado. Nada aqui inventa endpoint.
import {
  versaoPublicada, resultadoDeExemplo, historicoDeExemplo, botsDeExemplo, perfilDeExemplo, cenariosDeExemplo,
  briefingDeExemplo, NEGOCIO_FICTICIO,
} from "./demonstracao.mjs";

/* ── Contrato da ponte offline (PR #18 do motor) ─────────────────────────── */
export const LIMITES_DA_PONTE = { bytes: 1024 * 1024, cenarios: 20, passosPorCenario: 20 };

export const ERROS_DA_PONTE = {
  entrada_invalida: "O arquivo de entrada não é um JSON válido ou passa de 1 MiB.",
  perfil_invalido: "O perfil de realidade não segue o formato do motor.",
  fluxo_invalido: "O motor recusou o rascunho. Veja os problemas apontados.",
  somente_rascunho: "Só rascunhos podem ser avaliados (flow.status = draft).",
  base_invalida: "A versão base é inválida ou é de outro fluxo.",
  cenarios_invalidos: "Os cenários não seguem o formato do motor ou passam do limite (20 × 20).",
  simulacao_falhou: "O simulador do motor falhou ao rodar os cenários.",
};

// Monta exatamente { draft, base?, scenarios, perfil? }. Devolve { entrada } ou { erro }.
export function montarEntradaDaPonte({ rascunho, base = null, cenarios, perfil = null }) {
  if (rascunho?.flow?.status !== "draft") return { erro: ERROS_DA_PONTE.somente_rascunho };
  const lista = cenarios?.scenarios ?? [];
  if (!lista.length || lista.length > LIMITES_DA_PONTE.cenarios || lista.some((c) => (c.steps ?? []).length > LIMITES_DA_PONTE.passosPorCenario)) {
    return { erro: ERROS_DA_PONTE.cenarios_invalidos };
  }
  const entrada = { draft: rascunho, scenarios: { scenarios: lista } };
  if (base) entrada.base = base;
  if (perfil) entrada.perfil = perfil;
  const tamanho = new TextEncoder().encode(JSON.stringify(entrada)).length;
  if (tamanho > LIMITES_DA_PONTE.bytes) return { erro: ERROS_DA_PONTE.entrada_invalida };
  return { entrada, tamanho };
}

// Lê a saída de studio-offline.mjs. Recusa qualquer coisa fora do formato em vez de adivinhar.
export function lerSaidaDaPonte(texto) {
  let s;
  try { s = typeof texto === "string" ? JSON.parse(texto) : texto; } catch { return { valido: false, motivo: "Não é um JSON." }; }
  if (!s || typeof s !== "object" || typeof s.ok !== "boolean") return { valido: false, motivo: "Falta o campo ok." };
  if (s.approved !== false || s.published !== false) return { valido: false, motivo: "A saída da ponte sempre traz approved:false e published:false." };
  if (!s.ok) {
    if (!(s.error in ERROS_DA_PONTE)) return { valido: false, motivo: "Código de erro desconhecido: " + String(s.error) };
    return { valido: true, ok: false, erro: s.error, mensagem: ERROS_DA_PONTE[s.error], problemas: Array.isArray(s.problems) ? s.problems : [] };
  }
  if (!Array.isArray(s.reports) || typeof s.scenariosPassed !== "boolean") return { valido: false, motivo: "Faltam reports ou scenariosPassed." };
  const relatorios = s.reports.map((r) => ({
    nome: String(r.name ?? ""),
    ok: r.ok === true,
    passos: (r.passos ?? []).map((p) => ({ entrada: String(p.entrada ?? ""), saidas: (p.saidas ?? []).map(String), status: String(p.status ?? ""), motivo: String(p.motivo ?? ""), falhas: (p.falhas ?? []).map(String) })),
  }));
  const diff = Array.isArray(s.diff) ? s.diff.map((d) => ({ caminho: String(d.path), antes: d.before, depois: d.after })) : null;
  return { valido: true, ok: true, modo: s.mode, relatorios, diff, cenariosOk: s.scenariosPassed };
}

/* ── Fonte de demonstração ───────────────────────────────────────────────── */
// Mesmos métodos que uma fonte real terá. `estado` diz à interface como mostrar a conexão.
export function criarFonteDeDemonstracao() {
  return {
    tipo: "demonstracao",
    estado: "demonstracao",
    descricao: "Dados fictícios no navegador. Motor, WhatsApp e oficina com Claude não estão conectados.",
    async carregarEspaco() {
      return {
        negocio: NEGOCIO_FICTICIO,
        bots: botsDeExemplo.map((b) => ({ ...b })),
        publicada: versaoPublicada(),
        historico: historicoDeExemplo.map((h) => ({ ...h })),
        perfil: structuredClone(perfilDeExemplo),
        cenarios: structuredClone(cenariosDeExemplo),
        briefing: briefingDeExemplo,
      };
    },
    // A oficina com Claude não existe como serviço; a demonstração só devolve o exemplo fixo.
    async resultadoDeExemplo() { return resultadoDeExemplo(); },
    // Operações que dependem do motor: nesta fonte respondem "indisponível", nunca sucesso falso.
    async salvarRascunho() { return { ok: false, estado: "indisponivel" }; },
    async publicar() { return { ok: false, estado: "indisponivel" }; },
    async pedirProposta() { return { ok: false, estado: "indisponivel" }; },
  };
}
