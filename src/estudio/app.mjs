// Bot Studio — prévia visual. Mostra agentes, editor de fluxo, oficina de autoria, simulador e versões
// sobre os contratos do motor (flow-bot/v0). Nesta fase nada se conecta: o motor, o WhatsApp e a oficina
// com Claude ficam desligados, e todo dado vem de demonstracao.mjs, marcado como fictício na tela.
import { TIPOS, PAPEIS, LIMITES, PORTAS_DE_ERRO, portasDoNo, nomeDaPorta, resumoDoNo } from "./catalogo.mjs";
import { conferirFluxo, organizarFluxo, iniciarConversa, responder, esgotarPrazo, compararVersoes, noPorId, saidasDe, copiar } from "./fluxo.mjs";
import {
  NEGOCIO_FICTICIO, versaoPublicada, resultadoDeExemplo, briefingDeExemplo, perfilDeExemplo, historicoDeExemplo, botsDeExemplo,
} from "./demonstracao.mjs";
import { icone } from "../ui/icones.mjs";
import { html, formatar, aviso, prenderFoco, temaAtual, aplicarTema, alternarMenu, fecharMenus } from "../ui/componentes.mjs";

const TELAS = [
  { id: "agentes", nome: "Agentes", curto: "Agentes", icone: "agente" },
  { id: "fluxo", nome: "Fluxo", curto: "Fluxo", icone: "fluxo" },
  { id: "oficina", nome: "Oficina", curto: "Oficina", icone: "faisca" },
  { id: "simulador", nome: "Simulador", curto: "Simular", icone: "conversa" },
  { id: "versoes", nome: "Versões", curto: "Versões", icone: "relogio" },
];
const ROTULO_DA_REVISAO = {
  null: "Rascunho", pronto: "Pronto para revisão", precisa: "Precisa de revisão", aprovado: "Aprovado",
};
const STATUS_DA_CONVERSA = {
  new: "Nova", running: "Rodando", waiting_input: "Esperando o cliente", completed: "Concluída",
  handed_off: "Com a equipe", failed: "Parou",
};

const publicada = versaoPublicada();
const estado = {
  tela: lerTela(),
  rascunho: comoRascunho(publicada),
  alterado: false,            // rascunho diferente da v1
  revisao: null,              // null | "pronto" | "precisa" | "aprovado" — só na interface
  vistaFluxo: matchMedia("(min-width: 1024px)").matches ? "mapa" : "lista",
  selecionado: null,
  briefing: briefingDeExemplo,
  perfil: perfilDeExemplo.map((f) => ({ ...f })),
  resultado: null,
  conferido: false,
  simVersao: "rascunho",
  contato: "Ana",
  conversa: null, mensagens: [],
};
let soltarFoco = null; let focoAnterior = null;
const $ = (s, r = document) => r.querySelector(s);

function comoRascunho(doc) { const d = copiar(doc); d.flow.status = "draft"; return d; }
function lerTela() { const h = location.hash.slice(1); return TELAS.some((t) => t.id === h) ? h : "agentes"; }

/* ───────────── Personagens (formas de docs/identidade/agentes.md, acabamento liso) ───────────── */
const FORMAS = {
  flowbot: (c) => `<path d="${bracos(6, 34)}" stroke="${c}" stroke-width="28" stroke-linecap="round" fill="none"/><circle cx="50" cy="52" r="27" fill="${c}"/>`,
  recepcionista: (c) => `<path d="M12,48C12,25 29,11 50,11C71,11 88,25 88,48C88,70 71,83 50,83C44,83 38,82 33,80L17,90L21,71C15,65 12,57 12,48Z" fill="${c}"/>`,
  qualificador: (c) => `<path d="${estrela()}" fill="${c}" stroke="${c}" stroke-width="12" stroke-linejoin="round"/>`,
  passador: (c) => `<path d="M12,50 L88,18 L64,86 L48,60 Z" fill="${c}" stroke="${c}" stroke-width="12" stroke-linejoin="round"/>`,
  guardiao: (c) => `<path d="M50,86 C20,64 12,48 16,34 C20,20 38,16 50,30 C62,16 80,20 84,34 C88,48 80,64 50,86 Z" fill="${c}" stroke="${c}" stroke-width="10" stroke-linejoin="round"/>`,
};
const OLHOS = { flowbot: [50, "#fff"], recepcionista: [46, "#0B0B0B"], qualificador: [54, "#0B0B0B"], passador: [46, "#0B0B0B"], guardiao: [46, "#fff"] };
function bracos(n, l) { let d = ""; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; d += `M50,52 L${(50 + l * Math.cos(a)).toFixed(1)},${(52 + l * Math.sin(a)).toFixed(1)} `; } return d; }
function estrela() { let q = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 20 : 42; q += (i ? "L" : "M") + (50 + r * Math.cos(a)).toFixed(1) + "," + (54 + r * Math.sin(a)).toFixed(1); } return q + "Z"; }
function personagem(papel, tamanho = 28) {
  const [y, cor] = OLHOS[papel];
  return `<svg class="persona" width="${tamanho}" height="${tamanho}" viewBox="0 0 100 100" aria-hidden="true">${FORMAS[papel](PAPEIS[papel].cor)}<circle cx="41" cy="${y}" r="4.8" fill="${cor}"/><circle cx="59" cy="${y}" r="4.8" fill="${cor}"/></svg>`;
}
const papelDo = (no) => TIPOS[no.type]?.papel ?? "flowbot";

