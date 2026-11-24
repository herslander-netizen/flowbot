// Fontes de dados do Bot Studio. Toda fonte tem os mesmos métodos, com os nomes das operações da API de
// autoria do motor (contrato.mjs). A tela não sabe de onde vêm os dados.
//
// - Demonstração: guarda revisões e aprovações em memória, NESTA ABA, com as mesmas regras do motor
//   (revisão esperada, conflito, histórico de 50, aprovação presa à revisão exata). Não é o motor.
// - Roteiro de homologação (?roteiro=...): a demonstração com respostas forçadas (conflito, sem permissão,
//   sessão expirada, indisponível, lento, fluxo extenso) para testar cada estado da tela. Sempre anunciado.
// - Real: ainda não existe. Ela chamará o BFF autenticado (nunca a API privada direto do navegador) e
//   devolverá o resultado de traduzirResposta(status, corpo).
import { versaoPublicada, resultadoDeExemplo, botsDeExemplo, perfilDeExemplo, cenariosDeExemplo, briefingDeExemplo, NEGOCIO_FICTICIO, fluxoExtenso } from "./demonstracao.mjs";
import { traduzirResposta, cenariosAprovaveis, LIMITES_DA_API } from "./contrato.mjs";
import { conferirCenarios } from "./cenarios.mjs";
import { compararVersoes } from "./fluxo.mjs";

const EU = "voce-nesta-aba";
const OUTRA = "outra-pessoa-roteiro";
export const NOMES_DE_AUTOR = { [EU]: "Você (nesta aba)", "equipe-ficticia": "Equipe (fictício)", [OUTRA]: "Outra pessoa (roteiro)" };

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// Hash de conteúdo só para a demonstração saber se a aprovação ainda vale (no motor é SHA-256).
function impressao(texto) { let h = 2166136261; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); }
const responder = (status, corpo) => traduzirResposta(status, corpo);

