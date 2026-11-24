// Contrato da API privada de autoria do motor (flow-bot PR #21, docs/BOT_STUDIO_API_D3.md), lido sem alterar
// o motor. O navegador NÃO chama essa API: ela fica atrás de um BFF autenticado que ainda não existe. Este
// arquivo só descreve as operações e traduz as respostas para os estados da interface, para que a futura
// fonte real (chamando o BFF) use exatamente os mesmos nomes e regras.
//
// Rotas (todas em /studio/v1/flows/{flowId}):
//   GET  /draft?revision=N   read      → { revision, document, actor_id, created_at } | 404
//   PUT  /draft              write     { expectedRevision, document } → { ok, revision, changed } | 409 { error: "revision_conflict", currentRevision } | 422
//   GET  /history?before=N   read      → [{ revision, actor_id, created_at }] (até 50, mais recentes primeiro)
//   POST /simulate           simulate  { revision, scenarios, baseRevision? } → saída de avaliarRascunhoStudio | 422
//   GET  /approval           read      → { revision, reviewer_id, document_sha256, evidence_sha256, scenario_count, approved_at, approved, published } | 404
//   POST /approval           approve   { revision, confirmation, scenarios } → { ok, revision, approved: true, published: false, reports } | 409 | 422

export const OPERACOES = {
  obterRascunho: { metodo: "GET", sufixo: "/draft", permissao: "read" },
  salvarRascunho: { metodo: "PUT", sufixo: "/draft", permissao: "write" },
  historico: { metodo: "GET", sufixo: "/history", permissao: "read" },
  simular: { metodo: "POST", sufixo: "/simulate", permissao: "simulate" },
  aprovacaoAtual: { metodo: "GET", sufixo: "/approval", permissao: "read" },
  aprovar: { metodo: "POST", sufixo: "/approval", permissao: "approve" },
};

export const LIMITES_DA_API = { bytes: 1024 * 1024, historicoPorPagina: 50, cenarios: 20, passosPorCenario: 20, evidenciaBytes: 128 * 1024, revisaoInicial: 0 };

// Códigos de erro do motor → texto para a pessoa. Nenhum código novo é inventado aqui.
export const MENSAGENS = {
  unauthorized: "Sua sessão expirou ou não foi reconhecida. Entre de novo para continuar.",
  forbidden: "Você não tem permissão para esta ação neste espaço.",
  not_found: "Não encontrado.",
  method_not_allowed: "Operação não permitida.",
  revision_conflict: "Outra pessoa salvou uma revisão mais nova enquanto você editava.",
  already_approved: "Esta revisão já foi aprovada.",
  invalid_body: "O pedido saiu num formato que o motor não aceita.",
  invalid_revision: "Número de revisão inválido.",
  invalid_query: "Consulta inválida.",
  body_too_large: "O rascunho passou de 1 MiB.",
  invalid_flow: "O motor recusou o rascunho. Veja os problemas.",
  invalid_draft: "O documento não é um rascunho deste fluxo.",
  draft_too_large: "O rascunho passou de 1 MiB.",
  approval_not_authorized: "A aprovação precisa da sua confirmação e de permissão para aprovar.",
  independent_scenarios_required: "Aprovar exige cenários independentes com verificações (até 20 × 20).",
  evidence_too_large: "A evidência dos cenários passou de 128 KiB.",
  independent_tests_failed: "Os cenários independentes falharam nesta revisão.",
  internal_error: "O motor teve um erro interno.",
};

// Estado da interface para cada resposta. "sessao" e "permissao" vêm do BFF/motor; nunca de um login fictício.
export function traduzirResposta(status, corpo) {
  const codigo = corpo?.error ?? null;
  const base = { ok: false, status, codigo, mensagem: MENSAGENS[codigo] ?? null, corpo };
  if (status >= 200 && status < 300 && corpo?.ok !== false) return { ok: true, status, dados: corpo };
  if (status === 0) return { ...base, estado: "indisponivel", mensagem: "Sem resposta do servidor. Suas alterações continuam aqui." };
  if (status === 401) return { ...base, estado: "sessao", mensagem: MENSAGENS.unauthorized };
  if (status === 403) return { ...base, estado: "permissao", mensagem: MENSAGENS.forbidden };
  if (status === 404) return { ...base, estado: "vazio", mensagem: MENSAGENS.not_found };
  if (status === 409) return { ...base, estado: "conflito", revisaoAtual: corpo?.currentRevision ?? null };
  if (status === 413) return { ...base, estado: "validacao", mensagem: MENSAGENS.body_too_large };
  if (status === 422 || (status === 200 && corpo?.ok === false)) return { ...base, estado: "validacao", problemas: corpo?.problems ?? [], relatorios: corpo?.reports ?? null, mensagem: MENSAGENS[codigo] ?? "O motor recusou o pedido." };
  if (status === 400) return { ...base, estado: "erro" };
  return { ...base, estado: "indisponivel", mensagem: MENSAGENS.internal_error };
}

// Aprovar exige cenários com ao menos uma verificação significativa por cenário (mesma regra do motor),
// para a interface avisar antes de enviar.
export function cenariosAprovaveis(arquivo) {
  const lista = arquivo?.scenarios ?? [];
  if (!lista.length || lista.length > LIMITES_DA_API.cenarios) return false;
  return lista.every((c) => c.steps.length <= LIMITES_DA_API.passosPorCenario && c.steps.some((p) => {
    const e = p.expect; if (!e) return false;
    if (e.replies !== undefined || e.status !== undefined || e.cursor !== undefined || e.handoff !== undefined) return true;
    if (Object.keys(e.variables ?? {}).length) return true;
    return (e.contains ?? []).some((v) => v.trim().length > 0);
  }));
}
