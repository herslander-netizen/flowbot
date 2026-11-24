// Regras do Bot Studio sem interface: conferência do fluxo, ordem dos passos, desenho em colunas,
// percurso de prévia e diferença entre versões. Nada aqui fala com o motor nem com o WhatsApp.
import { TIPOS, LIMITES, portasDoNo, nomeDaPorta } from "./catalogo.mjs";

export const noPorId = (doc, id) => doc.nodes.find((n) => n.id === id);
export const saidasDe = (doc, id) => doc.edges.filter((e) => e.from === id);

/* ── Conferência ────────────────────────────────────────────
   Repete na tela as checagens estruturais do motor para avisar cedo. A palavra final é do motor. */
export function conferirFluxo(doc) {
  const problemas = [];
  const add = (code, message, path) => problemas.push({ code, message, path });
  const ids = new Set();
  for (const no of doc.nodes) {
    if (ids.has(no.id)) add("duplicate_node", "Há dois passos com o id “" + no.id + "”.", no.id);
    ids.add(no.id);
    const tipo = TIPOS[no.type];
    if (!tipo) { add("unknown_type", "Tipo de passo desconhecido: " + no.type + ".", no.id); continue; }
    const c = no.config ?? {};
    if (no.type === "message.text" && !String(c.text ?? "").trim()) add("empty_text", "O texto está vazio.", no.id);
    if (no.type === "message.text" && String(c.text ?? "").length > LIMITES.texto) add("text_too_long", "Texto acima de " + LIMITES.texto + " caracteres.", no.id);
    if (no.type === "message.quick_replies") {
      const op = c.options ?? [];
      if (!String(c.prompt ?? "").trim()) add("empty_text", "A pergunta das opções está vazia.", no.id);
      if (op.length < LIMITES.opcoes.min || op.length > LIMITES.opcoes.max) add("options_count", "Use de 1 a 10 opções.", no.id);
      op.forEach((o, i) => {
        if (!String(o.label ?? "").trim()) add("empty_label", "A opção " + (i + 1) + " está sem texto.", no.id);
        if (String(o.label ?? "").length > LIMITES.rotuloDaOpcao) add("label_too_long", "A opção " + (i + 1) + " passa de " + LIMITES.rotuloDaOpcao + " caracteres.", no.id);
      });
      const valores = op.map((o) => o.value);
      if (new Set(valores).size !== valores.length) add("duplicate_option", "Duas opções têm o mesmo valor.", no.id);
    }
    if (no.type === "logic.goto" && !doc.nodes.some((n) => n.id === c.target)) add("unknown_target", "“Voltar para” aponta para um passo que não existe.", no.id);
    const saidas = saidasDe(doc, no.id);
    for (const porta of portasDoNo(no)) {
      const ligadas = saidas.filter((e) => e.port === porta.nome);
      if (porta.obrigatoria && !ligadas.length) add("missing_edge", "Falta ligar a saída “" + nomeDaPorta(porta.nome) + "”.", no.id);
      if (ligadas.length > 1) add("duplicate_edge", "A saída “" + nomeDaPorta(porta.nome) + "” está ligada duas vezes.", no.id);
    }
    const validas = new Set(portasDoNo(no).map((x) => x.nome));
    for (const e of saidas) if (!validas.has(e.port)) add("unknown_port", "Saída “" + e.port + "” não existe neste tipo de passo.", no.id);
  }
  for (const e of doc.edges) {
    const destino = noPorId(doc, e.to);
    if (!destino) add("unknown_node", "Uma ligação aponta para um passo que não existe.", e.id);
    else if (TIPOS[destino.type]?.gatilho) add("edge_to_trigger", "Nenhuma ligação pode chegar num gatilho.", e.id);
  }
  const entrada = noPorId(doc, doc.flow?.entryNodeId);
  if (!entrada) add("missing_entry", "O fluxo não tem passo de entrada.", "flow");
  else if (!TIPOS[entrada.type]?.gatilho) add("entry_not_trigger", "O passo de entrada precisa ser um gatilho.", entrada.id);
  if (entrada) {
    const alcancaveis = alcancaveisDe(doc, entrada.id);
    for (const no of doc.nodes) if (!alcancaveis.has(no.id)) add("unreachable", "Este passo nunca é alcançado.", no.id);
  }
  return problemas;
}

function alcancaveisDe(doc, inicio) {
  const vistos = new Set([inicio]); const fila = [inicio];
  while (fila.length) {
    const id = fila.shift();
    const no = noPorId(doc, id);
    const proximos = saidasDe(doc, id).map((e) => e.to);
    if (no?.type === "logic.goto") proximos.push(no.config?.target);
    for (const p of proximos) if (p && !vistos.has(p) && noPorId(doc, p)) { vistos.add(p); fila.push(p); }
  }
  return vistos;
}

