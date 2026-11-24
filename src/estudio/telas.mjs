// As cinco telas do Bot Studio. Só desenham a partir do estado; eventos ficam em app.mjs.
import { TIPOS, PAPEIS, nomeDaPorta, resumoDoNo, PORTAS_DE_ERRO } from "./catalogo.mjs";
import { compararVersoes, noPorId } from "./fluxo.mjs";
import { arvoreDoFluxo } from "./edicao.mjs";
import { PERSONAGENS, AGENTES_DA_OFICINA, ESTADO_DO_AGENTE, NOME_DO_TIPO, ESTADOS_DE_TRABALHO, estadoDeTrabalho } from "./agentes.mjs";
import { ERROS_DA_PONTE, ROTEIROS, NOMES_DE_AUTOR } from "./dados.mjs";
import { MENSAGENS, cenariosAprovaveis } from "./contrato.mjs";
import { estado, publicada, problemas, alterado, REVISAO, estadoDeRevisao, revisaoAtual, aprovacaoInvalidada } from "./estado.mjs";
import { desenharCanvas } from "./canvas.mjs";
import { cabecalhoDoPasso, corpoDoPasso } from "./inspetor.mjs";
import { personagem, papelDo, marcaDoAgente } from "./personagens.mjs";
import { html, formatar, estadoOperacional, blocoDeEstado } from "../ui/componentes.mjs";
import { icone } from "../ui/icones.mjs";

const STATUS = { new: "Nova", running: "Rodando", waiting_input: "Esperando o cliente", completed: "Concluída", handed_off: "Com a equipe", failed: "Parou" };
export const nomeDoStatus = (s) => STATUS[s] ?? s;
const autor = (id) => NOMES_DE_AUTOR[id] ?? id;
const chipRevisao = () => { const r = REVISAO[estadoDeRevisao()]; return `<span class="version-state" data-estado="${r.chip}">${r.rotulo}</span>`; };
const agrupar = (lista) => { const m = new Map(); for (const p of lista) m.set(p.path, [...(m.get(p.path) ?? []), p]); return m; };
const relativo = (d) => { if (!d) return ""; const s = Math.round((Date.now() - new Date(d)) / 1000); if (s < 10) return "agora"; if (s < 60) return "há " + s + " s"; if (s < 3600) return "há " + Math.round(s / 60) + " min"; return formatar.hora(new Date(d)); };

/* ───────────────────────── Salvamento e faixas ───────────────────────── */
export function indicadorDeSalvamento() {
  const s = estado.sinc?.estado; if (!s) return "";
  const r = s.base?.revision;
  const local = estado.fonte?.tipo !== "real" ? " · nesta aba" : "";
  const mapa = {
    carregando: ["carregando", "Carregando"],
    salvo: ["conectado", `Salvo · r${r}${local}`],
    "nao-salvo": ["nao-salvo", "Alterações não salvas"],
    salvando: ["salvando", "Salvando…"],
    conflito: ["conflito", "Conflito de revisão"],
    sessao: ["erro", "Sessão expirada"],
    permissao: ["permissao", "Somente leitura"],
    indisponivel: ["indisponivel", "Sem conexão"],
    validacao: ["validacao", "Não foi salvo"],
  };
  const [op, texto] = mapa[s.estado] ?? ["vazio", s.estado];
  const clicavel = ["conflito", "sessao", "permissao", "indisponivel", "validacao"].includes(s.estado);
  return clicavel
    ? `<button type="button" class="save-state pressable" data-acao="ver-sincronia" aria-live="polite">${estadoOperacional(op, texto)}</button>`
    : `<span class="save-state" aria-live="polite" title="${s.salvoEm ? "Salvo " + relativo(s.salvoEm) : ""}">${estadoOperacional(op, texto)}</span>`;
}

export function faixas() {
  const s = estado.sinc?.estado; let h = "";
  if (!s) return h;
  const baixar = `<button type="button" class="btn btn--ghost btn--sm" data-acao="baixar-local">${icone("exportar", "icon icon--sm")}Baixar minhas alterações</button>`;
  if (s.estado === "conflito") h += `<div class="strip strip--danger" role="alert">${icone("alerta", "icon icon--sm")}<span><strong>Conflito:</strong> a r${s.conflito.revisaoAtual} foi salva por ${html(autor(s.conflito.autor))} enquanto você editava. Suas alterações estão preservadas aqui.</span><button type="button" class="btn btn--secondary btn--sm" data-acao="ver-sincronia">Resolver</button></div>`;
  if (s.estado === "sessao") h += `<div class="strip strip--danger" role="alert">${icone("cadeado", "icon icon--sm")}<span><strong>Sessão expirada.</strong> Entre de novo no FlowBot para salvar. Nada do que você fez foi perdido nesta aba.</span>${baixar}</div>`;
  if (s.estado === "permissao") h += `<div class="strip strip--warn" role="alert">${icone("cadeado", "icon icon--sm")}<span><strong>Somente leitura.</strong> Sua conta não pode salvar neste espaço. Peça acesso a quem administra.</span>${baixar}</div>`;
  if (s.estado === "indisponivel") h += `<div class="strip strip--warn" role="alert">${icone("nuvemoff", "icon icon--sm")}<span><strong>Sem conexão com o servidor.</strong> Suas alterações continuam nesta aba.</span><button type="button" class="btn btn--secondary btn--sm" data-acao="tentar-de-novo">Tentar de novo</button></div>`;
  if (s.estado === "validacao") h += `<div class="strip strip--warn" role="alert">${icone("alerta", "icon icon--sm")}<span><strong>Não foi salvo:</strong> ${html(s.erro?.mensagem ?? "o motor recusou o rascunho")}.</span><button type="button" class="btn btn--secondary btn--sm" data-ir="fluxo">Ver avisos</button></div>`;
  return h;
}

/* ───────────────────────── Cabeçalho do bot ───────────────────────── */
export function cabecalho() {
  const bot = estado.espaco.bots[0];
  const n = problemas().length;
  const roteiro = estado.fonte?.roteiro ? `<div class="strip strip--script" role="note">${icone("ajustes", "icon icon--sm")}<span><strong>Roteiro de homologação:</strong> ${html(ROTEIROS[estado.fonte.roteiro])} Nada vem do motor.</span></div>` : "";
  return `${roteiro}<header class="studio-head">
    <div class="studio-head__main">
      <h1 class="studio-head__title"><span class="studio-head__crumb">${html(estado.espaco.negocio)} /</span> ${html(bot.nome)}</h1>
      <div class="studio-head__meta">
        ${chipRevisao()}
        ${indicadorDeSalvamento()}
        ${n ? `<button type="button" class="link-btn link-btn--warn" data-acao="ver-avisos">${icone("alerta", "icon icon--sm")}${n} aviso(s)</button>` : ""}
      </div>
    </div>
    <button type="button" class="demo-flag pressable" data-acao="sobre-demo" aria-haspopup="dialog" aria-label="Demonstração: o que é real nesta prévia"><span class="demo-flag__dot" aria-hidden="true"></span><span class="demo-flag__text">Demonstração</span>${icone("info", "icon icon--sm")}</button>
  </header>`;
}