export function criarFonteDeDemonstracao({ roteiro = null } = {}) {
  const flowId = "boas-vindas-menu";
  const inicial = roteiro === "extenso" ? fluxoExtenso(60) : versaoPublicada();
  const primeira = structuredClone(inicial); primeira.flow.status = "draft";
  const revisoes = [{ revision: 1, document: primeira, actor_id: "equipe-ficticia", created_at: new Date("2026-11-02T14:10:00-03:00") }];
  const aprovacoes = [];
  let conflitoArmado = roteiro === "conflito";
  const atraso = roteiro === "lento" ? 1200 : 120;

  async function chamar(fn) {
    await espera(atraso);
    if (roteiro === "indisponivel") return responder(0, null);
    return fn();
  }
  const ultima = () => revisoes.at(-1);

  return {
    tipo: roteiro ? "roteiro" : "demonstracao",
    roteiro,
    flowId,
    estado: "demonstracao",
    descricao: roteiro
      ? "Roteiro de homologação: respostas forçadas para testar a tela. Nada vem do motor."
      : "Dados fictícios guardados só nesta aba. Motor, WhatsApp e oficina com Claude não estão conectados.",
    async carregarEspaco() {
      await espera(atraso);
      return {
        negocio: NEGOCIO_FICTICIO,
        bots: botsDeExemplo.map((b) => ({ ...b })),
        publicada: versaoPublicada(),
        perfil: structuredClone(perfilDeExemplo),
        cenarios: structuredClone(cenariosDeExemplo),
        briefing: briefingDeExemplo,
      };
    },
    async obterRascunho(id = flowId, revision) {
      return chamar(() => {
        const r = revision ? revisoes.find((x) => x.revision === revision) : ultima();
        return r ? responder(200, structuredClone(r)) : responder(404, { error: "not_found" });
      });
    },
    async salvarRascunho(id, expectedRevision, document) {
      return chamar(() => {
        if (roteiro === "sessao") return responder(401, { error: "unauthorized" });
        if (roteiro === "permissao") return responder(403, { error: "forbidden" });
        if (new TextEncoder().encode(JSON.stringify(document)).length > LIMITES_DA_API.bytes) return responder(413, { error: "body_too_large" });
        if (document?.flow?.status !== "draft" || document.flow.id !== flowId) return responder(422, { ok: false, error: "invalid_draft" });
        if (conflitoArmado) {
          // Roteiro: outra pessoa salva antes de você, mudando um texto que você também pode ter mudado.
          conflitoArmado = false;
          const dela = structuredClone(ultima().document);
          const no = dela.nodes.find((n) => n.id === "servicos") ?? dela.nodes.find((n) => n.type === "message.text");
          no.config.text = "Veja nossos serviços e preços na página. Dúvidas? Responda aqui.";
          revisoes.push({ revision: ultima().revision + 1, document: dela, actor_id: OUTRA, created_at: new Date() });
        }
        if (expectedRevision !== ultima().revision) return responder(409, { ok: false, error: "revision_conflict", currentRevision: ultima().revision });
        if (compararVersoes(ultima().document, document).vazio && JSON.stringify(ultima().document) === JSON.stringify(document)) return responder(200, { ok: true, revision: ultima().revision, changed: false });
        revisoes.push({ revision: ultima().revision + 1, document: structuredClone(document), actor_id: EU, created_at: new Date() });
        return responder(200, { ok: true, revision: ultima().revision, changed: true });
      });
    },
    async historico(id = flowId, before) {
      return chamar(() => responder(200, revisoes.filter((r) => !before || r.revision < before).slice(-LIMITES_DA_API.historicoPorPagina).reverse()
        .map(({ revision, actor_id, created_at }) => ({ revision, actor_id, created_at }))));
    },
    // Simulação oficial é do motor. Aqui a prévia confere os cenários no navegador e diz isso no resultado.
    async simular(id, { revision, scenarios }) {
      return chamar(() => {
        const r = revisoes.find((x) => x.revision === revision);
        if (!r) return responder(404, { error: "not_found" });
        const { reports, scenariosPassed } = conferirCenarios(r.document, scenarios);
        return responder(200, { ok: true, mode: "previa-navegador", approved: false, published: false, problems: [], diff: null, reports, scenariosPassed });
      });
    },
    async aprovacaoAtual() {
      return chamar(() => {
        const r = ultima(); const a = aprovacoes.findLast((x) => x.revision === r.revision);
        if (!a || a.document_sha256 !== impressao(JSON.stringify(r.document))) return responder(404, { error: "not_found" });
        return responder(200, { ...a, approved: true, published: false });
      });
    },
    async aprovacoes() { return aprovacoes.map((a) => ({ ...a })); },
    async aprovar(id, { revision, confirmation, scenarios }) {
      return chamar(() => {
        if (roteiro === "sessao") return responder(401, { error: "unauthorized" });
        if (roteiro === "permissao") return responder(403, { error: "forbidden" });
        if (confirmation !== true) return responder(422, { ok: false, error: "approval_not_authorized" });
        if (!cenariosAprovaveis(scenarios)) return responder(422, { ok: false, error: "independent_scenarios_required" });
        const r = ultima();
        if (r.revision !== revision) return responder(409, { ok: false, error: "revision_conflict" });
        if (aprovacoes.some((a) => a.revision === revision)) return responder(409, { ok: false, error: "already_approved" });
        const { reports, scenariosPassed } = conferirCenarios(r.document, scenarios);
        if (!scenariosPassed) return responder(422, { ok: false, error: "independent_tests_failed", reports });
        aprovacoes.push({ revision, reviewer_id: EU, document_sha256: impressao(JSON.stringify(r.document)), evidence_sha256: impressao(JSON.stringify(scenarios)), scenario_count: reports.length, approved_at: new Date() });
        return responder(200, { ok: true, revision, approved: true, published: false, reports });
      });
    },
    async resultadoDeExemplo() { await espera(atraso); return resultadoDeExemplo(); },
    // Não existem no motor ainda: a tela mostra indisponível, nunca sucesso.
    async publicar() { return { ok: false, estado: "indisponivel" }; },
    async pedirProposta() { return { ok: false, estado: "indisponivel" }; },
  };
}

export const ROTEIROS = {
  conflito: "Outra pessoa salva antes de você no primeiro salvamento.",
  permissao: "Sua credencial só pode ler: salvar e aprovar respondem 403.",
  sessao: "A sessão expira: salvar e aprovar respondem 401.",
  indisponivel: "O servidor não responde.",
  lento: "Toda resposta demora 1,2 s.",
  extenso: "Fluxo com 60 passos.",
};
export function roteiroDaUrl(href = typeof location !== "undefined" ? location.href : "") {
  const r = new URL(href, "http://x").searchParams.get("roteiro");
  return r && r in ROTEIROS ? r : null;
}