/* ── Ordem e colunas ────────────────────────────────────────
   Ordem de leitura (lista do celular) e colunas por distância da entrada (tela do computador). */
export function organizarFluxo(doc) {
  // Ordem de leitura: em largura a partir da entrada.
  const ordem = []; const visto = new Set();
  const inicio = doc.flow?.entryNodeId;
  if (noPorId(doc, inicio)) {
    visto.add(inicio); const fila = [inicio];
    while (fila.length) {
      const id = fila.shift(); ordem.push(id);
      for (const e of saidasDe(doc, id)) if (!visto.has(e.to) && noPorId(doc, e.to)) { visto.add(e.to); fila.push(e.to); }
    }
  }
  for (const no of doc.nodes) if (!visto.has(no.id)) ordem.push(no.id);
  // Colunas pelo caminho mais longo: toda ligação anda para a direita (em fluxo sem ciclo de ligações).
  const coluna = new Map(ordem.map((id) => [id, 0]));
  const ligacoes = doc.edges.filter((e) => coluna.has(e.from) && coluna.has(e.to));
  for (let volta = 0; volta < ordem.length; volta++) {
    let mudou = false;
    for (const e of ligacoes) {
      if (coluna.get(e.to) < coluna.get(e.from) + 1 && e.to !== inicio) { coluna.set(e.to, coluna.get(e.from) + 1); mudou = true; }
    }
    if (!mudou) break;
  }
  // Linhas: em cada coluna, pela média das linhas de quem chega (menos cruzamentos).
  const linha = new Map(); const porColuna = new Map();
  for (const id of ordem) porColuna.set(coluna.get(id), [...(porColuna.get(coluna.get(id)) ?? []), id]);
  for (const c of [...porColuna.keys()].sort((a, b) => a - b)) {
    const ids = porColuna.get(c);
    const peso = (id) => {
      const pais = ligacoes.filter((e) => e.to === id && linha.has(e.from));
      return pais.length ? pais.reduce((s, e) => s + linha.get(e.from) + (portaIndice(doc, e) / 10), 0) / pais.length : ordem.indexOf(id);
    };
    ids.sort((a, b) => peso(a) - peso(b)).forEach((id, i) => linha.set(id, i));
  }
  return { ordem, coluna, linha, colunas: Math.max(0, ...coluna.values()) + 1, linhasMax: Math.max(1, ...[...porColuna.values()].map((l) => l.length)) };
}
function portaIndice(doc, e) { return Math.max(0, saidasDe(doc, e.from).indexOf(e)); }

/* ── Percurso de prévia ─────────────────────────────────────
   Anda pelo fluxo no navegador para a simulação visual. Cobre os passos de conversa e ramificação;
   webhook, captura e sorteio param a prévia com um aviso. Não substitui o simulador do motor. */
const LIMITE_DE_PASSOS = 50;

export function iniciarConversa(contato = {}) {
  return { contato, variaveis: {}, visitas: {}, cursor: null, status: "new", caminho: [] };
}

// Mesmas regras do motor (packages/runtime/src/variaveis.ts): variável ausente vira vazio, lista vira
// uma linha por item e não sobra pontuação solta ("Olá, {{contact.firstName}}!" sem nome vira "Olá!").
function preencher(texto, s) {
  return String(texto ?? "")
    .replace(/\{\{\s*([^{}]*?)\s*\}\}/g, (_, chave) => {
      const v = chave.startsWith("contact.") ? s.contato[chave.slice(8)] : s.variaveis[chave];
      if (v === undefined || v === null || v === "") return "";
      if (Array.isArray(v)) return v.length ? "\n" + v.map((i) => "• " + i).join("\n") : "";
      return String(v);
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]*,[ \t]*(?=[!?.,;:])/g, "")
    .replace(/[ \t]+(?=[!?.,;:])/g, "")
    .trim();
}