/* ───────────────────────── 1. Agentes ───────────────────────── */
export function telaAgentes() {
  const contagem = {};
  for (const no of estado.rascunho.nodes) contagem[papelDo(no)] = (contagem[papelDo(no)] ?? 0) + 1;
  const bots = estado.espaco.bots.map((b, i) => `<li><button type="button" class="bot-row pressable" ${i === 0 ? 'data-ir="fluxo"' : "disabled"}>
      <span class="bot-row__icon" aria-hidden="true">${icone("conversa")}</span>
      <span class="bot-row__text"><span class="bot-row__name">${html(b.nome)}</span><span class="bot-row__meta">${html(b.canal)} · ${b.publicada ? "v" + b.publicada + " publicada" : "nunca publicado"} · fictício</span></span>
      ${estadoOperacional("desconectado", "Não conectado")}
      ${i === 0 ? icone("seta", "icon bot-row__go") : ""}
    </button></li>`).join("");
  const personagens = PERSONAGENS.map((p) => {
    const n = contagem[p.id] ?? 0;
    return `<li><button type="button" class="agent-card pressable" data-agente="${p.id}" style="--papel:${p.cor}">
      <span class="agent-card__face">${personagem(p.id, 44, { olhar: n ? "atento" : "apagado" })}</span><span class="agent-card__count">${n ? `<strong>${n}</strong> passo${n > 1 ? "s" : ""}` : "sem passos"}</span>
      <span class="agent-card__name">${html(p.nome)}</span>
      <span class="agent-card__job">${html(p.trabalho)}</span>
      <span class="agent-card__foot">${p.ferramentas.map((f) => f.rotulo).slice(0, 3).join(" · ")}${p.ferramentas.length > 3 ? " …" : ""}</span>
    </button></li>`;
  }).join("");
  const oficina = AGENTES_DA_OFICINA.map((a, i) => { const t = ESTADOS_DE_TRABALHO[estadoDeTrabalho(a)];
    return `<li class="chain__item"><button type="button" class="chain__btn pressable" data-agente="${a.id}">
      ${marcaDoAgente(a.tipo)}<span class="chain__text"><span class="chain__name">${html(a.nome)}</span><span class="chain__kind">${NOME_DO_TIPO[a.tipo]} · ${t.rotulo.toLocaleLowerCase("pt-BR")}</span></span>
    </button>${i < AGENTES_DA_OFICINA.length - 1 ? `<span class="chain__link" aria-hidden="true">${icone("seta", "icon icon--sm")}</span>` : ""}</li>`; }).join("");
  return `<div class="studio-stack view-enter">
    <section aria-labelledby="t-time" class="block">
      <div class="block__head"><h2 class="block__title" id="t-time">Time do fluxo</h2><span class="block__meta">Cada passo é feito por um personagem</span></div>
      <ul class="plain-list agent-grid">${personagens}</ul>
    </section>
    <section aria-labelledby="t-oficina" class="block">
      <div class="block__head"><h2 class="block__title" id="t-oficina">Agentes da oficina</h2>${estadoOperacional("desconectado", "Nenhum trabalhando")}</div>
      <ol class="plain-list chain">${oficina}</ol>
    </section>
    <section aria-labelledby="t-bots" class="block">
      <div class="block__head"><h2 class="block__title" id="t-bots">Bots do espaço</h2><span class="block__meta">${estado.espaco.bots.length} de demonstração</span></div>
      <ul class="plain-list list-surface">${bots}</ul>
    </section>
  </div>`;
}

export function detalheDoAgente(id) {
  const p = PERSONAGENS.find((x) => x.id === id);
  const a = AGENTES_DA_OFICINA.find((x) => x.id === id);
  const ag = p ?? a; if (!ag) return null;
  const est = p ? ESTADO_DO_AGENTE.personagem : ESTADO_DO_AGENTE[a.tipo];
  const nomeDe = (x) => (PERSONAGENS.find((q) => q.id === x) ?? AGENTES_DA_OFICINA.find((q) => q.id === x))?.nome ?? x;
  const passos = p ? estado.rascunho.nodes.filter((n) => papelDo(n) === id) : [];
  const conexoes = p ? { entra: p.depende, sai: p.entrega } : { entra: a.depende, sai: AGENTES_DA_OFICINA.filter((x) => x.depende.includes(id)).map((x) => x.id) };
  const chip = (x) => `<button type="button" class="dep-chip pressable" data-agente="${x}">${PERSONAGENS.some((q) => q.id === x) ? personagem(x, 18) : marcaDoAgente(AGENTES_DA_OFICINA.find((q) => q.id === x).tipo)}${html(nomeDe(x))}</button>`;
  const trabalho = a ? ESTADOS_DE_TRABALHO[estadoDeTrabalho(a)] : null;
  return {
    cabeca: `<div class="agent-hero" style="--papel:${p?.cor ?? "var(--surface-sunken)"}">${p ? personagem(id, 56, { olhar: passos.length ? "atento" : "apagado" }) : marcaDoAgente(a.tipo)}</div><div class="drawer__heading"><span class="t-label">${p ? "Personagem do fluxo" : NOME_DO_TIPO[a.tipo]}</span><h2 class="drawer__title" id="agente-titulo">${html(ag.nome)}</h2><p class="drawer__sub">${html(p ? p.trabalho : a.funcao)}</p></div>`,
    corpo: `<dl class="kv">
        <div><dt>Disponibilidade</dt><dd>${p ? (passos.length ? estadoOperacional("demonstracao", `${passos.length} passo(s) no rascunho`) : estadoOperacional("vazio", "Sem passos neste fluxo")) : estadoOperacional(trabalho.op, trabalho.rotulo)}</dd></div>
        <div><dt>Conexão</dt><dd>${estadoOperacional(est.estado, est.texto)}</dd></div>
      </dl>
      <section class="section"><h3 class="section__title">Responsabilidades</h3><ul class="bullet-list">${ag.responsabilidades.map((r) => `<li>${html(r)}</li>`).join("")}</ul></section>
      ${p ? `<section class="section"><h3 class="section__title">Ferramentas <span>${p.ferramentas.length}</span></h3><ul class="tool-list">${p.ferramentas.map((f) => `<li><span>${html(f.rotulo)}</span><code>${html(f.id)}</code></li>`).join("")}</ul></section>` : ""}
      <section class="section"><h3 class="section__title">Permissões</h3><ul class="perm-list">${ag.permissoes.map((r) => `<li>${icone(/^(Não|Só|Pode recusar)/.test(r) ? "cadeado" : "check", "icon icon--sm")}<span>${html(r)}</span></li>`).join("")}</ul></section>
      <section class="section"><h3 class="section__title">Trabalha com</h3>
        <div class="deps"><span class="deps__label">Recebe de</span><div class="deps__chips">${conexoes.entra.length ? conexoes.entra.map(chip).join("") : '<span class="t-faint">início</span>'}</div></div>
        <div class="deps"><span class="deps__label">Passa para</span><div class="deps__chips">${conexoes.sai.length ? conexoes.sai.map(chip).join("") : '<span class="t-faint">fim</span>'}</div></div>
      </section>
      ${p ? `<section class="section"><h3 class="section__title">Passos no rascunho <span>${passos.length}</span></h3>${passos.length ? `<div class="deps__chips">${passos.map((n) => `<button type="button" class="dep-chip pressable" data-no="${html(n.id)}">${html(n.id)}</button>`).join("")}</div>` : '<p class="field__hint">Nenhum passo deste personagem no rascunho.</p>'}</section>` : ""}
      <section class="section"><h3 class="section__title">Histórico de execução</h3>${blocoDeEstado({ estado: "desconectado", titulo: "Sem execuções registradas", texto: "O histórico vem do motor. Nesta prévia ele não está conectado, então nenhum agente rodou." })}</section>`,
  };
}

/* ───────────────────────── 2. Fluxo ───────────────────────── */
function buscar(termo) {
  const t = termo.trim().toLocaleLowerCase("pt-BR"); if (!t) return [];
  return estado.rascunho.nodes.filter((n) => [n.id, TIPOS[n.type]?.rotulo, resumoDoNo(n)].some((v) => String(v ?? "").toLocaleLowerCase("pt-BR").includes(t))).slice(0, 8);
}
export function resultadosDaBusca() {
  const r = buscar(estado.busca);
  if (!estado.busca.trim()) return "";
  return r.length ? r.map((n, i) => `<li role="option" id="busca-${i}"><button type="button" class="search-hit pressable" data-no="${html(n.id)}" tabindex="-1">${personagem(papelDo(n), 20)}<span><strong>${html(n.id)}</strong><small>${html(TIPOS[n.type]?.rotulo)} · ${html(resumoDoNo(n).slice(0, 60))}</small></span></button></li>`).join("")
    : `<li class="search-none">Nenhum passo com “${html(estado.busca)}”.</li>`;
}

