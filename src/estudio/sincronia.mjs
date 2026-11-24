// Sincronização do rascunho com a fonte, seguindo o contrato de concorrência otimista do motor
// (PUT /draft com expectedRevision; 409 revision_conflict com currentRevision). Sem DOM: testável em Node.
//
// Regras:
// - Salva sozinho depois de uma pausa na edição (atrasoMs). Um salvamento por vez; o que mudar durante o
//   salvamento entra no próximo.
// - Em conflito, para de salvar, guarda as alterações locais e busca a revisão mais nova para comparar.
//   Nada local é descartado sem a pessoa escolher.
// - Sem sessão, sem permissão ou servidor fora do ar: para de tentar sozinho, mantém tudo local e
//   espera a pessoa agir (tentar de novo ou baixar as alterações).
import { compararVersoes } from "./fluxo.mjs";

export function analisarConflito(base, local, remoto) {
  const minhas = compararVersoes(base, local);
  const delas = compararVersoes(base, remoto);
  const tocadas = (d) => new Set([...d.adicionados, ...d.removidos, ...d.alterados.map((a) => a.id), ...d.ligacoes.map((l) => l.saida.split("→")[0])]);
  const a = tocadas(minhas); const b = tocadas(delas);
  return { minhas, delas, sobrepostos: [...a].filter((id) => b.has(id)) };
}

export function criarSincronia({ fonte, flowId, aoMudar = () => {}, atrasoMs = 1200, relogio = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t) } }) {
  const s = {
    estado: "carregando",      // carregando | salvo | nao-salvo | salvando | conflito | sessao | permissao | indisponivel | validacao
    base: null,                // { revision, document } — última revisão que este editor conhece
    salvoEm: null,
    erro: null,                // { mensagem, problemas }
    conflito: null,            // { suaBase, revisaoAtual, remoto, local, analise }
    local: null,               // documento local atual
  };
  let timer = null; let emVoo = null; let pendente = false;
  const mudar = (patch) => { Object.assign(s, patch); aoMudar(s); };

  async function carregar() {
    mudar({ estado: "carregando", erro: null });
    const r = await fonte.obterRascunho(flowId);
    if (!r.ok) { mudar({ estado: r.estado === "vazio" ? "salvo" : r.estado, erro: { mensagem: r.mensagem } }); return null; }
    mudar({ base: { revision: r.dados.revision, document: r.dados.document }, local: r.dados.document, estado: "salvo", salvoEm: new Date(r.dados.created_at) });
    return r.dados.document;
  }

  function alterar(documento) {
    s.local = documento;
    if (["conflito", "sessao", "permissao"].includes(s.estado)) { aoMudar(s); return; }
    mudar({ estado: emVoo ? "salvando" : "nao-salvo" });
    agendar();
  }
  function agendar() {
    relogio.clearTimeout(timer);
    timer = relogio.setTimeout(() => { timer = null; return salvar(); }, atrasoMs);
  }

  async function salvar() {
    if (!s.local || !s.base) return s;
    if (emVoo) { pendente = true; return emVoo; }
    const enviado = s.local;
    mudar({ estado: "salvando", erro: null });
    emVoo = (async () => {
      const r = await fonte.salvarRascunho(flowId, s.base.revision, enviado);
      emVoo = null;
      if (r.ok) {
        s.base = { revision: r.dados.revision, document: enviado };
        if (pendente || s.local !== enviado) { pendente = false; mudar({ estado: "nao-salvo", salvoEm: new Date() }); agendar(); }
        else mudar({ estado: "salvo", salvoEm: new Date() });
        return s;
      }
      pendente = false;
      if (r.estado === "conflito") {
        const remoto = await fonte.obterRascunho(flowId);
        const doc = remoto.ok ? remoto.dados.document : null;
        mudar({ estado: "conflito", conflito: { suaBase: s.base.revision, revisaoAtual: r.revisaoAtual ?? remoto.dados?.revision, remoto: doc, autor: remoto.dados?.actor_id ?? null, quando: remoto.dados?.created_at ?? null, local: s.local, analise: doc ? analisarConflito(s.base.document, s.local, doc) : null } });
        return s;
      }
      mudar({ estado: r.estado === "erro" ? "indisponivel" : r.estado, erro: { mensagem: r.mensagem, problemas: r.problemas ?? [] } });
      return s;
    })();
    return emVoo;
  }

  // Resolver conflito: "minhas" grava o local por cima da revisão nova (depois de a pessoa ver o que muda);
  // "delas" troca o local pela revisão nova (o local foi oferecido para download antes).
  async function resolver(escolha) {
    const c = s.conflito; if (!c) return null;
    s.base = { revision: c.revisaoAtual, document: c.remoto };
    s.conflito = null;
    if (escolha === "delas") { s.local = c.remoto; mudar({ estado: "salvo", salvoEm: new Date() }); return c.remoto; }
    s.local = c.local; mudar({ estado: "nao-salvo" });
    await salvar();
    return c.local;
  }

  async function tentarDeNovo() { if (s.estado === "conflito") return s; return salvar(); }
  function cancelar() { relogio.clearTimeout(timer); }
  return { estado: s, carregar, alterar, salvar, resolver, tentarDeNovo, cancelar };
}