function andar(doc, s, inicio, porta) {
  const saidas = [];
  let id = inicio; let passos = 0;
  if (porta) id = saidasDe(doc, inicio).find((e) => e.port === porta)?.to;
  while (id) {
    if (++passos > LIMITE_DE_PASSOS) { s.status = "failed"; s.motivo = "Limite de passos por evento"; break; }
    const no = noPorId(doc, id);
    if (!no) { s.status = "failed"; s.motivo = "Ligação para passo inexistente"; break; }
    s.caminho.push(id);
    const c = no.config ?? {};
    let saida = null;
    switch (no.type) {
      case "trigger.message_received": case "trigger.keyword": saida = "next"; break;
      case "message.text": saidas.push({ tipo: "texto", no: id, texto: preencher(c.text, s) }); saida = "next"; break;
      case "message.quick_replies":
        saidas.push({ tipo: "opcoes", no: id, texto: preencher(c.prompt, s), opcoes: (c.options ?? []).map((o) => ({ value: o.value, label: preencher(o.label, s) })) });
        saida = "next"; break;
      case "state.wait_for_reply": s.cursor = id; s.status = "waiting_input"; return saidas;
      case "logic.switch": {
        const v = String(s.variaveis[c.variable] ?? "").trim().toLocaleLowerCase("pt-BR");
        const caso = (c.cases ?? []).find((k) => k.toLocaleLowerCase("pt-BR") === v);
        saida = caso !== undefined ? "case:" + caso : "default"; break;
      }
      case "logic.goto": {
        const vezes = (s.visitas[id] ?? 0) + 1; s.visitas[id] = vezes;
        if (vezes <= c.maxVisits) { id = c.target; continue; }
        saida = "exhausted"; break;
      }
      case "data.set_variable": s.variaveis[c.variable] = c.value; saida = "next"; break;
      case "action.handoff":
        s.status = "handed_off"; s.cursor = null; s.nota = c.note ?? "";
        saidas.push({ tipo: "equipe", no: id, texto: "(encaminhado para a equipe" + (c.note ? ": " + c.note : "") + ")" });
        return saidas;
      case "action.end": s.status = "completed"; s.cursor = null; return saidas;
      default:
        s.status = "failed"; s.motivo = "“" + (TIPOS[no.type]?.rotulo ?? no.type) + "” só roda no simulador do motor"; s.cursor = id;
        return saidas;
    }
    id = saidasDe(doc, id).find((e) => e.port === saida)?.to;
    if (!id) { s.status = "failed"; s.motivo = "Saída “" + nomeDaPorta(saida) + "” sem ligação"; s.cursor = null; }
  }
  return saidas;
}

// Cliente escreveu algo. Devolve as mensagens que o bot mandaria.
export function responder(doc, s, texto) {
  if (s.status === "waiting_input" && s.cursor) {
    const espera = noPorId(doc, s.cursor);
    if (espera.config?.saveAs) s.variaveis[espera.config.saveAs] = String(texto);
    s.variaveis["message.text"] = String(texto);
    s.status = "running"; s.cursor = null;
    return andar(doc, s, espera.id, "reply");
  }
  if (["completed", "handed_off", "failed"].includes(s.status)) return [];
  s.variaveis["message.text"] = String(texto);
  s.status = "running";
  return andar(doc, s, doc.flow.entryNodeId, null);
}

// Cliente ficou em silêncio até o prazo da espera.
export function esgotarPrazo(doc, s) {
  if (s.status !== "waiting_input" || !s.cursor) return [];
  const espera = s.cursor; s.status = "running"; s.cursor = null;
  return andar(doc, s, espera, "timeout");
}

/* ── Diferença entre versões ──────────────────────────────── */
export function compararVersoes(antes, depois) {
  const mapa = (d) => new Map(d.nodes.map((n) => [n.id, n]));
  const a = mapa(antes); const b = mapa(depois);
  const adicionados = [...b.keys()].filter((id) => !a.has(id));
  const removidos = [...a.keys()].filter((id) => !b.has(id));
  const alterados = [...b.keys()].filter((id) => a.has(id) && JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)))
    .map((id) => ({ id, campos: camposAlterados(a.get(id), b.get(id)) }));
  const chave = (e) => e.from + "→" + e.port;
  const la = new Map(antes.edges.map((e) => [chave(e), e.to]));
  const lb = new Map(depois.edges.map((e) => [chave(e), e.to]));
  const ligacoes = [];
  for (const [k, to] of lb) if (la.get(k) !== to) ligacoes.push({ saida: k, antes: la.get(k) ?? null, depois: to });
  for (const [k, to] of la) if (!lb.has(k)) ligacoes.push({ saida: k, antes: to, depois: null });
  return { adicionados, removidos, alterados, ligacoes, vazio: !adicionados.length && !removidos.length && !alterados.length && !ligacoes.length };
}

function camposAlterados(x, y) {
  const campos = [];
  if (x.type !== y.type) campos.push({ campo: "tipo", antes: x.type, depois: y.type });
  const cx = x.config ?? {}; const cy = y.config ?? {};
  for (const k of new Set([...Object.keys(cx), ...Object.keys(cy)])) {
    if (JSON.stringify(cx[k]) !== JSON.stringify(cy[k])) campos.push({ campo: k, antes: cx[k], depois: cy[k] });
  }
  return campos;
}

export const copiar = (doc) => structuredClone(doc);
