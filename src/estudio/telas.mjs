// As cinco telas do Bot Studio. Só desenham a partir do estado; eventos ficam em app.mjs.
import { TIPOS, PAPEIS, nomeDaPorta, resumoDoNo, PORTAS_DE_ERRO } from "./catalogo.mjs";
import { compararVersoes, noPorId, saidasDe } from "./fluxo.mjs";
import { arvoreDoFluxo } from "./edicao.mjs";
import { PERSONAGENS, AGENTES_DA_OFICINA, ESTADO_DO_AGENTE, NOME_DO_TIPO } from "./agentes.mjs";
import { ERROS_DA_PONTE } from "./dados.mjs";
import { estado, publicada, problemas, alterado, REVISAO } from "./estado.mjs";
import { desenharCanvas } from "./canvas.mjs";
import { cabecalhoDoPasso, corpoDoPasso } from "./inspetor.mjs";
import { personagem, papelDo, marcaDoAgente } from "./personagens.mjs";
import { html, formatar, estadoOperacional, blocoDeEstado } from "../ui/componentes.mjs";
import { icone } from "../ui/icones.mjs";

const STATUS = { new: "Nova", running: "Rodando", waiting_input: "Esperando o cliente", completed: "Concluída", handed_off: "Com a equipe", failed: "Parou" };
export const nomeDoStatus = (s) => STATUS[s] ?? s;
const chipRevisao = () => `<span class="version-state" data-estado="${REVISAO[estado.revisao].chip}">${REVISAO[estado.revisao].rotulo}</span>`;
const agrupar = (lista) => { const m = new Map(); for (const p of lista) m.set(p.path, [...(m.get(p.path) ?? []), p]); return m; };