export function telaFluxo({ largo }) {
  const lista = problemas(); const porNo = agrupar(lista);
  const comAviso = [...new Set(lista.map((p) => p.path))].filter((id) => noPorId(estado.rascunho, id));
  const atual = comAviso.indexOf(estado.selecionado);
  const barra = `<div class="flow-bar">
      <div class="search-box" role="combobox" aria-expanded="${!!estado.busca.trim()}" aria-haspopup="listbox" aria-owns="busca-resultados">
        ${icone("busca")}
        <input class="input input--bare" type="search" id="busca-passo" placeholder="Buscar passo" value="${html(estado.busca)}" autocomplete="off" aria-label="Buscar passo pelo nome, tipo ou texto" aria-controls="busca-resultados" enterkeyhint="search">
        ${largo ? '<kbd aria-hidden="true">/</kbd>' : ""}
        <ul class="search-results" id="busca-resultados" role="listbox" aria-label="Passos encontrados" ${estado.busca.trim() ? "" : "hidden"}>${resultadosDaBusca()}</ul>
      </div>
      <div class="flow-bar__actions">
        ${comAviso.length ? `<div class="warn-nav" role="group" aria-label="Avisos da conferência"><button type="button" class="btn btn--ghost btn--icon btn--sm" data-acao="aviso-anterior" aria-label="Aviso anterior">${icone("esquerda")}</button><span class="warn-nav__count">${icone("alerta", "icon icon--sm")}${atual >= 0 ? atual + 1 + "/" : ""}${comAviso.length}</span><button type="button" class="btn btn--ghost btn--icon btn--sm" data-acao="aviso-seguinte" aria-label="Próximo aviso">${icone("seta")}</button></div>` : `<span class="flow-bar__ok">${estadoOperacional("conectado", "Estrutura ok")}</span>`}
        <span class="flow-bar__sep" aria-hidden="true"></span>
        <button type="button" class="btn btn--ghost btn--icon btn--sm" data-acao="desfazer" aria-label="Desfazer" data-tip="Desfazer (Ctrl+Z)" ${estado.desfazer.length ? "" : "disabled"}>${icone("desfazer")}</button>
        <button type="button" class="btn btn--ghost btn--icon btn--sm btn--mirror" data-acao="refazer" aria-label="Refazer" data-tip="Refazer (Ctrl+Shift+Z)" ${estado.refazer.length ? "" : "disabled"}>${icone("desfazer")}</button>
        ${largo ? `<div class="segmented" role="group" aria-label="Forma de ver o fluxo">
          <button type="button" data-vista="mapa" aria-pressed="${estado.vistaFluxo === "mapa"}">${icone("fluxo", "icon icon--sm")}Mapa</button>
          <button type="button" data-vista="passos" aria-pressed="${estado.vistaFluxo === "passos"}">${icone("lista", "icon icon--sm")}Passos</button></div>
          <button type="button" class="btn btn--primary btn--sm" data-acao="novo-passo">${icone("mais")}Passo</button>` : ""}
      </div>
    </div>`;
  const mapa = largo && estado.vistaFluxo === "mapa";
  return `<div class="flow-layout${mapa ? " flow-layout--canvas" : ""} view-enter">
    <div class="flow-main">
      ${barra}
      ${mapa ? `<div class="canvas-wrap">${desenharCanvas(estado.rascunho, { selecionado: estado.selecionado, avisosPorNo: porNo })}</div>` : arvore(porNo)}
    </div>
    ${largo ? `<aside class="side-panel flow-side" aria-label="Painel do passo" id="painel-lateral">${painelLateral(lista)}</aside>` : ""}
  </div>
  ${largo ? "" : `<button type="button" class="fab" data-acao="novo-passo">${icone("mais")}Passo</button>`}`;
}

export function painelLateral(lista) {
  const no = estado.selecionado && noPorId(estado.rascunho, estado.selecionado);
  if (no) {
    return `<div class="side-panel__head">${cabecalhoDoPasso(no, { titulo: "lateral-titulo" })}<button type="button" class="btn btn--ghost btn--icon" data-acao="desselecionar" aria-label="Fechar painel do passo">${icone("fechar")}</button></div>
      <div class="side-panel__body">${corpoDoPasso(estado.rascunho, no, lista.filter((p) => p.path === no.id))}</div>`;
  }
  return `<div class="side-panel__head"><div class="drawer__heading"><span class="t-label">Fluxo</span><h2 class="drawer__title">${html(estado.rascunho.flow.name)}</h2><p class="drawer__sub">${estado.rascunho.nodes.length} passos · ${estado.rascunho.edges.length} ligações</p></div></div>
    <div class="side-panel__body">
      ${lista.length ? `<section class="section"><h3 class="section__title">Conferência <span>${lista.length}</span></h3><ul class="issue-list">${lista.map((p) => `<li><button type="button" class="issue pressable" ${noPorId(estado.rascunho, p.path) ? `data-no="${html(p.path)}"` : "disabled"}>${icone("alerta", "icon icon--sm")}<span><strong>${html(noPorId(estado.rascunho, p.path) ? p.path : "fluxo")}</strong> ${html(p.message)}</span></button></li>`).join("")}</ul></section>`
        : blocoDeEstado({ estado: "conectado", titulo: "Estrutura ok", texto: "Toda saída obrigatória está ligada e todo passo é alcançado. A palavra final é do motor (Versões → Avaliação oficial)." })}
      <section class="section"><h3 class="section__title">Como ler o mapa</h3>
        <ul class="legend-list">
          <li><span class="legend-line"></span>Caminho normal</li>
          <li><span class="legend-line legend-line--error"></span>Saída de erro (sem resposta, inválido, outra resposta)</li>
          <li><span class="legend-line legend-line--return"></span>Retorno com limite de vezes</li>
        </ul>
        <dl class="keys"><div><dt>Mover</dt><dd>arrastar o fundo, setas</dd></div><div><dt>Zoom</dt><dd>Ctrl + roda, + e −</dd></div><div><dt>Enquadrar</dt><dd>F</dd></div><div><dt>Buscar</dt><dd>/</dd></div><div><dt>Opções do passo</dt><dd>botão direito</dd></div></dl>
      </section>
    </div>`;
}

function arvore(porNo) {
  const itens = arvoreDoFluxo(estado.rascunho);
  const termo = estado.busca.trim().toLocaleLowerCase("pt-BR");
  const casa = (no) => !termo || [no.id, TIPOS[no.type]?.rotulo, resumoDoNo(no)].some((v) => String(v ?? "").toLocaleLowerCase("pt-BR").includes(termo));
  return `<ol class="tree" aria-label="Passos do fluxo">${itens.map((it) => {
    const via = it.via ? `<span class="tree__via${PORTAS_DE_ERRO.has(it.via) || it.via === "retorno" ? " tree__via--error" : ""}">${it.via === "retorno" ? icone("retorno", "icon icon--xs") + "volta para" : html(nomeDaPorta(it.via))}</span>` : "";
    const recuo = `style="--nivel:${Math.min(it.nivel, 4)}"`;
    if (termo && (it.faltando || it.referencia)) return "";
    if (it.faltando) return `<li class="tree__item tree__item--missing" ${recuo}>${via}<button type="button" class="tree__missing pressable" data-no="${html(it.de)}">${icone("alerta", "icon icon--sm")}Falta ligar esta saída</button></li>`;
    if (it.referencia) return `<li class="tree__item tree__item--ref" ${recuo}>${via}<button type="button" class="tree__ref pressable" data-no="${html(it.id)}">${icone("seta", "icon icon--xs")}vai para <strong>${html(it.id)}</strong></button></li>`;
    const no = noPorId(estado.rascunho, it.id); if (!casa(no)) return "";
    const papel = papelDo(no); const avisos = porNo.get(no.id)?.length ?? 0;
    return `<li class="tree__item" ${termo ? "" : recuo}>${termo ? "" : via}<button type="button" class="tree__node pressable${avisos ? " tree__node--warn" : ""}" data-no="${html(no.id)}" data-contexto="${html(no.id)}" ${estado.selecionado === no.id ? 'aria-current="true"' : ""} style="--papel:${PAPEIS[papel].cor}">
      ${personagem(papel, 26)}
      <span class="tree__text"><span class="tree__title"><span class="tree__type">${html(TIPOS[no.type]?.rotulo ?? no.type)}</span><span class="tree__id">${html(no.id)}</span>${it.solto ? '<span class="tree__flag">solto</span>' : ""}</span><span class="tree__summary">${html(resumoDoNo(no))}</span></span>
      ${avisos ? icone("alerta", "icon icon--sm tree__warn") : ""}
    </button></li>`;
  }).join("") || `<li>${blocoDeEstado({ estado: "vazio", titulo: "Nenhum passo encontrado", texto: "Tente o nome do passo, o tipo ou um trecho do texto." })}</li>`}</ol>`;
}

