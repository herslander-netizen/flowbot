// Edição do rascunho sem interface: criar, inserir, ligar e excluir passos dentro do catálogo do motor.
// Toda função devolve um documento novo; o original nunca muda (desfazer = guardar o anterior).
import { TIPOS, portasDoNo } from "./catalogo.mjs";
import { noPorId, saidasDe, conferirFluxo, iniciarConversa, responder, esgotarPrazo } from "./fluxo.mjs";

// Configuração inicial válida no schema do motor para cada tipo que a interface deixa criar.
// Gatilhos (só há uma entrada) e webhook (URL externa exige revisão de segurança no motor) ficam de fora.
const PADRAO = {
  "message.text": () => ({ text: "Nova mensagem" }),
  "message.quick_replies": () => ({ prompt: "Escolha uma opção:", options: [{ value: "1", label: "Opção 1" }, { value: "2", label: "Opção 2" }] }),
  "state.wait_for_reply": () => ({ timeoutSeconds: 300, saveAs: "session.resposta" }),
  "logic.switch": () => ({ variable: "session.resposta", cases: ["1", "2"] }),
  "logic.condition": () => ({ variable: "session.resposta", operator: "is_set" }),
  "logic.match": () => ({ match: { mode: "contains", values: ["sim"] } }),
  "logic.goto": (doc) => ({ target: doc.flow.entryNodeId, maxVisits: 2 }),
  "data.capture": () => ({ variable: "session.dado", kind: "text" }),
  "data.set_variable": () => ({ variable: "session.marcador", value: "sim" }),
  "time.delay": () => ({ seconds: 60 }),
  "action.handoff": () => ({ note: "" }),
  "action.end": () => ({}),
};
export const TIPOS_CRIAVEIS = Object.keys(PADRAO);
export const MOTIVO_NAO_CRIAVEL = {
  "trigger.message_received": "O fluxo tem uma única entrada.",
  "trigger.keyword": "Gatilhos por palavra-chave são configurados no motor.",
  "logic.random": "Sorteio exige semente registrada no motor.",
  "action.webhook": "Webhook chama um endereço externo e passa pela revisão de segurança do motor.",
};

const ID_BASE = {
  "message.text": "texto", "message.quick_replies": "opcoes", "state.wait_for_reply": "espera", "logic.switch": "escolha",
  "logic.condition": "condicao", "logic.match": "correspondencia", "logic.goto": "voltar", "data.capture": "captura",
  "data.set_variable": "variavel", "time.delay": "aguardar", "action.handoff": "equipe", "action.end": "fim",
};
export function novoId(doc, base) {
  const ids = new Set(doc.nodes.map((n) => n.id));
  if (!ids.has(base)) return base;
  let i = 2; while (ids.has(base + "-" + i)) i++;
  return base + "-" + i;
}
function novoIdDeLigacao(doc) {
  const ids = new Set(doc.edges.map((e) => e.id));
  let i = doc.edges.length + 1; while (ids.has("e" + i)) i++;
  return "e" + i;
}

// Insere um passo. Com `depoisDe` e `porta`, o passo entra no meio: quem saía por essa porta passa
// pelo passo novo e segue para o destino antigo (pela primeira saída do passo novo, se houver).
export function inserirPasso(doc, { tipo, depoisDe = null, porta = null }) {
  if (!PADRAO[tipo]) throw new Error(MOTIVO_NAO_CRIAVEL[tipo] ?? "Tipo de passo desconhecido.");
  const d = structuredClone(doc);
  const id = novoId(d, ID_BASE[tipo]);
  const no = { id, type: tipo, config: PADRAO[tipo](d) };
  d.nodes.push(no);
  if (depoisDe && porta && noPorId(d, depoisDe)) {
    const antiga = d.edges.find((e) => e.from === depoisDe && e.port === porta);
    const destino = antiga?.to ?? null;
    if (antiga) antiga.to = id;
    else d.edges.push({ id: novoIdDeLigacao(d), from: depoisDe, to: id, port: porta });
    const primeira = portasDoNo(no)[0];
    if (destino && primeira && !TIPOS[tipo].terminal) d.edges.push({ id: novoIdDeLigacao(d), from: id, to: destino, port: primeira.nome });
  }
  return { doc: d, id };
}