/* ───────────────────────── Estrutura ───────────────────────── */
function montarEstrutura() {
  const tema = temaAtual();
  document.body.innerHTML = `
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <div class="shell">
    <aside class="sidebar" aria-label="Menu do FlowBot">
      <a class="brand" href="../"><img src="../assets/flowbot-symbol.svg" alt="" width="26" height="26">flowbot</a>
      <nav aria-label="Módulos" class="nav-group">
        <span class="t-label nav-group__label">Comercial</span>
        <a class="nav-item" href="../">${icone("alvo")}Prospecção</a>
        <span class="t-label nav-group__label">Automação · prévia</span>
        <a class="nav-item" href="./" aria-current="page">${icone("fluxo")}Bot Studio</a>
      </nav>
      <div class="sidebar__foot">
        <div class="alert">${icone("escudo")}<span>Prévia visual. Nada é salvo no motor nem enviado no WhatsApp.</span></div>
        <button type="button" class="nav-item" data-acao="tema">${icone(tema === "light" ? "lua" : "sol")}<span data-rotulo-tema>Tema ${tema === "light" ? "escuro" : "claro"}</span></button>
      </div>
    </aside>
    <div>
      <header class="topbar">
        <a class="brand" href="../"><img src="../assets/flowbot-symbol.svg" alt="" width="26" height="26">flowbot</a>
        <span class="topbar__module">Bot Studio</span>
        <div class="menu-anchor topbar__more">
          <button type="button" class="btn btn--ghost btn--icon" aria-label="Mais ações" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-topo">${icone("reticencias")}</button>
          <div class="menu" id="menu-topo" role="menu" hidden>
            <a class="menu__item" role="menuitem" href="../">${icone("alvo")}Prospecção</a>
            <button type="button" class="menu__item" role="menuitem" data-acao="tema">${icone("sol")}<span data-rotulo-tema>Tema ${tema === "light" ? "escuro" : "claro"}</span></button>
          </div>
        </div>
      </header>
      <main class="main" id="conteudo" tabindex="-1">
        <div class="page">
          <header class="page-head">
            <div>
              <p class="t-label page-head__crumb">Automação · Bot Studio</p>
              <h1 class="page-head__title">Bot Studio</h1>
              <p class="page-head__text">Monte o fluxo, peça uma proposta à oficina, simule a conversa e revise antes de publicar.</p>
            </div>
          </header>
          <div class="alert alert--warning" id="aviso-demo">${icone("info")}<span><strong>Demonstração:</strong> bot, negócio e conversas fictícios. O motor, o WhatsApp e a oficina com Claude não estão conectados.</span></div>
          <nav class="tabs" aria-label="Telas do Bot Studio">
            ${TELAS.map((t) => `<button type="button" class="tabs__item" data-tela="${t.id}">${icone(t.icone)}${t.nome}</button>`).join("")}
          </nav>
          <div id="tela"></div>
        </div>
      </main>
    </div>
  </div>
  <nav class="bottomnav" aria-label="Telas do Bot Studio">
    ${TELAS.map((t) => `<button type="button" class="bottomnav__item" data-tela="${t.id}">${icone(t.icone)}${t.curto}</button>`).join("")}
  </nav>
  <div id="painel"></div>`;
}