export function folhaDoPasso(id, ordem) {
  const no = noPorId(estado.rascunho, id); if (!no) return null;
  const i = ordem.indexOf(id);
  return {
    cabeca: cabecalhoDoPasso(no),
    corpo: corpoDoPasso(estado.rascunho, no, problemas().filter((p) => p.path === id)),
    rodape: `<button type="button" class="btn btn--secondary grow" data-acao="passo-anterior" ${i <= 0 ? "disabled" : ""}>${icone("esquerda")}Anterior</button>
      <span class="sheet-pos" aria-live="polite">${i + 1} de ${ordem.length}</span>
      <button type="button" class="btn btn--secondary grow" data-acao="passo-seguinte" ${i >= ordem.length - 1 ? "disabled" : ""}>Próximo${icone("seta")}</button>`,
  };
}

// Ações rápidas de um passo (botão direito no canvas, toque longo na árvore).
export function acoesDoPasso(id) {
  const no = noPorId(estado.rascunho, id); if (!no) return "";
  const entrada = id === estado.rascunho.flow.entryNodeId;
  return `<button type="button" class="menu__item" role="menuitem" data-no="${html(id)}">${icone("nota")}Editar</button>
    ${TIPOS[no.type]?.terminal ? "" : `<button type="button" class="menu__item" role="menuitem" data-acao="inserir-depois" data-no-alvo="${html(id)}">${icone("mais")}Inserir passo depois</button>`}
    <button type="button" class="menu__item" role="menuitem" data-acao="simular-daqui" data-no-alvo="${html(id)}">${icone("conversa")}Simular a conversa</button>
    <div class="menu__sep"></div>
    <button type="button" class="menu__item menu__item--danger" role="menuitem" data-acao="excluir-passo" data-no-alvo="${html(id)}" ${entrada ? "disabled" : ""}>${icone("lixeira")}${entrada ? "Entrada não pode sair" : "Excluir passo"}</button>`;
}

/* ───────────────────────── 3. Oficina ───────────────────────── */
const usandoProposta = () => estado.resultado && compararVersoes(estado.resultado.flow, estado.rascunho).vazio;
export function telaOficina({ largo }) {
  const r = estado.resultado;
  const etapa = !r ? "pedido" : usandoProposta() ? "revisao" : "proposta";
  const ordem = ["pedido", "proposta", "revisao"]; const nomes = { pedido: "Pedido", proposta: "Proposta", revisao: "Revisão" };
  const aba = largo ? null : estado.oficinaAba;
  const mostrar = (k) => largo || aba === k;
  return `<div class="view-enter studio-stack">
    <div class="stepper" role="${largo ? "list" : "tablist"}" aria-label="Etapas da oficina">${ordem.map((k, i) => {
      const est = ordem.indexOf(k) < ordem.indexOf(etapa) ? "feito" : k === etapa ? "atual" : "depois";
      const inner = `<span class="stepper__dot">${est === "feito" ? icone("check", "icon icon--xs") : i + 1}</span>${nomes[k]}`;
      return largo ? `<span class="stepper__item" role="listitem" data-estado="${est}" ${k === etapa ? 'aria-current="step"' : ""}>${inner}</span>`
        : `<button type="button" class="stepper__item stepper__tab" role="tab" data-oficina="${k}" aria-selected="${aba === k}" data-estado="${est}">${inner}</button>`;
    }).join("")}</div>
    <div class="workshop">
      ${mostrar("pedido") ? `<section class="workshop__brief" aria-labelledby="t-pedido">
        <h2 class="block__title" id="t-pedido">${icone("nota", "icon icon--sm")}Pedido</h2>
        <div class="field"><label class="field__label" for="briefing">O que o bot deve fazer</label>
          <textarea class="textarea" id="briefing" maxlength="6000" rows="5">${html(estado.briefing)}</textarea>
          <span class="field__hint field__hint--row"><span>Em palavras simples, com regras e exceções.</span><span data-contador="briefing">${estado.briefing.length}/6000</span></span></div>
        <fieldset class="fieldset"><legend class="field__label">Contexto do negócio <span class="t-faint">${html(estado.espaco.perfil.id)}</span></legend>
          <div class="facts">${estado.espaco.perfil.facts.map((f, i) => `<div class="fact"><label class="fact__name" for="fato-${i}"><span>${html(f.description)}</span><code>${html(f.name)}</code></label>
            <input class="input" id="fato-${i}" data-fato="${i}" value="${html(Array.isArray(f.example) ? f.example.join(", ") : f.example)}"></div>`).join("")}</div>
          <p class="field__hint">O fluxo só lê esses fatos por <code>reality.*</code>. O que faltar vira lacuna, nunca invenção.</p>
        </fieldset>
        <div class="workshop__ask">
          <button type="button" class="btn btn--primary" disabled aria-describedby="oficina-off">${icone("faisca")}Pedir proposta</button>
          <p class="field__hint" id="oficina-off">${estadoOperacional("indisponivel", "Oficina com Claude desligada")}</p>
          ${r ? "" : `<button type="button" class="btn btn--secondary" data-acao="exemplo-oficina">${icone("arquivo")}Abrir proposta de exemplo</button>`}
        </div>
      </section>` : ""}
      ${mostrar("proposta") || mostrar("revisao") ? `<section class="workshop__result" id="resultado" aria-label="Trabalho da oficina">
        ${r ? linhaDeTrabalho(r, { largo, aba }) : `<div class="empty-art">${personagem("flowbot", 56, { olhar: "apagado" })}<p class="empty__title">Nenhuma proposta ainda</p><p class="empty__text">Com a oficina ligada, a proposta chega aqui com lacunas, testes e a diferença para a versão publicada. Nada é publicado sem a sua revisão.</p>${largo ? "" : '<button type="button" class="btn btn--secondary" data-oficina="pedido">Ir para o pedido</button>'}</div>`}
      </section>` : ""}
    </div>
  </div>`;
}