// Liga (ou desliga, com `para` nulo) a saída `porta` de `de`.
export function ligar(doc, de, porta, para) {
  const d = structuredClone(doc);
  const existente = d.edges.find((e) => e.from === de && e.port === porta);
  if (!para) { d.edges = d.edges.filter((e) => e !== existente); return d; }
  if (existente) existente.to = para;
  else d.edges.push({ id: novoIdDeLigacao(d), from: de, to: para, port: porta });
  return d;
}

// Exclui um passo e as ligações dele. Se o passo tinha uma entrada e uma saída, quem chegava nele
// passa a ir direto para o destino (não deixa buraco no caminho). A entrada do fluxo não sai.
export function removerPasso(doc, id) {
  if (id === doc.flow.entryNodeId) throw new Error("A entrada do fluxo não pode ser excluída.");
  if (!noPorId(doc, id)) throw new Error("Passo não encontrado.");
  const d = structuredClone(doc);
  const chegam = d.edges.filter((e) => e.to === id);
  const saem = d.edges.filter((e) => e.from === id);
  d.nodes = d.nodes.filter((n) => n.id !== id);
  d.edges = d.edges.filter((e) => e.to !== id && e.from !== id);
  if (saem.length === 1) for (const e of chegam) d.edges.push({ ...e, to: saem[0].to });
  return { doc: d, ligacoesRemovidas: chegam.length + saem.length };
}

export function atualizarConfig(doc, id, mudar) {
  const d = structuredClone(doc);
  const no = noPorId(d, id);
  mudar(no.config);
  return d;
}

/* ── Árvore para o celular ─────────────────────────────────
   Lista plana com nível: caminho principal no nível 0; ramos entram um nível abaixo, com o nome da
   saída. Passo já mostrado aparece como referência ("vai para"), para não repetir nem ficar em ciclo. */
export function arvoreDoFluxo(doc) {
  const itens = []; const vistos = new Set();
  const visitar = (id, nivel, via) => {
    if (!id || !noPorId(doc, id)) return;
    if (vistos.has(id)) { itens.push({ id, nivel, via, referencia: true }); return; }
    vistos.add(id);
    const no = noPorId(doc, id);
    itens.push({ id, nivel, via, referencia: false });
    const portas = portasDoNo(no);
    const ligadas = portas.map((p) => ({ porta: p.nome, para: saidasDe(doc, id).find((e) => e.port === p.nome)?.to ?? null, obrigatoria: p.obrigatoria }));
    if (no.type === "logic.goto") itens.push({ id: no.config.target, nivel: nivel + 1, via: "retorno", referencia: true });
    if (ligadas.length === 1 && ligadas[0].para) { visitar(ligadas[0].para, nivel, null); return; }
    for (const l of ligadas) {
      if (l.para) visitar(l.para, nivel + 1, l.porta);
      else if (l.obrigatoria) itens.push({ id: null, nivel: nivel + 1, via: l.porta, faltando: true, de: id });
    }
  };
  visitar(doc.flow.entryNodeId, 0, null);
  for (const no of doc.nodes) if (!vistos.has(no.id)) { vistos.add(no.id); itens.push({ id: no.id, nivel: 0, via: null, solto: true }); }
  return itens;
}

/* ── Repetir uma conversa em outra versão ───────────────── */
export function repetirConversa(doc, entradas, contato = {}) {
  const s = iniciarConversa(contato); const saidas = [];
  for (const e of entradas) {
    const r = e.tipo === "silencio" ? esgotarPrazo(doc, s) : responder(doc, s, e.texto);
    saidas.push(...r.map((m) => m.texto));
  }
  return { saidas, status: s.status, cursor: s.cursor, caminho: s.caminho };
}

export { conferirFluxo };