function desenhar() {
  document.querySelectorAll("[data-tela]").forEach((b) => {
    if (b.dataset.tela === estado.tela) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  $("#conteudo").dataset.tela = estado.tela;
  const telas = { agentes: telaAgentes, fluxo: telaFluxo, oficina: telaOficina, simulador: telaSimulador, versoes: telaVersoes };
  $("#tela").innerHTML = telas[estado.tela]();
  if (estado.tela === "fluxo" && estado.vistaFluxo === "mapa") requestAnimationFrame(desenharLigacoes);
  if (estado.tela === "simulador") rolarConversa();
}

function irPara(tela, { foco = true } = {}) {
  estado.tela = tela;
  if (location.hash !== "#" + tela) history.replaceState(null, "", "#" + tela);
  desenhar();
  if (foco) { window.scrollTo({ top: 0 }); }
}

const seloRevisao = () => {
  const r = estado.revisao;
  const classe = { pronto: "badge--info", precisa: "badge--danger", aprovado: "badge--success" }[r] ?? "";
  return `<span class="badge ${classe}">${ROTULO_DA_REVISAO[r]}</span>`;
};
const problemasDoRascunho = () => conferirFluxo(estado.rascunho);

/* ───────────────────────── 1. Agentes ───────────────────────── */
function telaAgentes() {
  const contagem = {};
  for (const no of estado.rascunho.nodes) contagem[papelDo(no)] = (contagem[papelDo(no)] ?? 0) + 1;
  const bots = botsDeExemplo.map((b, i) => {
    const principal = i === 0;
    return `<article class="card bot-card">
      <div class="bot-card__head">
        <div class="grow"><h2 class="bot-card__name">${html(b.nome)}</h2><p class="bot-card__meta">${html(b.canal)} · não conectado</p></div>
        <span class="badge">Fictício</span>
      </div>
      <div class="badges">
        ${b.publicada ? `<span class="badge badge--success">${icone("ok", "icon icon--sm")}v${b.publicada} publicada</span>` : `<span class="badge">Nunca publicado</span>`}
        ${principal ? seloRevisao() : `<span class="badge">Rascunho vazio</span>`}
      </div>
      ${principal ? `<div class="bot-card__actions">
        <button type="button" class="btn btn--secondary btn--sm" data-ir="fluxo">${icone("fluxo")}Abrir fluxo</button>
        <button type="button" class="btn btn--ghost btn--sm" data-ir="simulador">${icone("conversa")}Simular</button>
      </div>` : `<p class="field__hint">Só para mostrar a lista. Sem fluxo de exemplo.</p>`}
    </article>`;
  }).join("");
  const time = Object.entries(PAPEIS).map(([id, p]) => `<li class="agent-row">
      ${personagem(id, 36)}
      <div class="grow"><p class="agent-row__name">${p.nome}</p><p class="agent-row__job">${p.trabalho}</p></div>
      <span class="agent-row__count"><strong>${contagem[id] ?? 0}</strong> passo(s)</span>
    </li>`).join("");
  const integracoes = [
    ["Motor de fluxos (flow-bot)", "Não conectado nesta prévia", "Formato flow-bot/v0 usado nas telas"],
    ["WhatsApp pela Evolution", "Não conectado", "Nenhuma mensagem sai daqui"],
    ["Oficina com Claude", "Desligada", "Contrato da PR #15 do motor, em rascunho"],
    ["Botões interativos", "Experimental", "PR #14 do motor; hoje sai menu numerado"],
  ].map(([n, s, d]) => `<li class="status-row"><span class="status-row__dot" aria-hidden="true"></span><div class="grow"><p class="status-row__name">${n}</p><p class="status-row__hint">${d}</p></div><span class="status-row__state">${s}</span></li>`).join("");
  return `<div class="studio-grid">
    <section class="studio-col" aria-labelledby="t-bots">
      <h2 class="section__title" id="t-bots">Bots</h2>
      <div class="bot-list">${bots}</div>
      <h2 class="section__title">Conexões</h2>
      <ul class="card plain-list">${integracoes}</ul>
    </section>
    <section class="studio-col" aria-labelledby="t-time">
      <h2 class="section__title" id="t-time">Time do fluxo <span>${estado.rascunho.nodes.length} passos no rascunho</span></h2>
      <ul class="card plain-list">${time}</ul>
      <p class="field__hint">Cada passo do fluxo é feito por um personagem. As cores seguem a identidade do FlowBot.</p>
    </section>
  </div>`;
}

/* ───────────────────────── 2. Fluxo ───────────────────────── */
const NO_L = 216; const NO_A = 92; const COL = 296; const LIN = 124;

function telaFluxo() {
  const problemas = problemasDoRascunho();
  const org = organizarFluxo(estado.rascunho);
  const porNo = agruparProblemas(problemas);
  return `<div class="flow-toolbar">
      <div class="flow-toolbar__title">
        <h2 class="flow-name">${html(estado.rascunho.flow.name)}</h2>
        <div class="badges">${seloRevisao()}${problemas.length ? `<span class="badge badge--warning">${icone("alerta", "icon icon--sm")}${problemas.length} aviso(s)</span>` : `<span class="badge badge--success">${icone("ok", "icon icon--sm")}Estrutura ok</span>`}</div>
      </div>
      <div class="segmented flow-toolbar__view" role="group" aria-label="Forma de ver o fluxo">
        <button type="button" data-vista="mapa" aria-pressed="${estado.vistaFluxo === "mapa"}">${icone("fluxo")}Mapa</button>
        <button type="button" data-vista="lista" aria-pressed="${estado.vistaFluxo === "lista"}">${icone("lista")}Passos</button>
      </div>
    </div>
    ${estado.alterado ? `<div class="alert">${icone("info")}<span>Rascunho com alterações locais. Nada foi salvo no motor.</span><div class="alert__actions"><button type="button" class="btn btn--ghost btn--sm" data-acao="descartar">Descartar</button></div></div>` : ""}
    ${problemas.length ? `<details class="card problems"><summary>${icone("alerta")}Avisos da conferência <span class="badge badge--warning">${problemas.length}</span></summary><ul>${problemas.map((p) => `<li><button type="button" class="link-btn" data-no="${html(p.path)}">${html(noPorId(estado.rascunho, p.path) ? p.path : "fluxo")}</button> ${html(p.message)}</li>`).join("")}</ul></details>` : ""}
    <div class="flow-views" data-vista="${estado.vistaFluxo}">
      ${estado.vistaFluxo === "mapa" ? mapaDoFluxo(org, porNo) : listaDoFluxo(org, porNo)}
    </div>
    <p class="field__hint">A conferência aqui repete as regras estruturais do motor para avisar cedo. Quem valida de verdade é o motor.</p>`;
}

function agruparProblemas(problemas) {
  const m = new Map();
  for (const p of problemas) m.set(p.path, [...(m.get(p.path) ?? []), p]);
  return m;
}

function cartaoDoNo(no, porNo, posicao = "") {
  const tipo = TIPOS[no.type];
  const papel = papelDo(no);
  const avisos = porNo.get(no.id)?.length ?? 0;
  return `<button type="button" class="node${avisos ? " node--warn" : ""}" data-no="${html(no.id)}" aria-label="${html((tipo?.rotulo ?? no.type) + ": " + no.id + (avisos ? ", " + avisos + " aviso(s)" : ""))}" ${estado.selecionado === no.id ? 'aria-current="true"' : ""} style="--papel:${PAPEIS[papel].cor};${posicao}">
    <span class="node__head">${personagem(papel, 22)}<span class="node__type">${html(tipo?.rotulo ?? no.type)}</span>${avisos ? icone("alerta", "icon icon--sm node__warn") : ""}</span>
    <span class="node__id">${html(no.id)}</span>
    <span class="node__text">${html(resumoDoNo(no))}</span>
  </button>`;
}

function mapaDoFluxo(org, porNo) {
  const largura = org.colunas * COL - (COL - NO_L) + 48;
  const altura = org.linhasMax * LIN - (LIN - NO_A) + 48;
  const nos = estado.rascunho.nodes.map((no) => cartaoDoNo(no, porNo, `left:${24 + org.coluna.get(no.id) * COL}px;top:${24 + org.linha.get(no.id) * LIN}px`)).join("");
  return `<div class="card canvas-card">
    <div class="canvas" tabindex="0" aria-label="Mapa do fluxo. Role para os lados para ver tudo.">
      <div class="canvas__stage" style="width:${largura}px;height:${altura}px" data-org='${html(JSON.stringify({ c: [...org.coluna], l: [...org.linha] }))}'>
        <svg class="canvas__edges" width="${largura}" height="${altura}" aria-hidden="true"></svg>
        ${nos}
      </div>
    </div>
  </div>`;
}

// Ligações desenhadas depois que os cartões existem, com a posição calculada (não medida).
function desenharLigacoes() {
  const palco = $(".canvas__stage");
  if (!palco) return;
  const dados = JSON.parse(palco.dataset.org);
  const col = new Map(dados.c); const lin = new Map(dados.l);
  const pos = (id) => ({ x: 24 + col.get(id) * COL, y: 24 + lin.get(id) * LIN });
  const svg = palco.querySelector(".canvas__edges");
  let s = "";
  const porOrigem = new Map();
  for (const e of estado.rascunho.edges) porOrigem.set(e.from, [...(porOrigem.get(e.from) ?? []), e]);
  for (const [origem, lista] of porOrigem) {
    if (!col.has(origem)) continue;
    lista.forEach((e, i) => {
      if (!col.has(e.to)) return;
      const a = pos(origem); const b = pos(e.to);
      const y1 = a.y + NO_A / 2 + (i - (lista.length - 1) / 2) * 12;
      const x1 = a.x + NO_L; const x2 = b.x; const y2 = b.y + NO_A / 2;
      const meio = (x1 + x2) / 2;
      const erro = PORTAS_DE_ERRO.has(e.port);
      const caminho = x2 > x1
        ? `M${x1},${y1} C${meio},${y1} ${meio},${y2} ${x2},${y2}`
        : `M${x1},${y1} C${x1 + 60},${y1} ${x2 - 60},${y2} ${x2},${y2}`;
      s += `<path d="${caminho}" class="edge${erro ? " edge--error" : ""}"/>`;
      const rx = x2 > x1 ? x1 + 10 : x1 + 6;
      s += `<text x="${rx}" y="${y1 - 5}" class="edge__label${erro ? " edge__label--error" : ""}">${html(nomeDaPorta(e.port))}</text>`;
    });
  }
  svg.innerHTML = s;
}

function listaDoFluxo(org, porNo) {
  return `<ol class="step-list">${org.ordem.map((id, i) => {
    const no = noPorId(estado.rascunho, id);
    const saidas = portasDoNo(no).map((p) => {
      const e = saidasDe(estado.rascunho, id).find((x) => x.port === p.nome);
      const erro = PORTAS_DE_ERRO.has(p.nome);
      return `<li class="step-out${erro ? " step-out--error" : ""}"><span class="step-out__port">${html(nomeDaPorta(p.nome))}</span>${icone("seta", "icon icon--sm")}${e ? `<button type="button" class="link-btn" data-no="${html(e.to)}">${html(e.to)}</button>` : `<span class="step-out__missing">${p.obrigatoria ? "sem ligação" : "livre"}</span>`}</li>`;
    }).join("");
    const salto = no.type === "logic.goto" ? `<li class="step-out step-out--error"><span class="step-out__port">volta para</span>${icone("seta", "icon icon--sm")}<button type="button" class="link-btn" data-no="${html(no.config.target)}">${html(no.config.target)}</button></li>` : "";
    return `<li class="step" id="passo-${html(id)}"><span class="step__n" aria-hidden="true">${i + 1}</span><div class="step__body">${cartaoDoNo(no, porNo)}${saidas || salto ? `<ul class="step-outs">${salto}${saidas}</ul>` : `<p class="step-outs step-outs--end">Fim do caminho</p>`}</div></li>`;
  }).join("")}</ol>`;
}

/* Inspetor do passo (gaveta) */
function abrirPasso(id) {
  if (!noPorId(estado.rascunho, id)) return;
  if (!estado.selecionado) focoAnterior = document.activeElement;
  estado.selecionado = id;
  desenharPainel();
  document.querySelectorAll(".node[aria-current]").forEach((n) => n.removeAttribute("aria-current"));
  document.querySelectorAll(`.node[data-no="${CSS.escape(id)}"]`).forEach((n) => n.setAttribute("aria-current", "true"));
}
function fecharPainel() {
  if (!estado.selecionado) return;
  estado.selecionado = null;
  desenharPainel();
  document.querySelectorAll(".node[aria-current]").forEach((n) => n.removeAttribute("aria-current"));
  if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus({ preventScroll: true });
}
function desenharPainel() {
  soltarFoco?.(); soltarFoco = null;
  const raiz = $("#painel");
  const no = estado.selecionado && noPorId(estado.rascunho, estado.selecionado);
  document.body.style.overflow = no ? "hidden" : "";
  if (!no) { raiz.innerHTML = ""; return; }
  const tipo = TIPOS[no.type];
  const papel = papelDo(no);
  const avisos = problemasDoRascunho().filter((p) => p.path === no.id);
  raiz.innerHTML = `<div class="overlay" data-acao="fechar"></div>
  <section class="drawer" role="dialog" aria-modal="true" aria-labelledby="passo-titulo">
    <span class="drawer__grab" aria-hidden="true"></span>
    <div class="drawer__head">
      ${personagem(papel, 40)}
      <div class="drawer__heading"><span class="t-label">${html(PAPEIS[papel].nome)} · ${html(tipo?.rotulo ?? no.type)}</span><h2 class="drawer__title" id="passo-titulo">${html(no.id)}</h2></div>
      <button type="button" class="btn btn--ghost btn--icon" data-acao="fechar" aria-label="Fechar">${icone("fechar")}</button>
    </div>
    <div class="drawer__body">
      <div id="avisos-do-passo">${avisosDoPasso(avisos)}</div>
      ${camposDoPasso(no)}
      <section class="section"><h3 class="section__title">Saídas</h3>
        <ul class="plain-list plain-list--tight">${portasDoNo(no).map((p) => {
          const e = saidasDe(estado.rascunho, no.id).find((x) => x.port === p.nome);
          return `<li class="out-row"><span>${html(nomeDaPorta(p.nome))}</span><span class="out-row__to">${e ? `<button type="button" class="link-btn" data-no="${html(e.to)}">${html(e.to)}</button>` : p.obrigatoria ? '<span class="text-danger">sem ligação</span>' : "livre"}</span></li>`;
        }).join("") || `<li class="out-row"><span>Passo final</span></li>`}</ul>
      </section>
      <p class="field__hint">Mudanças ficam só neste rascunho local. Ligar e criar passos fica para quando o editor gravar no motor.</p>
    </div>
  </section>`;
  const gaveta = raiz.querySelector(".drawer");
  soltarFoco = prenderFoco(gaveta);
  (gaveta.querySelector("textarea, input:not([readonly])") ?? gaveta.querySelector('[data-acao="fechar"]:not(.overlay)'))?.focus({ preventScroll: true });
}
function avisosDoPasso(avisos) {
  return avisos.length ? `<div class="alert alert--warning">${icone("alerta")}<span>${avisos.map((a) => html(a.message)).join("<br>")}</span></div>` : "";
}
function camposDoPasso(no) {
  const c = no.config ?? {};
  if (no.type === "message.text") {
    return `<div class="field"><label class="field__label" for="campo-texto">Mensagem</label>
      <textarea class="textarea" id="campo-texto" data-campo="text" maxlength="${LIMITES.texto}">${html(c.text)}</textarea>
      <span class="field__hint">Use {{contact.firstName}} para o primeiro nome. <span data-contador="campo-texto">${String(c.text ?? "").length}/${LIMITES.texto}</span></span></div>`;
  }
  if (no.type === "message.quick_replies") {
    return `<div class="field"><label class="field__label" for="campo-prompt">Pergunta</label>
      <input class="input" id="campo-prompt" data-campo="prompt" value="${html(c.prompt)}" maxlength="${LIMITES.texto}"></div>
      <fieldset class="fieldset"><legend class="field__label">Opções (${c.options.length} de ${LIMITES.opcoes.max})</legend>
      ${c.options.map((o, i) => `<div class="option-row"><span class="option-row__value" title="Valor gravado">${html(o.value)}</span>
        <input class="input" aria-label="Texto da opção ${html(o.value)}" data-opcao="${i}" value="${html(o.label)}" maxlength="${LIMITES.rotuloDaOpcao}">
        <span class="option-row__count" data-contador-opcao="${i}">${o.label.length}/${LIMITES.rotuloDaOpcao}</span></div>`).join("")}
      </fieldset>
      <p class="field__hint">O número é o valor que a escolha compara. No WhatsApp, as opções saem como menu numerado.</p>`;
  }
  const linhas = Object.entries(c).map(([k, v]) => `<div><dt>${html(k)}</dt><dd>${html(typeof v === "object" ? JSON.stringify(v) : v)}</dd></div>`).join("");
  return `<section class="section"><h3 class="section__title">Configuração</h3>${linhas ? `<dl class="dl">${linhas}</dl>` : `<p class="field__hint">Este passo não tem configuração.</p>`}</section>`;
}
function editarPasso(alvo) {
  const no = noPorId(estado.rascunho, estado.selecionado);
  if (!no) return;
  if (alvo.dataset.campo) no.config[alvo.dataset.campo] = alvo.value;
  if (alvo.dataset.opcao !== undefined) {
    no.config.options[Number(alvo.dataset.opcao)].label = alvo.value;
    const cont = $(`[data-contador-opcao="${alvo.dataset.opcao}"]`); if (cont) cont.textContent = alvo.value.length + "/" + LIMITES.rotuloDaOpcao;
  }
  const cont = $(`[data-contador="${alvo.id}"]`); if (cont) cont.textContent = alvo.value.length + "/" + LIMITES.texto;
  marcarAlterado();
  $("#avisos-do-passo").innerHTML = avisosDoPasso(problemasDoRascunho().filter((p) => p.path === no.id));
  desenhar();
}
function marcarAlterado() {
  estado.alterado = !compararVersoes(publicada, estado.rascunho).vazio;
  if (estado.revisao) { estado.revisao = null; aviso("O rascunho mudou depois da revisão. Revise de novo antes de aprovar."); }
  estado.conversa = null; estado.mensagens = [];
}

/* ───────────────────────── 3. Oficina ───────────────────────── */
const ETAPAS_DA_OFICINA = [
  ["Intake", "código", "Limpa o pedido e confere os limites"],
  ["Arquiteto", "Claude · desligado", "Propõe o fluxo e os cenários"],
  ["Validador", "código", "Confere a estrutura no catálogo"],
  ["Guardião de ações", "código", "Barra webhooks e ações sem permissão"],
  ["Simulador", "código", "Roda os cenários no motor"],
  ["Revisor", "pessoa", "Você lê e aprova"],
  ["Publicador", "pessoa", "Você publica (desligado nesta fase)"],
];
function telaOficina() {
  const r = estado.resultado;
  return `<div class="studio-grid studio-grid--workshop">
    <section class="studio-col" aria-labelledby="t-pedido">
      <h2 class="section__title" id="t-pedido">Pedido</h2>
      <div class="card card--pad stack">
        <div class="field"><label class="field__label" for="briefing">Briefing</label>
          <textarea class="textarea" id="briefing" maxlength="${LIMITES.briefing}" rows="6">${html(estado.briefing)}</textarea>
          <span class="field__hint">O que o bot deve fazer, em palavras simples. <span data-contador="briefing">${estado.briefing.length}/${LIMITES.briefing}</span></span></div>
        <fieldset class="fieldset"><legend class="field__label">Fatos do negócio <span class="field__hint">(perfil de realidade)</span></legend>
          ${estado.perfil.map((f, i) => `<div class="fact-row"><code class="fact-row__key">${html(f.chave)}</code><input class="input" aria-label="${html(f.chave)}" data-fato="${i}" value="${html(f.valor)}"></div>`).join("")}
          <p class="field__hint">A oficina só usa serviços e regras que estão aqui ou no briefing. O que faltar vira lacuna.</p>
        </fieldset>
        <div class="stack stack--sm">
          <button type="button" class="btn btn--primary" disabled aria-describedby="oficina-off">${icone("faisca")}Pedir proposta</button>
          <p class="field__hint" id="oficina-off">Oficina com Claude desligada nesta fase. Limite previsto: 2 pedidos por dia.</p>
          <button type="button" class="btn btn--secondary" data-acao="exemplo-oficina">${icone("nota")}Ver resultado de exemplo</button>
        </div>
      </div>
      <h2 class="section__title">Quem participa</h2>
      <ol class="card plain-list pipeline">${ETAPAS_DA_OFICINA.map(([n, q, d], i) => `<li class="pipeline__item"><span class="pipeline__n">${i + 1}</span><div class="grow"><p class="pipeline__name">${n} <span class="pipeline__who">${q}</span></p><p class="pipeline__hint">${d}</p></div></li>`).join("")}</ol>
    </section>
    <section class="studio-col" aria-labelledby="t-resultado" id="resultado">
      <h2 class="section__title" id="t-resultado">Resultado ${r ? '<span class="badge">Exemplo fictício</span>' : ""}</h2>
      ${r ? resultadoDaOficina(r) : `<div class="card empty">${personagem("flowbot", 56)}<p class="empty__title">Nenhuma proposta ainda</p><p class="empty__text">Quando a oficina estiver ligada, a proposta chega aqui para você ler, testar e aprovar. Por enquanto, veja um resultado de exemplo.</p></div>`}
    </section>
  </div>`;
}
function resultadoDaOficina(r) {
  const pronto = r.status === "ready_for_review";
  const diff = compararVersoes(publicada, r.flow);
  const usandoProposta = !compararVersoes(r.flow, estado.rascunho).ligacoes.length && compararVersoes(r.flow, estado.rascunho).vazio;
  return `<div class="card card--pad stack">
    <div class="result-head">
      <span class="badge ${pronto ? "badge--info" : "badge--danger"}">${pronto ? "Pronto para revisão" : "Precisa de revisão"}</span>
      <span class="result-head__meta">${r.flow.nodes.length} passos · ${r.scenarios.length} cenários · ${formatar.numero(r.usage.inputTokens + r.usage.outputTokens)} tokens</span>
    </div>
    <section class="section"><h3 class="section__title">Lacunas <span>${r.gaps.length}</span></h3>
      ${r.gaps.length ? `<ul class="bullet-list">${r.gaps.map((g) => `<li>${html(g)}</li>`).join("")}</ul>` : '<p class="field__hint">Nenhuma lacuna.</p>'}</section>
    <section class="section"><h3 class="section__title">Problemas <span>${r.problems.length}</span></h3>
      ${r.problems.length ? `<ul class="bullet-list">${r.problems.map((p) => `<li><code>${html(p.code)}</code> ${html(p.message)}</li>`).join("")}</ul>` : '<p class="field__hint">Nenhum problema estrutural.</p>'}</section>
    <section class="section"><h3 class="section__title">Testes <span>${r.tests.filter((t) => t.ok).length} de ${r.tests.length} ok</span></h3>
      <ul class="plain-list plain-list--tight">${r.tests.map((t) => `<li class="test-row">${icone(t.ok ? "ok" : "alerta", "icon icon--sm " + (t.ok ? "text-success" : "text-danger"))}<span>${html(t.name)}</span></li>`).join("")}</ul>
      <p class="field__hint">${r.checkedAgainstIndependentTests ? r.independentTests + " testes independentes também conferidos." : "Sem testes independentes."}</p></section>
    <section class="section"><h3 class="section__title">Mudanças em relação à v1</h3>${resumoDiff(diff)}</section>
    <div class="stack stack--sm">
      ${usandoProposta ? `<div class="alert alert--success">${icone("ok")}<span>A proposta é o rascunho atual.</span></div>` : `<button type="button" class="btn btn--secondary" data-acao="usar-proposta">${icone("fluxo")}Usar como rascunho</button>`}
      <button type="button" class="btn btn--ghost" data-acao="simular-proposta" ${usandoProposta ? "" : "disabled"}>${icone("conversa")}Simular a proposta</button>
    </div>
    ${aprovacao()}
  </div>`;
}
function aprovacao() {
  if (estado.revisao === "aprovado") {
    return `<section class="approval"><div class="alert alert--success">${icone("ok")}<span><strong>Aprovado nesta tela.</strong> A aprovação não foi gravada: o motor ainda não tem esse estado.</span></div>
      <button type="button" class="btn btn--primary btn--block" disabled aria-describedby="pub-off">Publicar v2</button>
      <p class="field__hint" id="pub-off">Publicação desligada nesta fase. Nada vai para o WhatsApp.</p>
      <button type="button" class="btn btn--ghost btn--sm" data-acao="desfazer-aprovacao">Desfazer aprovação</button></section>`;
  }
  const podeRevisar = estado.revisao === "pronto";
  return `<section class="approval">
    <h3 class="section__title">Aprovação manual</h3>
    <label class="check"><input type="checkbox" id="conferi" ${estado.conferido ? "checked" : ""} ${podeRevisar ? "" : "disabled"}><span>Li a estrutura, as lacunas e os testes, e simulei a conversa.</span></label>
    <div class="approval__actions">
      <button type="button" class="btn btn--secondary grow" data-acao="pedir-ajuste" ${podeRevisar ? "" : "disabled"}>Pedir ajuste</button>
      <button type="button" class="btn btn--primary grow" data-acao="aprovar" ${podeRevisar && estado.conferido ? "" : "disabled"}>${icone("check")}Aprovar</button>
    </div>
    ${podeRevisar ? "" : `<p class="field__hint">${estado.revisao === "precisa" ? "Ajuste pedido. Edite o rascunho e carregue o exemplo de novo para revisar." : "Use a proposta como rascunho para liberar a revisão."}</p>`}
  </section>`;
}

/* ───────────────────────── 4. Simulador ───────────────────────── */
function docDoSimulador() { return estado.simVersao === "publicada" ? publicada : estado.rascunho; }
function telaSimulador() {
  const s = estado.conversa;
  const status = s ? STATUS_DA_CONVERSA[s.status] ?? s.status : "Sem conversa";
  const fim = s && ["completed", "handed_off", "failed"].includes(s.status);
  const esperando = s?.status === "waiting_input";
  const ultimaOpcao = [...estado.mensagens].reverse().find((m) => m.de === "bot");
  return `<div class="studio-grid studio-grid--sim">
    <section class="phone" aria-label="Conversa simulada">
      <header class="phone__head">
        <span class="phone__avatar">${personagem("recepcionista", 30)}</span>
        <div class="grow"><p class="phone__name">${html(NEGOCIO_FICTICIO)}</p><p class="phone__status">simulação · ${html(status.toLocaleLowerCase("pt-BR"))}</p></div>
        <button type="button" class="btn btn--ghost btn--icon" data-acao="reiniciar" aria-label="Recomeçar conversa">${icone("relogio")}</button>
      </header>
      <div class="phone__chat" id="chat" role="log" aria-live="polite" aria-label="Mensagens">
        <p class="chat-note">Conversa fictícia no navegador. Nada é enviado.</p>
        ${estado.mensagens.map((m, i) => bolha(m, m === ultimaOpcao && esperando, i)).join("")}
        ${fim ? `<p class="chat-note chat-note--end">${s.status === "handed_off" ? icone("check", "icon icon--sm") + "Passada para a equipe" + (s.nota ? ": " + html(s.nota) : "") : s.status === "completed" ? "Conversa concluída" : "Prévia parou: " + html(s.motivo ?? "")}</p>` : ""}
      </div>
      <form class="phone__composer" id="composer">
        <input class="input" id="mensagem" autocomplete="off" placeholder="${fim ? "Recomece para testar de novo" : "Mensagem do cliente"}" aria-label="Mensagem do cliente" ${fim ? "disabled" : ""}>
        <button class="btn btn--primary btn--icon" type="submit" aria-label="Enviar" ${fim ? "disabled" : ""}>${icone("seta")}</button>
      </form>
    </section>
    <aside class="studio-col sim-side" aria-label="Estado da simulação">
      <div class="card card--pad stack">
        <div class="field"><span class="field__label" id="sim-versao">Versão</span>
          <div class="segmented" role="group" aria-labelledby="sim-versao">
            <button type="button" data-sim-versao="rascunho" aria-pressed="${estado.simVersao === "rascunho"}">Rascunho</button>
            <button type="button" data-sim-versao="publicada" aria-pressed="${estado.simVersao === "publicada"}">v1 publicada</button>
          </div></div>
        <div class="field"><label class="field__label" for="contato">Primeiro nome do contato</label><input class="input" id="contato" value="${html(estado.contato)}" maxlength="40"></div>
        <button type="button" class="btn btn--secondary" data-acao="silencio" ${esperando ? "" : "disabled"}>${icone("relogio")}Simular silêncio (${Math.round((noPorId(docDoSimulador(), s?.cursor ?? "")?.config?.timeoutSeconds ?? 300) / 60)} min)</button>
      </div>
      <div class="card card--pad stack">
        <h2 class="section__title">Estado</h2>
        <dl class="dl dl--1">
          <div><dt>Status</dt><dd>${html(status)}</dd></div>
          <div><dt>Esperando em</dt><dd>${html(s?.cursor ?? "—")}</dd></div>
          <div><dt>Variáveis</dt><dd>${s && Object.keys(s.variaveis).length ? Object.entries(s.variaveis).map(([k, v]) => `<code>${html(k)}</code> = ${html(v)}`).join("<br>") : "—"}</dd></div>
          <div><dt>Caminho</dt><dd class="path">${s?.caminho.length ? s.caminho.map(html).join(" → ") : "—"}</dd></div>
        </dl>
      </div>
      <p class="field__hint">Prévia que anda pelo fluxo no navegador. Webhook, captura e sorteio só rodam no simulador do motor. Botões no WhatsApp são experimentais (PR #14); hoje as opções saem como menu numerado.</p>
    </aside>
  </div>`;
}
function bolha(m, ativa, i) {
  if (m.de === "cliente") return `<div class="bubble bubble--out"><p>${html(m.texto)}</p><span class="bubble__time">${m.hora}</span></div>`;
  const opcoes = m.opcoes ? `<div class="bubble__options" role="group" aria-label="Opções">${m.opcoes.map((o) => `<button type="button" class="reply-btn" data-resposta="${html(o.value)}" data-rotulo="${html(o.label)}" ${ativa ? "" : "disabled"}>${html(o.label)}</button>`).join("")}</div>` : "";
  return `<div class="bubble bubble--in" data-i="${i}"><p>${html(m.texto)}</p><span class="bubble__time">${m.hora}</span>${opcoes}</div>`;
}
function enviarNoSimulador(texto, rotulo = texto) {
  const doc = docDoSimulador();
  if (!estado.conversa) estado.conversa = iniciarConversa({ firstName: estado.contato.trim() });
  estado.mensagens.push({ de: "cliente", texto: rotulo, hora: formatar.hora(new Date()) });
  receber(responder(doc, estado.conversa, texto));
}
function receber(saidas) {
  const hora = formatar.hora(new Date());
  for (const m of saidas) estado.mensagens.push({ de: "bot", texto: m.texto, opcoes: m.opcoes, hora });
  desenhar();
  $("#mensagem")?.focus({ preventScroll: true });
}
function rolarConversa() { const c = $("#chat"); if (c) c.scrollTop = c.scrollHeight; }
function reiniciarConversa() { estado.conversa = null; estado.mensagens = []; }

/* ───────────────────────── 5. Versões ───────────────────────── */
function telaVersoes() {
  const diff = compararVersoes(publicada, estado.rascunho);
  const passos = [
    ["Rascunho", "flows.status = draft", true],
    [estado.revisao === "precisa" ? "Precisa de revisão" : "Pronto para revisão", "resultado da oficina", false],
    ["Aprovado", "só na interface", false],
    ["Publicado", "flow_versions", false],
  ];
  const atual = { null: 0, pronto: 1, precisa: 1, aprovado: 2 }[estado.revisao];
  return `<div class="studio-grid">
    <section class="studio-col" aria-labelledby="t-ciclo">
      <h2 class="section__title" id="t-ciclo">Ciclo da próxima versão</h2>
      <ol class="card lifecycle">${passos.map(([n, origem], i) => `<li class="lifecycle__step" data-estado="${i < atual ? "feito" : i === atual ? "atual" : "depois"}" ${i === atual ? 'aria-current="step"' : ""}><span class="lifecycle__dot" aria-hidden="true">${i < atual ? icone("check", "icon icon--sm") : i + 1}</span><span class="grow"><span class="lifecycle__name">${n}</span><span class="lifecycle__src">${origem}</span></span></li>`).join("")}</ol>
      <p class="field__hint">No motor de hoje só existem rascunho e versões publicadas. "Pronto para revisão" vem da oficina (PR #15); "Aprovado" ainda não é gravado em lugar nenhum.</p>
      <h2 class="section__title">Histórico</h2>
      <ol class="card plain-list">
        <li class="history-row"><span class="history-row__tag">Rascunho</span><div class="grow"><p class="history-row__name">${estado.alterado ? "Alterações não publicadas" : "Igual à v1"}</p><p class="history-row__hint">Local, nesta aba · ${seloRevisao()}</p></div></li>
        ${historicoDeExemplo.map((v) => `<li class="history-row"><span class="history-row__tag history-row__tag--pub">v${v.versao}</span><div class="grow"><p class="history-row__name">${html(v.nota)}</p><p class="history-row__hint">Publicada em ${formatar.data(v.quando)} · ${html(v.autor)} (fictício)</p></div></li>`).join("")}
      </ol>
    </section>
    <section class="studio-col" aria-labelledby="t-diff">
      <h2 class="section__title" id="t-diff">Rascunho × v1 publicada</h2>
      <div class="card card--pad">${detalheDiff(diff)}</div>
    </section>
  </div>`;
}
function resumoDiff(d) {
  if (d.vazio) return '<p class="field__hint">Sem diferenças.</p>';
  const itens = [
    d.adicionados.length && `${d.adicionados.length} passo(s) novo(s)`,
    d.removidos.length && `${d.removidos.length} removido(s)`,
    d.alterados.length && `${d.alterados.length} alterado(s)`,
    d.ligacoes.length && `${d.ligacoes.length} ligação(ões) mudou(aram)`,
  ].filter(Boolean);
  return `<p class="diff-summary">${itens.join(" · ")}</p><button type="button" class="link-btn" data-ir="versoes">Ver diferença completa</button>`;
}
function valorLegivel(v) {
  if (v === undefined) return "—";
  if (Array.isArray(v)) return v.map((o) => (typeof o === "object" ? o.value + " " + o.label : o)).join(" · ");
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
function detalheDiff(d) {
  if (d.vazio) return `<div class="empty">${personagem("guardiao", 48)}<p class="empty__title">Nada mudou</p><p class="empty__text">O rascunho está igual à versão publicada. Use a proposta da oficina ou edite um passo para ver a diferença.</p></div>`;
  const no = (id) => noPorId(estado.rascunho, id) ?? noPorId(publicada, id);
  return `<div class="diff">
    ${d.adicionados.map((id) => `<div class="diff__item diff__item--add"><p class="diff__title">${icone("mais", "icon icon--sm")}Novo · ${html(TIPOS[no(id).type]?.rotulo)} <code>${html(id)}</code></p><p class="diff__new">${html(resumoDoNo(no(id)))}</p></div>`).join("")}
    ${d.removidos.map((id) => `<div class="diff__item diff__item--del"><p class="diff__title">${icone("menos", "icon icon--sm")}Removido · <code>${html(id)}</code></p></div>`).join("")}
    ${d.alterados.map((a) => `<div class="diff__item"><p class="diff__title">Alterado · ${html(TIPOS[no(a.id).type]?.rotulo)} <code>${html(a.id)}</code></p>${a.campos.map((c) => `<p class="diff__field">${html(c.campo)}</p><p class="diff__old"><span class="sr-only">Antes: </span>${html(valorLegivel(c.antes))}</p><p class="diff__new"><span class="sr-only">Depois: </span>${html(valorLegivel(c.depois))}</p>`).join("")}</div>`).join("")}
    ${d.ligacoes.length ? `<div class="diff__item"><p class="diff__title">Ligações</p>${d.ligacoes.map((l) => { const [de, porta] = l.saida.split("→"); return `<p class="diff__edge"><code>${html(de)}</code> · ${html(nomeDaPorta(porta))}: ${l.antes ? `<s>${html(l.antes)}</s> ` : ""}${l.depois ? html(l.depois) : "removida"}</p>`; }).join("")}</div>` : ""}
  </div>`;
}

/* ───────────────────────── Eventos ───────────────────────── */
function ligarEventos() {
  document.addEventListener("click", (evento) => {
    const alvo = evento.target.closest("button, [data-acao], a");
    if (!alvo) { fecharMenus(); return; }
    if (alvo.matches('[aria-haspopup="menu"]')) { fecharMenus(alvo); alternarMenu(alvo); return; }
    fecharMenus();
    if (alvo.dataset.tela) { irPara(alvo.dataset.tela); return; }
    if (alvo.dataset.ir) { fecharPainel(); irPara(alvo.dataset.ir); return; }
    if (alvo.dataset.vista) { estado.vistaFluxo = alvo.dataset.vista; desenhar(); return; }
    if (alvo.dataset.no) {
      if (estado.tela !== "fluxo") irPara("fluxo");
      abrirPasso(alvo.dataset.no); return;
    }
    if (alvo.dataset.resposta) { enviarNoSimulador(alvo.dataset.resposta, alvo.dataset.rotulo); return; }
    if (alvo.dataset.simVersao) { estado.simVersao = alvo.dataset.simVersao; reiniciarConversa(); desenhar(); return; }
    const acao = alvo.dataset.acao;
    if (acao === "tema") {
      const novo = temaAtual() === "light" ? "dark" : "light"; aplicarTema(novo);
      document.querySelectorAll("[data-rotulo-tema]").forEach((e) => { e.textContent = "Tema " + (novo === "light" ? "escuro" : "claro"); });
    } else if (acao === "fechar") fecharPainel();
    else if (acao === "descartar") {
      estado.rascunho = comoRascunho(publicada); estado.alterado = false; estado.revisao = null; estado.conferido = false; reiniciarConversa();
      desenhar(); aviso("Rascunho voltou a ser igual à v1.");
    } else if (acao === "exemplo-oficina") {
      estado.resultado = resultadoDeExemplo(); desenhar();
      $("#resultado")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } else if (acao === "usar-proposta") {
      estado.rascunho = copiar(estado.resultado.flow); estado.alterado = true; estado.conferido = false;
      estado.revisao = estado.resultado.status === "ready_for_review" ? "pronto" : "precisa"; reiniciarConversa();
      desenhar(); aviso("Proposta virou o rascunho local. Simule antes de aprovar.", { tipo: "success" });
    } else if (acao === "simular-proposta") { estado.simVersao = "rascunho"; reiniciarConversa(); irPara("simulador"); }
    else if (acao === "aprovar") { estado.revisao = "aprovado"; desenhar(); aviso("Aprovado só nesta tela. Nada foi publicado.", { tipo: "success" }); }
    else if (acao === "pedir-ajuste") { estado.revisao = "precisa"; estado.conferido = false; desenhar(); }
    else if (acao === "desfazer-aprovacao") { estado.revisao = "pronto"; estado.conferido = false; desenhar(); }
    else if (acao === "silencio") receber(esgotarPrazo(docDoSimulador(), estado.conversa));
    else if (acao === "reiniciar") { reiniciarConversa(); desenhar(); }
  });
  document.addEventListener("input", (evento) => {
    const alvo = evento.target;
    if (alvo.closest(".drawer") && (alvo.dataset.campo || alvo.dataset.opcao !== undefined)) editarPasso(alvo);
    else if (alvo.id === "briefing") { estado.briefing = alvo.value; $('[data-contador="briefing"]').textContent = alvo.value.length + "/" + LIMITES.briefing; }
    else if (alvo.dataset.fato !== undefined) estado.perfil[Number(alvo.dataset.fato)].valor = alvo.value;
    else if (alvo.id === "contato") { estado.contato = alvo.value; }
  });
  document.addEventListener("change", (evento) => {
    if (evento.target.id === "conferi") { estado.conferido = evento.target.checked; $('[data-acao="aprovar"]').disabled = !estado.conferido; }
    if (evento.target.id === "contato") { reiniciarConversa(); desenhar(); }
  });
  document.addEventListener("submit", (evento) => {
    if (evento.target.id !== "composer") return;
    evento.preventDefault();
    const campo = $("#mensagem"); const texto = campo.value.trim();
    if (!texto) return;
    campo.value = ""; enviarNoSimulador(texto);
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      if (estado.selecionado) { fecharPainel(); return; }
      const aberto = document.querySelector('[aria-haspopup="menu"][aria-expanded="true"]');
      if (aberto) { fecharMenus(); aberto.focus(); }
    }
  });
  window.addEventListener("hashchange", () => { const t = lerTela(); if (t !== estado.tela) { fecharPainel(); irPara(t, { foco: false }); } });
}

aplicarTema(temaAtual());
montarEstrutura();
ligarEventos();
desenhar();