// A oficina em quatro tipos de registro, sempre com a origem: Sugestão (IA), Execução (código do motor),
// Resultado e Aprovação (pessoa). Nada aqui diz que um agente rodou quando não rodou.
function linhaDeTrabalho(r, { largo, aba }) {
  const diff = compararVersoes(publicada(), r.flow);
  const usando = usandoProposta();
  const loc = estado.execucaoLocal;
  const sugestao = `<article class="log log--sugestao" aria-labelledby="log-sug">
      <header class="log__head"><span class="log__kind">${icone("faisca", "icon icon--sm")}Sugestão</span><span class="log__who">Arquiteto · exemplo fictício, não rodou</span></header>
      <h3 class="log__title" id="log-sug">Proposta: ${r.flow.nodes.length} passos, ${r.scenarios.length} cenários</h3>
      <details class="fold" open><summary>${icone("alerta", "icon icon--sm text-warning")}Lacunas para decidir <span class="fold__count">${r.gaps.length}</span></summary>${r.gaps.length ? `<ul class="bullet-list">${r.gaps.map((g) => `<li>${html(g)}</li>`).join("")}</ul>` : '<p class="field__hint">Nenhuma.</p>'}</details>
      <details class="fold"><summary>${icone("camadas", "icon icon--sm")}Alterações sugeridas <span class="fold__count">${diff.adicionados.length + diff.alterados.length + diff.removidos.length}</span></summary>
        <ul class="change-list">${diff.adicionados.map((id) => `<li><span class="change-tag change-tag--add">novo</span><span>${html(TIPOS[noPorId(r.flow, id).type]?.rotulo)} <code>${html(id)}</code></span></li>`).join("")}${diff.alterados.map((a) => `<li><span class="change-tag">muda</span><span><code>${html(a.id)}</code> · ${a.campos.map((c) => html(c.campo)).join(", ")}</span></li>`).join("")}${diff.removidos.map((id) => `<li><span class="change-tag change-tag--del">sai</span><code>${html(id)}</code></li>`).join("")}</ul>
        <button type="button" class="link-btn" data-ir="versoes">Ver diferença completa</button></details>
      ${usando ? `<p class="log__note">${icone("ok", "icon icon--sm")}Esta proposta é o rascunho atual.</p>` : `<button type="button" class="btn btn--secondary" data-acao="usar-proposta">${icone("fluxo")}Usar como rascunho</button>`}
    </article>`;
  const execucao = `<article class="log log--execucao" aria-labelledby="log-exe">
      <header class="log__head"><span class="log__kind">${icone("engrenagem", "icon icon--sm")}Execução</span><span class="log__who">${loc ? "Prévia do navegador · " + relativo(loc.quando) : "Validador e Simulador · motor não conectado"}</span></header>
      <h3 class="log__title" id="log-exe">Cenários independentes</h3>
      <p class="field__hint">${estado.espaco.cenarios.scenarios.length} cenários do operador, separados dos que a proposta trouxe. ${cenariosAprovaveis(estado.espaco.cenarios) ? "Todos têm verificações." : "Falta verificação em algum cenário."}</p>
      <button type="button" class="btn btn--secondary btn--sm" data-acao="rodar-cenarios">${icone("play", "icon icon--sm")}Rodar na prévia do navegador</button>
    </article>`;
  const resultado = loc ? `<article class="log log--resultado" aria-labelledby="log-res">
      <header class="log__head"><span class="log__kind">${icone(loc.ok ? "ok" : "alerta", "icon icon--sm")}Resultado</span><span class="log__who">rascunho r${loc.revisao ?? "—"} · prévia, não é a avaliação oficial</span></header>
      <h3 class="log__title" id="log-res">${loc.ok ? "Todos os cenários passaram" : loc.reports.filter((x) => !x.ok).length + " cenário(s) falharam"}</h3>
      <ul class="plain-list">${loc.reports.map((x) => `<li class="test-row">${icone(x.ok ? "ok" : "alerta", "icon icon--sm " + (x.ok ? "text-success" : "text-danger"))}<span>${html(x.name)}</span>${x.ok ? "" : `<small class="test-row__why">${html(x.passos.flatMap((p) => p.falhas)[0] ?? "")}</small>`}</li>`).join("")}</ul>
    </article>` : "";
  const parteProposta = largo || aba === "proposta" ? sugestao + execucao + resultado : "";
  const parteRevisao = largo || aba === "revisao" ? aprovacaoHumana(usando) : "";
  return `<div class="worklog">${parteProposta}${parteRevisao}</div>`;
}

function aprovacaoHumana(usando) {
  const s = estado.sinc.estado; const rev = revisaoAtual(); const est = estadoDeRevisao();
  const cab = `<header class="log__head"><span class="log__kind">${icone("check", "icon icon--sm")}Aprovação</span><span class="log__who">Pessoa · ${estado.fonte.tipo === "real" ? "registrada no motor" : "guardada nesta aba (demonstração)"}</span></header>`;
  if (est === "aprovado") {
    const a = estado.aprovacao;
    return `<article class="log log--aprovacao log--done" aria-labelledby="log-apr">${cab}
      <h3 class="log__title" id="log-apr">Revisão r${a.revision} aprovada</h3>
      <dl class="kv"><div><dt>Por</dt><dd>${html(autor(a.reviewer_id))}</dd></div><div><dt>Quando</dt><dd>${formatar.hora(new Date(a.approved_at))}</dd></div><div><dt>Cenários</dt><dd>${a.scenario_count}</dd></div><div><dt>Documento</dt><dd><code>${html(String(a.document_sha256).slice(0, 8))}</code></dd></div></dl>
      <p class="field__hint">Aprovação não é publicação. Qualquer edição cria uma revisão nova, que precisa ser aprovada de novo.</p>
      <button type="button" class="btn btn--primary btn--block" disabled aria-describedby="pub-off">Publicar</button>
      <p class="field__hint" id="pub-off">Publicação desligada nesta fase. Nada vai para o WhatsApp.</p>
    </article>`;
  }
  const c = estado.checklist; const tudo = c.estrutura && c.lacunas && c.simulei;
  const salvo = s.estado === "salvo";
  const pode = usando && est !== "correcao" && salvo && !estado.aprovando;
  const falhou = estado.relatorioAprovacao;
  return `<article class="log log--aprovacao" aria-labelledby="log-apr">${cab}
    <h3 class="log__title" id="log-apr">Revisão humana${rev ? " da r" + rev : ""}</h3>
    ${aprovacaoInvalidada() ? `<div class="alert alert--warning">${icone("alerta")}<span>A aprovação da r${estado.ultimaAprovada} não vale mais: o rascunho mudou depois dela.</span></div>` : ""}
    ${est === "correcao" ? `<div class="alert alert--danger">${icone("alerta")}<span>Correção pedida. Ajuste o rascunho no editor; a revisão recomeça.</span></div>` : ""}
    ${falhou ? `<div class="alert alert--danger">${icone("alerta")}<span>${html(falhou.mensagem)}${falhou.reports ? " " + falhou.reports.filter((x) => !x.ok).map((x) => "“" + x.name + "”").join(", ") + "." : ""}</span></div>` : ""}
    <div class="checklist" role="group" aria-label="Antes de aprovar">
      ${[["estrutura", "Li a estrutura e os textos"], ["lacunas", "Decidi o que fazer com as lacunas"], ["simulei", "Simulei a conversa"]].map(([k, t]) => `<label class="check"><input type="checkbox" data-checar="${k}" ${c[k] ? "checked" : ""} ${usando ? "" : "disabled"}><span>${t}</span></label>`).join("")}
    </div>
    <div class="review__actions">
      <button type="button" class="btn btn--secondary grow" data-acao="pedir-correcao" ${usando && est !== "correcao" ? "" : "disabled"}>Pedir correção</button>
      <button type="button" class="btn btn--primary grow" data-acao="aprovar" ${pode && tudo ? "" : "disabled"} ${estado.aprovando ? 'aria-busy="true"' : ""}>${icone("check")}Aprovar r${rev ?? "—"}</button>
    </div>
    <p class="field__hint">${!usando ? "Use a proposta como rascunho para revisar." : !salvo ? "Espere o rascunho salvar: a aprovação vale para uma revisão salva." : `Aprovar roda os ${estado.espaco.cenarios.scenarios.length} cenários independentes sobre a r${rev}.`}</p>
  </article>`;
}

