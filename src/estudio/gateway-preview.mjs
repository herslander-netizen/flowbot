// Cliente de homologação do gateway D3 (flow-bot #22).
// Somente mesma origem. Sem token de serviço, publicação ou envio de mensagens.
import { traduzirResposta, OPERACOES, LIMITES_DA_API } from "./contrato.mjs";

export function criarClienteGateway({ fetchImpl = globalThis.fetch, timeoutMs = 16000 } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetch indisponível");
  const indisponivel = () => traduzirResposta(0, null);
  async function chamar(path, metodo, payload) {
    let body;
    if (payload !== undefined) {
      try { body = JSON.stringify(payload); } catch { return traduzirResposta(400, {error:"invalid_body"}); }
      if (new TextEncoder().encode(body).length > LIMITES_DA_API.bytes) return traduzirResposta(413, {error:"body_too_large"});
    }
    try {
      const res = await fetchImpl(path, {
        method: metodo, credentials: "same-origin", mode: "same-origin",
        redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json", ...(body === undefined ? {} : {"Content-Type":"application/json"}) },
        ...(body === undefined ? {} : {body}),
      });
      if (!res.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return indisponivel();
      const data = await res.json();
      if (data === null || typeof data !== "object") return indisponivel();
      return traduzirResposta(res.status, data);
    } catch { return indisponivel(); }
  }
  function operacao(nome, id, payload, chave, valor) {
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) return Promise.resolve(traduzirResposta(400, {error:"invalid_flow"}));
    const op = OPERACOES[nome];
    if (valor !== undefined && (!Number.isSafeInteger(valor) || valor < 1)) return Promise.resolve(traduzirResposta(400, {error:"invalid_revision"}));
    const query = valor === undefined ? "" : "?" + new URLSearchParams({[chave]:String(valor)});
    return chamar("/studio/v1/flows/" + id + op.sufixo + query, op.metodo, payload);
  }
  return Object.freeze({
    sessao: () => chamar("/studio/session", "GET"),
    entrar: (username, password) => chamar("/studio/session", "POST", {username,password}),
    sair: () => chamar("/studio/session", "DELETE"),
    obterRascunho: (id, revision) => operacao("obterRascunho", id, undefined, "revision", revision),
    salvarRascunho: (id, expectedRevision, document) => operacao("salvarRascunho", id, {expectedRevision,document}),
    historico: (id, before) => operacao("historico", id, undefined, "before", before),
    simular: (id, {revision,scenarios,baseRevision}) => operacao("simular", id, {revision,scenarios,...(baseRevision === undefined ? {} : {baseRevision})}),
    aprovacaoAtual: (id) => operacao("aprovacaoAtual", id),
    // Não expor uma ação de aprovação até definir a origem independente dos cenários.
    aprovar: async () => traduzirResposta(403, {error:"forbidden"}),
    publicar: async () => indisponivel(),
    pedirProposta: async () => indisponivel(),
  });
}