/* ───────────────────────── Cabeçalho do bot ───────────────────────── */
export function cabecalho() {
  const bot = estado.espaco.bots[0];
  const n = problemas().length;
  return `<header class="studio-head">
    <div class="studio-head__main">
      <p class="t-label studio-head__crumb">${html(estado.espaco.negocio)}</p>
      <h1 class="studio-head__title">${html(bot.nome)}</h1>
      <div class="studio-head__meta">
        ${chipRevisao()}
        ${alterado() ? estadoOperacional("nao-salvo", "Alterações não salvas") : estadoOperacional("vazio", "Igual à v1 publicada")}
        ${n ? `<button type="button" class="link-btn link-btn--warn" data-acao="ver-avisos">${icone("alerta", "icon icon--sm")}${n} aviso(s)</button>` : ""}
      </div>
    </div>
    <button type="button" class="demo-flag pressable" data-acao="sobre-demo" aria-haspopup="dialog">${estadoOperacional("demonstracao", "Demonstração")}<span class="demo-flag__more">${icone("info", "icon icon--sm")}<span class="sr-only">: o que é real nesta prévia</span></span></button>
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
  const personagens = PERSONAGENS.map((p) => `<li><button type="button" class="agent-card pressable" data-agente="${p.id}" style="--papel:${p.cor}">
      <span class="agent-card__face">${personagem(p.id, 44)}</span><span class="agent-card__count"><strong>${contagem[p.id] ?? 0}</strong> passos</span>
      <span class="agent-card__name">${html(p.nome)}</span>
      <span class="agent-card__job">${html(p.trabalho)}</span>
      <span class="agent-card__foot">${p.ferramentas.length} ferramenta(s)</span>
    </button></li>`).join("");
  const oficina = AGENTES_DA_OFICINA.map((a, i) => `<li class="chain__item"><button type="button" class="chain__btn pressable" data-agente="${a.id}">
      ${marcaDoAgente(a.tipo)}<span class="chain__text"><span class="chain__name">${html(a.nome)}</span><span class="chain__kind">${NOME_DO_TIPO[a.tipo]}</span></span>
    </button>${i < AGENTES_DA_OFICINA.length - 1 ? `<span class="chain__link" aria-hidden="true">${icone("seta", "icon icon--sm")}</span>` : ""}</li>`).join("");
  return `<div class="studio-stack view-enter">
    <section aria-labelledby="t-bots" class="block">
      <div class="block__head"><h2 class="block__title" id="t-bots">Bots</h2><span class="block__meta">${estado.espaco.bots.length} no espaço de demonstração</span></div>
      <ul class="plain-list list-surface">${bots}</ul>
    </section>
    <section aria-labelledby="t-time" class="block">
      <div class="block__head"><h2 class="block__title" id="t-time">Personagens do fluxo</h2><span class="block__meta">Cada passo é feito por um deles</span></div>
      <ul class="plain-list agent-grid">${personagens}</ul>
    </section>
    <section aria-labelledby="t-oficina" class="block">
      <div class="block__head"><h2 class="block__title" id="t-oficina">Agentes da oficina</h2><span class="block__meta">Ordem de trabalho da autoria</span></div>
      <ol class="plain-list chain">${oficina}</ol>
      <p class="field__hint">Nenhum agente está ativo: o motor não está conectado e a oficina com Claude está desligada.</p>
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
  return {
    cabeca: `${p ? personagem(id, 48) : marcaDoAgente(a.tipo)}<div class="drawer__heading"><span class="t-label">${p ? "Personagem do fluxo" : NOME_DO_TIPO[a.tipo]}</span><h2 class="drawer__title" id="agente-titulo">${html(ag.nome)}</h2></div>`,
    corpo: `<p class="lead-text">${html(p ? p.trabalho : a.funcao)}</p>
      <dl class="kv"><div><dt>Estado</dt><dd>${estadoOperacional(est.estado, est.texto)}</dd></div></dl>
      <section class="section"><h3 class="section__title">Responsabilidades</h3><ul class="bullet-list">${ag.responsabilidades.map((r) => `<li>${html(r)}</li>`).join("")}</ul></section>
      ${p ? `<section class="section"><h3 class="section__title">Ferramentas <span>${p.ferramentas.length}</span></h3><ul class="tool-list">${p.ferramentas.map((f) => `<li><code>${html(f.id)}</code><span>${html(f.rotulo)}</span></li>`).join("")}</ul></section>` : ""}
      <section class="section"><h3 class="section__title">Permissões</h3><ul class="bullet-list">${ag.permissoes.map((r) => `<li>${html(r)}</li>`).join("")}</ul></section>
      <section class="section"><h3 class="section__title">Conexões</h3>
        <div class="deps"><span class="deps__label">Recebe de</span><div class="deps__chips">${conexoes.entra.length ? conexoes.entra.map(chip).join("") : '<span class="t-faint">início</span>'}</div></div>
        <div class="deps"><span class="deps__label">Passa para</span><div class="deps__chips">${conexoes.sai.length ? conexoes.sai.map(chip).join("") : '<span class="t-faint">fim</span>'}</div></div>
      </section>
      ${p ? `<section class="section"><h3 class="section__title">Passos no rascunho <span>${passos.length}</span></h3>${passos.length ? `<div class="deps__chips">${passos.map((n) => `<button type="button" class="dep-chip pressable" data-no="${html(n.id)}">${html(n.id)}</button>`).join("")}</div>` : '<p class="field__hint">Nenhum passo deste personagem no rascunho.</p>'}</section>` : ""}
      <section class="section"><h3 class="section__title">Histórico de execução</h3>${blocoDeEstado({ estado: "desconectado", titulo: "Sem execuções registradas", texto: "O histórico vem do motor. Nesta prévia ele não está conectado, então nenhum agente rodou." })}</section>`,
  };
}