/* ───────────────────────── 4. Simulador ───────────────────────── */
export function telaSimulador({ largo }) {
  const s = estado.conversa; const doc = estado.simVersao === "publicada" ? publicada() : estado.rascunho;
  const fim = s && ["completed", "handed_off", "failed"].includes(s.status);
  const esperando = s?.status === "waiting_input";
  const prazo = esperando ? noPorId(doc, s.cursor)?.config?.timeoutSeconds : null;
  const ultimaBot = [...estado.mensagens].reverse().find((m) => m.de === "bot" && m.opcoes);
  return `<div class="sim view-enter${largo ? " sim--wide" : ""}">
    <section class="phone" aria-label="Conversa simulada">
      <header class="phone__head">
        <span class="phone__avatar">${personagem("recepcionista", 28)}</span>
        <div class="phone__who"><p class="phone__name">${html(estado.espaco.negocio)}</p><p class="phone__status">${s ? html(nomeDoStatus(s.status)) : "simulação no navegador"} · ${estado.simVersao === "publicada" ? "v1 publicada" : "rascunho"}</p></div>
        ${largo ? "" : `<button type="button" class="btn btn--ghost btn--icon" data-acao="detalhes-sim" aria-label="Detalhes da simulação" aria-haspopup="dialog">${icone("ajustes")}</button>`}
        <button type="button" class="btn btn--ghost btn--icon" data-acao="reiniciar" aria-label="Recomeçar conversa">${icone("desfazer")}</button>
      </header>
      <div class="phone__chat" id="chat" role="log" aria-live="polite" aria-label="Mensagens">
        <p class="chat-day">Hoje · conversa fictícia, nada é enviado</p>
        ${estado.mensagens.length ? "" : `<div class="chat-start"><p>Escreva como se fosse o cliente.</p><div class="chat-start__chips">${["oi", "bom dia", "quero agendar"].map((t) => `<button type="button" class="chip pressable" data-dizer="${t}">${t}</button>`).join("")}</div></div>`}
        ${mensagens(ultimaBot, esperando)}
        ${fim ? `<p class="chat-note chat-note--${s.status}">${s.status === "handed_off" ? icone("check", "icon icon--xs") + "Passada para a equipe" + (s.nota ? ": " + html(s.nota) : "") : s.status === "completed" ? icone("ok", "icon icon--xs") + "Conversa concluída" : icone("alerta", "icon icon--xs") + "A prévia parou: " + html(s.motivo ?? "")}</p>` : ""}
        ${s?.status === "failed" && s.cursor ? `<button type="button" class="link-btn chat-fail-link" data-no="${html(s.cursor)}">Ver o passo ${html(s.cursor)} no editor</button>` : ""}
      </div>
      ${esperando ? `<div class="phone__quick"><button type="button" class="chip pressable" data-acao="silencio">${icone("relogio", "icon icon--sm")}Cliente some por ${html(formatarPrazo(prazo))}</button></div>` : ""}
      <form class="phone__composer" id="composer">
        <input class="input" id="mensagem" autocomplete="off" enterkeyhint="send" placeholder="${fim ? "Conversa encerrada" : "Mensagem do cliente"}" aria-label="Mensagem do cliente" ${fim ? "disabled" : ""}>
        ${fim ? `<button class="btn btn--secondary" type="button" data-acao="reiniciar">Recomeçar</button>` : `<button class="btn btn--primary btn--icon" type="submit" aria-label="Enviar">${icone("seta")}</button>`}
      </form>
    </section>
    ${largo ? `<aside class="sim__side" aria-label="Detalhes da simulação">${detalhesDaSimulacao()}</aside>` : ""}
  </div>`;
}
const formatarPrazo = (s) => !s ? "o prazo" : s < 3600 ? Math.round(s / 60) + " min" : Math.round(s / 3600) + " h";

// Mensagens seguidas do bot formam um grupo (só a primeira tem "rabicho"); etapas aparecem só se pedidas.
function mensagens(ultimaBot, esperando) {
  let anterior = null;
  return estado.mensagens.map((m) => {
    const grupo = anterior && anterior.de === m.de && m.de !== "sistema" ? " bubble--cont" : "";
    anterior = m;
    const etapa = estado.mostrarEtapas && m.etapas?.length ? `<p class="chat-steps">${m.etapas.map(html).join(" → ")}</p>` : "";
    if (m.de === "equipe") return ""; // o encaminhamento aparece uma vez, no fim da conversa
    if (m.de === "cliente") return `${etapa}<div class="bubble bubble--out${grupo}"><p>${html(m.texto)}</p><span class="bubble__time">${m.hora}</span></div>`;
    const ativa = m === ultimaBot && esperando;
    const opcoes = m.opcoes ? `<div class="bubble__options" role="group" aria-label="Respostas rápidas">${m.opcoes.map((o) => `<button type="button" class="reply-btn" data-resposta="${html(o.value)}" data-rotulo="${html(o.label)}" ${ativa ? "" : "disabled"}>${html(o.label)}</button>`).join("")}</div>` : "";
    return `${etapa}<div class="bubble bubble--in${m.opcoes ? " bubble--menu" : ""}${grupo}"><p>${html(m.texto)}</p><span class="bubble__time">${m.hora}</span>${opcoes}</div>`;
  }).join("");
}

export function detalhesDaSimulacao() {
  const s = estado.conversa; const doc = estado.simVersao === "publicada" ? publicada() : estado.rascunho;
  const atual = s?.cursor && noPorId(doc, s.cursor);
  return `<section class="sim-panel">
    <div class="field"><span class="field__label" id="sim-versao">Versão</span>
      <div class="segmented segmented--block" role="group" aria-labelledby="sim-versao">
        <button type="button" data-sim-versao="rascunho" aria-pressed="${estado.simVersao === "rascunho"}">Rascunho</button>
        <button type="button" data-sim-versao="publicada" aria-pressed="${estado.simVersao === "publicada"}">v1 publicada</button></div></div>
    <div class="field"><label class="field__label" for="contato">Primeiro nome do contato</label><input class="input" id="contato" value="${html(estado.contato)}" maxlength="40" autocomplete="off"></div>
    <label class="switch switch--accent"><span>Mostrar etapas na conversa<br><span class="t-small t-muted">Passos percorridos entre as mensagens</span></span><input type="checkbox" id="mostrar-etapas" ${estado.mostrarEtapas ? "checked" : ""}></label>
  </section>
  <section class="sim-panel"><h3 class="section__title">Etapa atual</h3>
    ${atual ? `<button type="button" class="step-now pressable" data-no="${html(atual.id)}">${personagem(papelDo(atual), 24)}<span><strong>${html(atual.id)}</strong><small>${html(TIPOS[atual.type]?.rotulo)} · ${html(nomeDoStatus(s.status))}</small></span></button>`
      : `<p class="field__hint">${s ? html(nomeDoStatus(s.status)) : "Mande uma mensagem para começar."}</p>`}
    <h3 class="section__title">Caminho</h3>
    ${s?.caminho.length ? `<ol class="trail">${s.caminho.map((id, i) => `<li class="${i === s.caminho.length - 1 ? "is-last" : ""}">${html(id)}</li>`).join("")}</ol>` : '<p class="field__hint">—</p>'}
    <h3 class="section__title">Variáveis</h3>
    ${s && Object.keys(s.variaveis).length ? `<dl class="vars">${Object.entries(s.variaveis).map(([k, v]) => `<div><dt>${html(k)}</dt><dd>${html(v)}</dd></div>`).join("")}</dl>` : '<p class="field__hint">Nenhuma ainda.</p>'}
  </section>
  <section class="sim-panel"><h3 class="section__title">Comparar versões</h3>${comparacao()}</section>`;
}

function comparacao() {
  if (!estado.entradas.length) return '<p class="field__hint">Depois de conversar, veja como a mesma conversa termina na outra versão.</p>';
  const c = estado.comparacao;
  if (!c) return `<button type="button" class="btn btn--secondary btn--sm" data-acao="comparar-sim">${icone("camadas")}Repetir na ${estado.simVersao === "publicada" ? "versão rascunho" : "v1 publicada"}</button>`;
  return `<div class="compare${c.igual ? "" : " compare--diff"}">
    <p><strong>${c.igual ? "Mesmo resultado" : "Resultado diferente"}</strong> na ${html(c.outra)}: ${html(nomeDoStatus(c.status))}${c.cursor ? " em " + html(c.cursor) : ""}.</p>
    ${c.igual ? "" : `<div class="compare__cols"><div><p class="t-label">Aqui</p><p>${html(c.aqui ?? "—")}</p></div><div><p class="t-label">${html(c.outra)}</p><p>${html(c.ultima ?? "—")}</p></div></div>`}
  </div>`;
}

/* ───────────────────────── 5. Versões ───────────────────────── */
export function telaVersoes() {
  const diff = compararVersoes(publicada(), estado.rascunho);
  const est = estadoDeRevisao();
  const ordem = ["rascunho", "revisao", "aprovado", "publicado"];
  const atual = est === "correcao" ? 1 : ordem.indexOf(est);
  const ciclo = [
    ["Rascunho", "rascunho", "salvo no motor (revisões)"],
    [est === "correcao" ? "Precisa de correção" : "Em revisão", est === "correcao" ? "correcao" : "revisao", "marcação desta tela"],
    ["Aprovado", "aprovado", "presa à revisão exata"],
    ["Publicado", "publicado", "operação separada (desligada)"],
  ];
  return `<div class="view-enter versions">
    <ol class="cycle" aria-label="Ciclo da próxima versão">${ciclo.map(([n, chip, origem], i) => `<li class="cycle__step" data-estado="${i < atual ? "feito" : i === atual ? "atual" : "depois"}" ${i === atual ? 'aria-current="step"' : ""}><span class="cycle__dot" aria-hidden="true">${i < atual ? icone("check", "icon icon--xs") : ""}</span><span class="cycle__text"><span class="cycle__name">${n}</span><span class="cycle__src">${origem}</span></span></li>`).join("")}</ol>
    <div class="versions__grid">
      <div class="studio-stack">
        <section class="block" aria-labelledby="t-rev">
          <div class="block__head"><h2 class="block__title" id="t-rev">Revisões</h2><span class="block__meta">${estado.fonte.tipo === "real" ? "do motor" : "guardadas nesta aba"}</span></div>
          ${listaDeRevisoes()}
        </section>
        <section class="block" aria-labelledby="t-diff">
          <div class="block__head"><h2 class="block__title" id="t-diff">${estado.comparar ? `r${estado.comparar.a} × r${estado.comparar.b}` : "Rascunho × v1 publicada"}</h2><span class="block__meta">${resumoDiff(estado.comparar?.diff ?? diff)}${estado.comparar ? ` · <button type="button" class="link-btn" data-acao="limpar-comparacao">voltar à v1</button>` : ""}</span></div>
          ${detalheDiff(estado.comparar?.diff ?? diff, estado.comparar ? null : undefined)}
        </section>
      </div>
      <div class="studio-stack">
        <section class="block" aria-labelledby="t-oficial">
          <div class="block__head"><h2 class="block__title" id="t-oficial">Avaliação oficial</h2>${estado.avaliacao ? estadoOperacional(estado.avaliacao.ok && estado.avaliacao.cenariosOk ? "conectado" : "erro", "Resultado importado") : estadoOperacional("desconectado", "Motor não conectado")}</div>
          ${avaliacaoOficial()}
        </section>
        <section class="block" aria-labelledby="t-hist">
          <div class="block__head"><h2 class="block__title" id="t-hist">Atividade desta aba</h2><span class="block__meta">Mais recente primeiro</span></div>
          ${estado.eventos.length ? `<ol class="timeline">${estado.eventos.map((e) => `<li class="timeline__item"><span class="timeline__dot" data-tipo="${e.tipo}"></span><div><p class="timeline__text">${html(e.texto)}</p><p class="timeline__when">${formatar.hora(e.quando)}</p></div></li>`).join("")}</ol>` : '<p class="field__hint">Nada ainda. Edições, aprovações e avaliações aparecem aqui.</p>'}
        </section>
      </div>
    </div>
  </div>`;
}

function listaDeRevisoes() {
  const lista = estado.revisoes;
  if (lista === null) return blocoDeEstado({ estado: "carregando", titulo: "Carregando revisões" });
  if (lista.erro) return blocoDeEstado({ estado: lista.erro.estado, titulo: lista.erro.mensagem ?? "Não deu para carregar", acao: '<button type="button" class="btn btn--secondary btn--sm" data-acao="carregar-revisoes">Tentar de novo</button>' });
  const atual = revisaoAtual();
  const aprovadas = new Set((estado.aprovacoesConhecidas ?? []).map((a) => a.revision));
  return `<ol class="rev-list">${lista.map((r, i) => {
    const anterior = lista[i + 1]?.revision;
    const tags = [r.revision === atual ? '<span class="version-state" data-estado="rascunho">atual</span>' : "", aprovadas.has(r.revision) ? `<span class="version-state" data-estado="${estado.aprovacao?.revision === r.revision ? "aprovado" : "correcao"}">${estado.aprovacao?.revision === r.revision ? "aprovada" : "aprovação antiga"}</span>` : ""].join("");
    return `<li class="rev"><span class="rev__num">r${r.revision}</span><div class="rev__body"><p class="rev__who">${html(autor(r.actor_id))} ${tags}</p><p class="rev__when">${formatar.data(r.created_at)} · ${formatar.hora(new Date(r.created_at))}</p></div>
      ${anterior ? `<button type="button" class="btn btn--ghost btn--sm" data-comparar="${anterior}:${r.revision}" aria-label="Comparar r${anterior} com r${r.revision}">${icone("camadas", "icon icon--sm")}r${anterior} × r${r.revision}</button>` : ""}</li>`;
  }).join("")}</ol>
  <p class="field__hint">A v1 publicada (02/11, Equipe, fictícia) é a base de comparação. Publicar continua desligado.</p>`;
}

function avaliacaoOficial() {
  const a = estado.avaliacao;
  const passos = `<ol class="howto">
    <li><span>Baixe a entrada com o rascunho, a v1 como base, os cenários e o perfil.</span><button type="button" class="btn btn--secondary btn--sm" data-acao="baixar-entrada">${icone("exportar", "icon icon--sm")}entrada.json</button></li>
    <li><span>No motor (flow-bot, PR #18), rode:</span><code class="cmd">node packages/server/bin/studio-offline.mjs entrada.json &gt; saida.json</code></li>
    <li><span>Importe a saída aqui.</span><label class="btn btn--secondary btn--sm file-btn">${icone("importar", "icon icon--sm")}saida.json<input type="file" id="saida-ponte" accept="application/json,.json" class="sr-only"></label></li>
  </ol>`;
  if (!a) return passos + `<p class="field__hint">Validador e simulador oficiais do motor, rodando na sua máquina. Quando a API de autoria estiver atrás do BFF, isto vira um botão.</p>`;
  if (!a.ok) return `${blocoDeEstado({ estado: "validacao", titulo: ERROS_DA_PONTE[a.erro] ?? a.erro, texto: a.problemas.length ? a.problemas.length + " problema(s) apontado(s) pelo motor." : "" })}
    ${a.problemas.length ? `<ul class="issue-list">${a.problemas.map((p) => `<li><button type="button" class="issue pressable" ${p.nodeId && noPorId(estado.rascunho, p.nodeId) ? `data-no="${html(p.nodeId)}"` : "disabled"}>${icone("alerta", "icon icon--sm")}<span><code>${html(p.code)}</code> ${html(p.message)}</span></button></li>`).join("")}</ul>` : ""}
    <details class="fold"><summary>Avaliar de novo</summary>${passos}</details>`;
  return `<div class="report">
    <p class="report__head">${a.cenariosOk ? icone("ok", "icon text-success") + "<strong>Todos os cenários passaram</strong>" : icone("alerta", "icon text-danger") + "<strong>" + a.relatorios.filter((r) => !r.ok).length + " cenário(s) falharam</strong>"} <span class="t-faint">· modo ${html(a.modo)} · não aprova nem publica</span></p>
    <ul class="plain-list">${a.relatorios.map((r) => `<li><details class="fold fold--flat"${r.ok ? "" : " open"}><summary>${icone(r.ok ? "ok" : "alerta", "icon icon--sm " + (r.ok ? "text-success" : "text-danger"))}${html(r.nome)}<span class="fold__count">${r.passos.length} passos</span></summary>
      <ol class="report__steps">${r.passos.map((p) => `<li class="${p.falhas.length ? "is-fail" : ""}"><p><code>${html(p.entrada)}</code> → ${html(nomeDoStatus(p.status))}</p>${p.saidas.length ? `<p class="report__out">${p.saidas.map(html).join("<br>").replace(/\n/g, "<br>")}</p>` : ""}${p.falhas.map((f) => `<p class="report__fail">${html(f)}</p>`).join("")}</li>`).join("")}</ol></details></li>`).join("")}</ul>
    ${a.diff ? `<p class="field__hint">Diferença segundo o motor: ${a.diff.map((d) => `<code>${html(d.caminho)}</code>`).join(" ")}</p>` : ""}
    <details class="fold"><summary>Avaliar de novo</summary>${passos}</details>
  </div>`;
}