/* ───────────────────────── 2. Fluxo ───────────────────────── */
export function telaFluxo({ largo }) {
  const lista = problemas(); const porNo = agrupar(lista);
  const barra = `<div class="flow-bar">
      <div class="flow-bar__info">${lista.length ? `<span class="op-state" data-estado="validacao">${lista.length} aviso(s) na conferência</span>` : estadoOperacional("conectado", "Estrutura ok")}<span class="flow-bar__count">${estado.rascunho.nodes.length} passos</span></div>
      <div class="flow-bar__actions">
        <button type="button" class="btn btn--ghost btn--icon btn--sm" data-acao="desfazer" aria-label="Desfazer" data-tip="Desfazer" ${estado.desfazer.length ? "" : "disabled"}>${icone("desfazer")}</button>
        ${largo ? `<div class="segmented" role="group" aria-label="Forma de ver o fluxo">
          <button type="button" data-vista="mapa" aria-pressed="${estado.vistaFluxo === "mapa"}">${icone("fluxo", "icon icon--sm")}Mapa</button>
          <button type="button" data-vista="passos" aria-pressed="${estado.vistaFluxo === "passos"}">${icone("lista", "icon icon--sm")}Passos</button></div>` : ""}
        <button type="button" class="btn btn--primary btn--sm flow-bar__add" data-acao="novo-passo">${icone("mais")}Adicionar passo</button>
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

function painelLateral(lista) {
  const no = estado.selecionado && noPorId(estado.rascunho, estado.selecionado);
  if (no) {
    return `<div class="side-panel__head">${cabecalhoDoPasso(no, { titulo: "lateral-titulo" })}<button type="button" class="btn btn--ghost btn--icon" data-acao="desselecionar" aria-label="Fechar painel do passo">${icone("fechar")}</button></div>
      <div class="side-panel__body">${corpoDoPasso(estado.rascunho, no, lista.filter((p) => p.path === no.id))}</div>`;
  }
  return `<div class="side-panel__head"><div class="drawer__heading"><span class="t-label">Fluxo</span><h2 class="drawer__title">${html(estado.rascunho.flow.name)}</h2></div></div>
    <div class="side-panel__body">
      ${lista.length ? `<section class="section"><h3 class="section__title">Conferência <span>${lista.length}</span></h3><ul class="issue-list">${lista.map((p) => `<li><button type="button" class="issue pressable" data-no="${html(noPorId(estado.rascunho, p.path) ? p.path : "")}">${icone("alerta", "icon icon--sm")}<span><strong>${html(noPorId(estado.rascunho, p.path) ? p.path : "fluxo")}</strong> ${html(p.message)}</span></button></li>`).join("")}</ul></section>`
        : blocoDeEstado({ estado: "conectado", titulo: "Estrutura ok", texto: "Toda saída obrigatória está ligada e todo passo é alcançado. Quem valida de verdade é o motor; veja Versões → Avaliação oficial." })}
      <section class="section"><h3 class="section__title">Como ler o mapa</h3>
        <ul class="legend-list">
          <li><span class="legend-line"></span>Caminho normal</li>
          <li><span class="legend-line legend-line--error"></span>Saída de erro (sem resposta, inválido, outra resposta)</li>
          <li><span class="legend-line legend-line--return"></span>Retorno com limite de vezes</li>
        </ul>
        <p class="field__hint">Toque num passo para editar. Arraste o fundo para mover; Ctrl + roda ou os botões para zoom; F enquadra.</p>
      </section>
    </div>`;
}

function arvore(porNo) {
  const itens = arvoreDoFluxo(estado.rascunho);
  return `<ol class="tree" aria-label="Passos do fluxo">${itens.map((it) => {
    const via = it.via ? `<span class="tree__via${PORTAS_DE_ERRO.has(it.via) || it.via === "retorno" ? " tree__via--error" : ""}">${it.via === "retorno" ? icone("retorno", "icon icon--xs") + "volta para" : html(nomeDaPorta(it.via))}</span>` : "";
    const recuo = `style="--nivel:${Math.min(it.nivel, 4)}"`;
    if (it.faltando) return `<li class="tree__item tree__item--missing" ${recuo}>${via}<button type="button" class="tree__missing pressable" data-no="${html(it.de)}">${icone("alerta", "icon icon--sm")}Falta ligar esta saída</button></li>`;
    if (it.referencia) return `<li class="tree__item tree__item--ref" ${recuo}>${via}<button type="button" class="tree__ref pressable" data-no="${html(it.id)}">${icone("seta", "icon icon--xs")}vai para <strong>${html(it.id)}</strong></button></li>`;
    const no = noPorId(estado.rascunho, it.id); const papel = papelDo(no); const avisos = porNo.get(no.id)?.length ?? 0;
    return `<li class="tree__item" ${recuo}>${via}<button type="button" class="tree__node pressable${avisos ? " tree__node--warn" : ""}" data-no="${html(no.id)}" ${estado.selecionado === no.id ? 'aria-current="true"' : ""} style="--papel:${PAPEIS[papel].cor}">
      ${personagem(papel, 26)}
      <span class="tree__text"><span class="tree__title"><span class="tree__type">${html(TIPOS[no.type]?.rotulo ?? no.type)}</span><span class="tree__id">${html(no.id)}</span>${it.solto ? '<span class="tree__flag">solto</span>' : ""}</span><span class="tree__summary">${html(resumoDoNo(no))}</span></span>
      ${avisos ? icone("alerta", "icon icon--sm tree__warn") : icone("seta", "icon icon--sm tree__go")}
    </button></li>`;
  }).join("")}</ol>`;
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
export { painelLateral };

/* ───────────────────────── 3. Oficina ───────────────────────── */
export function telaOficina() {
  const r = estado.resultado;
  const etapa = !r ? 1 : estado.revisao === "rascunho" && !usandoProposta() ? 2 : 3;
  const passos = ["Pedido", "Proposta", "Revisão"];
  return `<div class="view-enter studio-stack">
    <ol class="stepper" aria-label="Etapas da oficina">${passos.map((n, i) => `<li class="stepper__item" data-estado="${i + 1 < etapa ? "feito" : i + 1 === etapa ? "atual" : "depois"}" ${i + 1 === etapa ? 'aria-current="step"' : ""}><span class="stepper__dot">${i + 1 < etapa ? icone("check", "icon icon--xs") : i + 1}</span>${n}</li>`).join("")}</ol>
    <div class="workshop">
      <section class="workshop__brief" aria-labelledby="t-pedido">
        <h2 class="block__title" id="t-pedido">Pedido</h2>
        <div class="field"><label class="field__label" for="briefing">O que o bot deve fazer</label>
          <textarea class="textarea" id="briefing" maxlength="6000" rows="5">${html(estado.briefing)}</textarea>
          <span class="field__hint field__hint--row"><span>Em palavras simples, com regras e exceções.</span><span data-contador="briefing">${estado.briefing.length}/6000</span></span></div>
        <fieldset class="fieldset"><legend class="field__label">Fatos do negócio <span class="t-faint">${html(estado.espaco.perfil.id)}</span></legend>
          <div class="facts">${estado.espaco.perfil.facts.map((f, i) => `<div class="fact"><label class="fact__name" for="fato-${i}"><code>${html(f.name)}</code><span>${html(f.description)}</span></label>
            <input class="input" id="fato-${i}" data-fato="${i}" value="${html(Array.isArray(f.example) ? f.example.join(", ") : f.example)}"></div>`).join("")}</div>
          <p class="field__hint">O fluxo só lê esses fatos por <code>reality.*</code>. O que faltar aqui vira lacuna, nunca invenção.</p>
        </fieldset>
        <div class="workshop__ask">
          <button type="button" class="btn btn--primary" disabled aria-describedby="oficina-off">${icone("faisca")}Pedir proposta</button>
          <p class="field__hint" id="oficina-off">${estadoOperacional("indisponivel", "Oficina com Claude desligada")} · até 2 pedidos por dia quando ligada.</p>
          ${r ? "" : `<button type="button" class="btn btn--secondary" data-acao="exemplo-oficina">${icone("arquivo")}Abrir proposta de exemplo</button>`}
        </div>
      </section>
      <section class="workshop__result" id="resultado" aria-labelledby="t-proposta">
        <h2 class="block__title" id="t-proposta">Proposta ${r ? '<span class="t-faint t-small">· exemplo fictício, nenhum agente rodou</span>' : ""}</h2>
        ${r ? proposta(r) : `<div class="empty-art">${personagem("flowbot", 56)}<p class="empty__title">Nenhuma proposta ainda</p><p class="empty__text">Com a oficina ligada, a proposta chega aqui com lacunas, testes e a diferença para a versão publicada. Nada é publicado sem a sua revisão.</p></div>`}
      </section>
    </div>
  </div>`;
}
const usandoProposta = () => estado.resultado && compararVersoes(estado.resultado.flow, estado.rascunho).vazio;

function proposta(r) {
  const pronto = r.status === "ready_for_review";
  const diff = compararVersoes(publicada(), r.flow);
  const usando = usandoProposta();
  return `<div class="proposal">
    <div class="proposal__stats">
      <span class="version-state" data-estado="${pronto ? "revisao" : "correcao"}">${pronto ? "Pronta para revisão" : "Precisa de correção"}</span>
      <span>${r.flow.nodes.length} passos</span><span>${r.scenarios.length} cenários</span><span>${formatar.numero(r.usage.inputTokens + r.usage.outputTokens)} tokens</span>
    </div>
    <details class="fold" open><summary>${icone("alerta", "icon icon--sm text-warning")}Lacunas <span class="fold__count">${r.gaps.length}</span></summary>
      ${r.gaps.length ? `<ul class="bullet-list">${r.gaps.map((g) => `<li>${html(g)}</li>`).join("")}</ul>` : '<p class="field__hint">Nenhuma lacuna.</p>'}</details>
    <details class="fold"><summary>${icone("ok", "icon icon--sm text-success")}Testes <span class="fold__count">${r.tests.filter((t) => t.ok).length}/${r.tests.length}</span></summary>
      <ul class="plain-list">${r.tests.map((t) => `<li class="test-row">${icone(t.ok ? "ok" : "alerta", "icon icon--sm " + (t.ok ? "text-success" : "text-danger"))}<span>${html(t.name)}</span></li>`).join("")}</ul>
      <p class="field__hint">${r.checkedAgainstIndependentTests ? r.independentTests + " testes independentes do operador também conferidos (exemplo)." : "Sem testes independentes: continua precisando de correção."}</p></details>
    <details class="fold"><summary>${icone("camadas", "icon icon--sm")}Problemas estruturais <span class="fold__count">${r.problems.length}</span></summary>
      ${r.problems.length ? `<ul class="bullet-list">${r.problems.map((p) => `<li><code>${html(p.code)}</code> ${html(p.message)}</li>`).join("")}</ul>` : '<p class="field__hint">Nenhum.</p>'}</details>
    <div class="proposal__diff"><span>${resumoDiff(diff)}</span><button type="button" class="link-btn" data-ir="versoes">Ver diferença</button></div>
    ${usando ? `<p class="proposal__using">${icone("ok", "icon icon--sm")}Esta proposta é o rascunho atual.</p>` : `<button type="button" class="btn btn--secondary" data-acao="usar-proposta">${icone("fluxo")}Usar como rascunho</button>`}
    ${revisao(usando)}
  </div>`;
}

function revisao(usando) {
  if (estado.revisao === "aprovado") {
    return `<section class="review review--done" aria-labelledby="t-revisao"><h3 class="review__title" id="t-revisao">Revisão</h3>
      ${blocoDeEstado({ estado: "conectado", titulo: "Aprovado nesta tela", texto: "A aprovação não foi gravada: o motor ainda não tem esse registro. Qualquer edição no rascunho desfaz a aprovação." })}
      <button type="button" class="btn btn--primary btn--block" disabled aria-describedby="pub-off">Publicar v2</button>
      <p class="field__hint" id="pub-off">Publicação desligada nesta fase. Nada vai para o WhatsApp.</p>
      <button type="button" class="btn btn--ghost btn--sm" data-acao="desfazer-aprovacao">Desfazer aprovação</button></section>`;
  }
  const c = estado.checklist; const tudo = c.estrutura && c.lacunas && c.simulei;
  const pode = usando && estado.revisao !== "correcao";
  return `<section class="review" aria-labelledby="t-revisao"><h3 class="review__title" id="t-revisao">Revisão humana</h3>
    ${estado.revisao === "correcao" ? `<div class="alert alert--danger">${icone("alerta")}<span>Correção pedida. Ajuste o rascunho no editor; a revisão recomeça.</span></div>` : ""}
    <div class="checklist" role="group" aria-label="Antes de aprovar">
      ${[["estrutura", "Li a estrutura e os textos"], ["lacunas", "Decidi o que fazer com as lacunas"], ["simulei", "Simulei a conversa"]].map(([k, t]) => `<label class="check"><input type="checkbox" data-checar="${k}" ${c[k] ? "checked" : ""} ${pode ? "" : "disabled"}><span>${t}</span></label>`).join("")}
    </div>
    <div class="review__actions">
      <button type="button" class="btn btn--secondary grow" data-acao="pedir-correcao" ${pode ? "" : "disabled"}>Pedir correção</button>
      <button type="button" class="btn btn--primary grow" data-acao="aprovar" ${pode && tudo ? "" : "disabled"}>${icone("check")}Aprovar</button>
    </div>
    ${usando ? "" : '<p class="field__hint">Use a proposta como rascunho para revisar.</p>'}
  </section>`;
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
        <div class="phone__who"><p class="phone__name">${html(estado.espaco.negocio)}</p><p class="phone__status">${s ? html(nomeDoStatus(s.status)) : "simulação no navegador"} · ${estado.simVersao === "publicada" ? "v1" : "rascunho"}</p></div>
        ${largo ? "" : `<button type="button" class="btn btn--ghost btn--icon" data-acao="detalhes-sim" aria-label="Detalhes da simulação" aria-haspopup="dialog">${icone("ajustes")}</button>`}
        <button type="button" class="btn btn--ghost btn--icon" data-acao="reiniciar" aria-label="Recomeçar conversa">${icone("desfazer")}</button>
      </header>
      <div class="phone__chat" id="chat" role="log" aria-live="polite" aria-label="Mensagens">
        <p class="chat-note">${icone("cadeado", "icon icon--xs")}Conversa fictícia. Nada é enviado.</p>
        ${estado.mensagens.length ? "" : `<div class="chat-start"><p>Escreva como se fosse o cliente.</p><div class="chat-start__chips">${["oi", "bom dia", "quero agendar"].map((t) => `<button type="button" class="chip pressable" data-dizer="${t}">${t}</button>`).join("")}</div></div>`}
        ${estado.mensagens.map((m) => bolha(m, m === ultimaBot && esperando)).join("")}
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

function bolha(m, ativa) {
  if (m.de === "cliente") return `<div class="bubble bubble--out"><p>${html(m.texto)}</p><span class="bubble__time">${m.hora}</span></div>`;
  const opcoes = m.opcoes ? `<div class="bubble__options" role="group" aria-label="Respostas rápidas">${m.opcoes.map((o) => `<button type="button" class="reply-btn" data-resposta="${html(o.value)}" data-rotulo="${html(o.label)}" ${ativa ? "" : "disabled"}>${html(o.label)}</button>`).join("")}</div>` : "";
  return `<div class="bubble bubble--in${m.opcoes ? " bubble--menu" : ""}"><p>${html(m.texto)}</p><span class="bubble__time">${m.hora}</span>${opcoes}</div>`;
}

export function detalhesDaSimulacao() {
  const s = estado.conversa; const doc = estado.simVersao === "publicada" ? publicada() : estado.rascunho;
  const atual = s?.cursor && noPorId(doc, s.cursor);
  return `<div class="sim-panel">
    <div class="field"><span class="field__label" id="sim-versao">Versão</span>
      <div class="segmented segmented--block" role="group" aria-labelledby="sim-versao">
        <button type="button" data-sim-versao="rascunho" aria-pressed="${estado.simVersao === "rascunho"}">Rascunho</button>
        <button type="button" data-sim-versao="publicada" aria-pressed="${estado.simVersao === "publicada"}">v1 publicada</button></div></div>
    <div class="field"><label class="field__label" for="contato">Primeiro nome do contato</label><input class="input" id="contato" value="${html(estado.contato)}" maxlength="40" autocomplete="off"></div>
  </div>
  <section class="sim-panel"><h3 class="section__title">Etapa atual</h3>
    ${atual ? `<button type="button" class="step-now pressable" data-no="${html(atual.id)}">${personagem(papelDo(atual), 24)}<span><strong>${html(atual.id)}</strong><small>${html(TIPOS[atual.type]?.rotulo)} · ${html(nomeDoStatus(s.status))}</small></span></button>`
      : `<p class="field__hint">${s ? html(nomeDoStatus(s.status)) : "Mande uma mensagem para começar."}</p>`}
    <h3 class="section__title">Caminho</h3>
    ${s?.caminho.length ? `<ol class="trail">${s.caminho.map((id, i) => `<li class="${i === s.caminho.length - 1 ? "is-last" : ""}">${html(id)}</li>`).join("")}</ol>` : '<p class="field__hint">—</p>'}
    <h3 class="section__title">Variáveis</h3>
    ${s && Object.keys(s.variaveis).length ? `<dl class="vars">${Object.entries(s.variaveis).map(([k, v]) => `<div><dt>${html(k)}</dt><dd>${html(v)}</dd></div>`).join("")}</dl>` : '<p class="field__hint">Nenhuma ainda.</p>'}
  </section>
  <section class="sim-panel"><h3 class="section__title">Comparar versões</h3>${comparacao()}</section>
  <p class="field__hint">Prévia que anda pelo fluxo no navegador. Para o resultado oficial, use Versões → Avaliação oficial.</p>`;
}

function comparacao() {
  if (!estado.entradas.length) return '<p class="field__hint">Depois de conversar, veja como a mesma conversa termina na outra versão.</p>';
  const c = estado.comparacao;
  if (!c) return `<button type="button" class="btn btn--secondary btn--sm" data-acao="comparar-sim">${icone("camadas")}Repetir na ${estado.simVersao === "publicada" ? "versão rascunho" : "v1 publicada"}</button>`;
  return `<div class="compare${c.igual ? "" : " compare--diff"}"><p><strong>${c.igual ? "Mesmo resultado" : "Resultado diferente"}</strong> na ${html(c.outra)}: ${html(nomeDoStatus(c.status))}${c.cursor ? " em " + html(c.cursor) : ""}.</p>
    ${c.igual ? "" : `<p class="field__hint">Última resposta lá: “${html(c.ultima ?? "—")}”</p>`}</div>`;
}

/* ───────────────────────── 5. Versões ───────────────────────── */
export function telaVersoes() {
  const diff = compararVersoes(publicada(), estado.rascunho);
  const ordem = ["rascunho", "revisao", "aprovado", "publicado"];
  const atual = estado.revisao === "correcao" ? 1 : ordem.indexOf(estado.revisao);
  const ciclo = [
    ["Rascunho", "rascunho", "motor: flows.status = draft"],
    [estado.revisao === "correcao" ? "Precisa de correção" : "Em revisão", estado.revisao === "correcao" ? "correcao" : "revisao", "interface: revisão humana"],
    ["Aprovado", "aprovado", "interface: ainda não gravado"],
    ["Publicado", "publicado", "motor: flow_versions (desligado)"],
  ];
  return `<div class="view-enter versions">
    <section class="block" aria-labelledby="t-ciclo">
      <div class="block__head"><h2 class="block__title" id="t-ciclo">Próxima versão</h2>${chipRevisao()}</div>
      <ol class="cycle">${ciclo.map(([n, chip, origem], i) => `<li class="cycle__step" data-estado="${i < atual ? "feito" : i === atual ? "atual" : "depois"}" ${i === atual ? 'aria-current="step"' : ""}><span class="version-state" data-estado="${chip}">${n}</span><span class="cycle__src">${origem}</span></li>`).join("")}</ol>
    </section>
    <div class="versions__grid">
      <section class="block" aria-labelledby="t-diff">
        <div class="block__head"><h2 class="block__title" id="t-diff">Rascunho × v1 publicada</h2><span class="block__meta">${resumoDiff(diff)}</span></div>
        ${detalheDiff(diff)}
      </section>
      <div class="studio-stack">
        <section class="block" aria-labelledby="t-oficial">
          <div class="block__head"><h2 class="block__title" id="t-oficial">Avaliação oficial</h2>${estado.avaliacao ? estadoOperacional(estado.avaliacao.ok && estado.avaliacao.cenariosOk ? "conectado" : "erro", "Resultado importado") : estadoOperacional("desconectado", "Motor não conectado")}</div>
          ${avaliacaoOficial()}
        </section>
        <section class="block" aria-labelledby="t-hist">
          <div class="block__head"><h2 class="block__title" id="t-hist">Histórico</h2><span class="block__meta">Mais recente primeiro</span></div>
          <ol class="timeline">
            ${estado.eventos.map((e) => `<li class="timeline__item"><span class="timeline__dot" data-tipo="${e.tipo}"></span><div><p class="timeline__text">${html(e.texto)}</p><p class="timeline__when">${formatar.hora(e.quando)} · nesta aba</p></div></li>`).join("")}
            ${estado.espaco.historico.map((v) => `<li class="timeline__item"><span class="timeline__dot" data-tipo="publicado"></span><div><p class="timeline__text"><span class="version-state" data-estado="publicado">v${v.versao} publicada</span> ${html(v.nota)}</p><p class="timeline__when">${formatar.data(v.quando)} · ${html(v.autor)} (fictício)</p></div></li>`).join("")}
          </ol>
        </section>
      </div>
    </div>
  </div>`;
}

function avaliacaoOficial() {
  const a = estado.avaliacao;
  const passos = `<ol class="howto">
    <li><span>Baixe a entrada com o rascunho, a v1 como base, os cenários e o perfil.</span><button type="button" class="btn btn--secondary btn--sm" data-acao="baixar-entrada">${icone("exportar", "icon icon--sm")}entrada.json</button></li>
    <li><span>No motor (flow-bot, PR #18), rode:</span><code class="cmd">node packages/server/bin/studio-offline.mjs entrada.json &gt; saida.json</code></li>
    <li><span>Importe a saída aqui.</span><label class="btn btn--secondary btn--sm file-btn">${icone("importar", "icon icon--sm")}saida.json<input type="file" id="saida-ponte" accept="application/json,.json" class="sr-only"></label></li>
  </ol>`;
  if (!a) return passos + `<p class="field__hint">É o validador e o simulador oficiais do motor, rodando na sua máquina. Nada é enviado daqui.</p>`;
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

function resumoDiff(d) {
  if (d.vazio) return "Sem diferenças";
  return [d.adicionados.length && `${d.adicionados.length} novo(s)`, d.removidos.length && `${d.removidos.length} removido(s)`, d.alterados.length && `${d.alterados.length} alterado(s)`, d.ligacoes.length && `${d.ligacoes.length} ligação(ões)`].filter(Boolean).join(" · ");
}
function valorLegivel(v) {
  if (v === undefined) return "—";
  if (Array.isArray(v)) return v.map((o) => (typeof o === "object" ? o.value + " " + o.label : o)).join(" · ");
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
function detalheDiff(d) {
  if (d.vazio) return `<div class="empty-art">${personagem("guardiao", 48)}<p class="empty__title">Nada mudou</p><p class="empty__text">O rascunho está igual à v1. Edite um passo ou use a proposta da oficina.</p></div>`;
  const no = (id) => noPorId(estado.rascunho, id) ?? noPorId(publicada(), id);
  return `<div class="diff">
    ${d.adicionados.map((id) => `<div class="diff__item diff__item--add"><p class="diff__title">${icone("mais", "icon icon--sm")}Novo · ${html(TIPOS[no(id).type]?.rotulo)} <button type="button" class="link-btn" data-no="${html(id)}">${html(id)}</button></p><p class="diff__new">${html(resumoDoNo(no(id)))}</p></div>`).join("")}
    ${d.removidos.map((id) => `<div class="diff__item diff__item--del"><p class="diff__title">${icone("menos", "icon icon--sm")}Removido · <code>${html(id)}</code></p></div>`).join("")}
    ${d.alterados.map((a) => `<div class="diff__item"><p class="diff__title">Alterado · ${html(TIPOS[no(a.id).type]?.rotulo)} <button type="button" class="link-btn" data-no="${html(a.id)}">${html(a.id)}</button></p>${a.campos.map((c) => `<p class="diff__field">${html(c.campo)}</p><p class="diff__old"><span class="sr-only">Antes: </span>${html(valorLegivel(c.antes))}</p><p class="diff__new"><span class="sr-only">Depois: </span>${html(valorLegivel(c.depois))}</p>`).join("")}</div>`).join("")}
    ${d.ligacoes.length ? `<div class="diff__item"><p class="diff__title">Ligações</p>${d.ligacoes.map((l) => { const [de, porta] = l.saida.split("→"); return `<p class="diff__edge"><code>${html(de)}</code> · ${html(nomeDaPorta(porta))}: ${l.antes ? `<s>${html(l.antes)}</s> → ` : ""}${l.depois ? html(l.depois) : "removida"}</p>`; }).join("")}</div>` : ""}
  </div>`;
}

export function sobreDemonstracao() {
  return {
    cabeca: `${personagem("flowbot", 36)}<div class="drawer__heading"><span class="t-label">Prévia</span><h2 class="drawer__title" id="demo-titulo">O que é real aqui</h2></div>`,
    corpo: `<ul class="truth">
      <li data-real="sim"><strong>Catálogo de passos e limites</strong><span>Cópia do catálogo do motor (flow-bot/v0).</span></li>
      <li data-real="sim"><strong>Avaliação oficial</strong><span>A entrada e a saída seguem a ponte offline do motor (PR #18). Você roda o motor e importa o resultado.</span></li>
      <li data-real="nao"><strong>Bot, negócio, versões e proposta</strong><span>Fictícios, em src/estudio/demonstracao.mjs.</span></li>
      <li data-real="nao"><strong>Simulador desta tela</strong><span>Prévia no navegador; o oficial é o do motor.</span></li>
      <li data-real="nao"><strong>Aprovar e publicar</strong><span>Aprovação só na tela; publicar desligado.</span></li>
      <li data-real="nao"><strong>WhatsApp e oficina com Claude</strong><span>Não conectados. Nada é enviado.</span></li>
    </ul>`,
  };
}