export function resumoDiff(d) {
  if (d.vazio) return "Sem diferenças";
  return [d.adicionados.length && `${d.adicionados.length} novo(s)`, d.removidos.length && `${d.removidos.length} removido(s)`, d.alterados.length && `${d.alterados.length} alterado(s)`, d.ligacoes.length && `${d.ligacoes.length} ligação(ões)`].filter(Boolean).join(" · ");
}
function valorLegivel(v) {
  if (v === undefined) return "—";
  if (Array.isArray(v)) return v.map((o) => (typeof o === "object" ? o.value + " " + o.label : o)).join(" · ");
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
export function detalheDiff(d, docs = { antes: publicada(), depois: estado.rascunho }) {
  if (d.vazio) return `<div class="empty-art">${personagem("guardiao", 48)}<p class="empty__title">Nada mudou</p><p class="empty__text">As duas versões são iguais.</p></div>`;
  const no = (id) => noPorId(estado.rascunho, id) ?? noPorId(publicada(), id) ?? noPorId(estado.comparar?.docB ?? { nodes: [] }, id) ?? noPorId(estado.comparar?.docA ?? { nodes: [] }, id) ?? { type: "" };
  return `<div class="diff">
    ${d.adicionados.map((id) => `<div class="diff__item diff__item--add"><p class="diff__title">${icone("mais", "icon icon--sm")}Novo · ${html(TIPOS[no(id).type]?.rotulo ?? "")} <button type="button" class="link-btn" data-no="${html(id)}">${html(id)}</button></p><p class="diff__new">${html(resumoDoNo(no(id)))}</p></div>`).join("")}
    ${d.removidos.map((id) => `<div class="diff__item diff__item--del"><p class="diff__title">${icone("menos", "icon icon--sm")}Removido · <code>${html(id)}</code></p></div>`).join("")}
    ${d.alterados.map((a) => `<div class="diff__item"><p class="diff__title">Alterado · ${html(TIPOS[no(a.id).type]?.rotulo ?? "")} <button type="button" class="link-btn" data-no="${html(a.id)}">${html(a.id)}</button></p>${a.campos.map((c) => `<p class="diff__field">${html(c.campo)}</p><p class="diff__old"><span class="sr-only">Antes: </span>${html(valorLegivel(c.antes))}</p><p class="diff__new"><span class="sr-only">Depois: </span>${html(valorLegivel(c.depois))}</p>`).join("")}</div>`).join("")}
    ${d.ligacoes.length ? `<div class="diff__item"><p class="diff__title">Ligações</p>${d.ligacoes.map((l) => { const [de, porta] = l.saida.split("→"); return `<p class="diff__edge"><code>${html(de)}</code> · ${html(nomeDaPorta(porta))}: ${l.antes ? `<s>${html(l.antes)}</s> → ` : ""}${l.depois ? html(l.depois) : "removida"}</p>`; }).join("")}</div>` : ""}
  </div>`;
}

/* ───────────────────────── Conflito ───────────────────────── */
export function folhaDeConflito() {
  const s = estado.sinc.estado; const c = s.conflito;
  if (s.estado !== "conflito" || !c) {
    const titulo = { sessao: "Sessão expirada", permissao: "Somente leitura", indisponivel: "Sem conexão", validacao: "Não foi salvo" }[s.estado] ?? "Salvamento";
    return { cabeca: `<div class="drawer__heading"><span class="t-label">Salvamento</span><h2 class="drawer__title" id="sinc-titulo">${titulo}</h2></div>`,
      corpo: `${blocoDeEstado({ estado: s.estado === "sessao" ? "erro" : s.estado, titulo: s.erro?.mensagem ?? MENSAGENS.internal_error, texto: "Tudo o que você fez continua nesta aba. Baixe as alterações se quiser guardar uma cópia." })}
        ${s.erro?.problemas?.length ? `<ul class="issue-list">${s.erro.problemas.map((p) => `<li><span class="issue">${icone("alerta", "icon icon--sm")}<span>${html(p.message ?? p.code)}</span></span></li>`).join("")}</ul>` : ""}`,
      rodape: `<button type="button" class="btn btn--secondary grow" data-acao="baixar-local">${icone("exportar")}Baixar minhas alterações</button>${s.estado === "indisponivel" ? '<button type="button" class="btn btn--primary grow" data-acao="tentar-de-novo">Tentar de novo</button>' : ""}` };
  }
  const a = c.analise;
  const lista = (d) => d.vazio ? '<p class="field__hint">Nenhuma.</p>' : `<ul class="change-list">${d.adicionados.map((id) => `<li><span class="change-tag change-tag--add">novo</span><code>${html(id)}</code></li>`).join("")}${d.alterados.map((x) => `<li><span class="change-tag">muda</span><span><code>${html(x.id)}</code> · ${x.campos.map((k) => html(k.campo)).join(", ")}</span></li>`).join("")}${d.removidos.map((id) => `<li><span class="change-tag change-tag--del">sai</span><code>${html(id)}</code></li>`).join("")}${d.ligacoes.length ? `<li><span class="change-tag">liga</span>${d.ligacoes.length} ligação(ões)</li>` : ""}</ul>`;
  return {
    cabeca: `<div class="drawer__heading"><span class="t-label">Conflito de revisão</span><h2 class="drawer__title" id="sinc-titulo">Sua base era a r${c.suaBase}; agora existe a r${c.revisaoAtual}</h2><p class="drawer__sub">Salva por ${html(autor(c.autor))}${c.quando ? " às " + formatar.hora(new Date(c.quando)) : ""}. Nada seu foi perdido.</p></div>`,
    corpo: a ? `<div class="conflict">
        <section class="conflict__side"><h3 class="section__title">Suas alterações <span>${resumoDiff(a.minhas)}</span></h3>${lista(a.minhas)}</section>
        <section class="conflict__side"><h3 class="section__title">Alterações da r${c.revisaoAtual} <span>${resumoDiff(a.delas)}</span></h3>${lista(a.delas)}</section>
      </div>
      ${a.sobrepostos.length ? `<div class="alert alert--danger">${icone("alerta")}<span><strong>Os dois mexeram em:</strong> ${a.sobrepostos.map((id) => `<code>${html(id)}</code>`).join(", ")}. Manter as suas apaga o que a outra pessoa fez nesses passos.</span></div>` : `<div class="alert alert--success">${icone("ok")}<span>Vocês mexeram em passos diferentes.</span></div>`}
      <p class="field__hint">Juntar as duas automaticamente ainda não existe. Escolha uma e, se precisar, refaça a outra parte à mão.</p>`
      : blocoDeEstado({ estado: "indisponivel", titulo: "Não deu para buscar a revisão nova", texto: "Suas alterações estão preservadas." }),
    rodape: `<button type="button" class="btn btn--ghost" data-acao="baixar-local" aria-label="Baixar minhas alterações">${icone("exportar")}</button>
      <button type="button" class="btn btn--secondary grow" data-acao="conflito-delas">Usar a r${c.revisaoAtual}</button>
      <button type="button" class="btn btn--primary grow" data-acao="conflito-minhas">Manter as minhas</button>`,
  };
}

export function sobreDemonstracao() {
  return {
    cabeca: `${personagem("flowbot", 36)}<div class="drawer__heading"><span class="t-label">Prévia</span><h2 class="drawer__title" id="demo-titulo">O que é real aqui</h2></div>`,
    corpo: `<ul class="truth">
      <li data-real="sim"><strong>Catálogo de passos e limites</strong><span>Cópia do catálogo do motor (flow-bot/v0).</span></li>
      <li data-real="sim"><strong>Regras de salvamento e aprovação</strong><span>Mesmas da API de autoria do motor (PR #21): revisão esperada, conflito, aprovação presa à revisão. Aqui guardadas só nesta aba.</span></li>
      <li data-real="sim"><strong>Avaliação oficial</strong><span>Entrada e saída da ponte offline do motor (PR #18). Você roda o motor e importa o resultado.</span></li>
      <li data-real="nao"><strong>Bot, negócio, revisões e proposta</strong><span>Fictícios. Revisões e aprovações somem ao recarregar.</span></li>
      <li data-real="nao"><strong>Simulador e cenários desta tela</strong><span>Prévia no navegador, com as mesmas regras de texto do motor; o oficial é o do motor.</span></li>
      <li data-real="nao"><strong>Publicar, WhatsApp e oficina com Claude</strong><span>Não conectados. Nada é enviado.</span></li>
    </ul>`,
  };
}
