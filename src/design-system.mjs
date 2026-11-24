// Galeria viva do design system: tudo aqui usa as mesmas classes dos módulos.
import { icone } from "./ui/icones.mjs";
import { aviso, prenderFoco, temaAtual, aplicarTema, alternarMenu, fecharMenus, ESTADOS, estadoOperacional, blocoDeEstado } from "./ui/componentes.mjs";
import { MODULOS } from "./ui/shell.mjs";

const cores = [
  ["bg", "Fundo"], ["surface", "Cartão"], ["surface-sunken", "Rebaixado"], ["surface-raised", "Elevado"],
  ["text", "Texto"], ["text-muted", "Texto de apoio"], ["text-faint", "Rótulo"], ["accent", "Laranja FlowBot"],
  ["success", "Sucesso"], ["warning", "Atenção"], ["danger", "Erro"], ["info", "Informação"],
];
const etapas = [["pesquisado", "Pesquisado"], ["lead", "Lead"], ["qualificado", "Qualificado"], ["proposta", "Proposta"], ["negociacao", "Negociação"], ["ganho", "Ganho"], ["perdido", "Perdido"]];
const agentes = [["agent-flowbot", "FlowBot"], ["agent-recepcionista", "Recepcionista"], ["agent-qualificador", "Qualificador"], ["agent-passador", "Passador"], ["agent-guardiao", "Guardião"], ["agent-novo", "Agente novo"]];
const sw = ([t, n]) => `<div class="swatch" style="--c:var(--${t})"><span></span><div>${n}<br><code>--${t}</code></div></div>`;

document.getElementById("ds").innerHTML = `
<header class="ds-head">
  <div><a class="brand" href="./"><img src="./assets/flowbot-symbol.svg" alt="" width="26" height="26">flowbot</a>
    <h1 class="t-display" style="margin-top:16px">Design system</h1>
    <p class="t-muted" style="max-width:60ch;margin-top:8px">Fundamentos e componentes de todos os módulos. Esta página usa os mesmos arquivos do app: <code>tokens.css</code>, <code>base.css</code> e <code>components.css</code>. Os dados são só ilustrativos.</p></div>
  <button class="btn btn--secondary" data-acao="tema">${icone("sol")}Trocar tema</button>
</header>

<section class="ds-sec"><h2>Cores do sistema</h2><div class="ds-grid">${cores.map(sw).join("")}</div>
  <p class="t-label">Etapas do funil</p><div class="ds-grid">${etapas.map(([id, n]) => sw(["stage-" + id, n])).join("")}</div>
  <p class="t-label">Personagens (nunca em botão, link ou estado)</p><div class="ds-grid">${agentes.map(sw).join("")}</div></section>

<section class="ds-sec"><h2>Tipografia</h2><div class="ds-demo ds-type">
  <p class="t-display">Título de página · Bricolage 36</p><p class="t-title">Título de seção · Bricolage 28</p>
  <p class="t-heading">Título de cartão · Inter 18 semibold</p><p class="t-body">Texto padrão · Inter 14. Interfaces densas usam 14px; formulários usam 16px para o celular não aproximar a tela.</p>
  <p class="t-small t-muted">Texto pequeno de apoio · Inter 13</p><p class="t-label">Rótulo · JetBrains Mono 12</p></div></section>

<section class="ds-sec"><h2>Espaço e forma</h2><div class="ds-demo">
  ${[1, 2, 3, 4, 6, 8, 12].map((n) => `<div class="ds-row"><code class="t-label" style="width:96px">--space-${n}</code><span class="space-bar" style="width:var(--space-${n})"></span></div>`).join("")}
  <div class="ds-row">${["xs", "sm", "md", "lg", "xl", "pill"].map((r) => `<span style="width:72px;height:48px;background:var(--surface-sunken);border:1px solid var(--border);border-radius:var(--radius-${r});display:grid;place-items:center" class="t-label">${r}</span>`).join("")}</div>
  <div class="ds-row">${[1, 2, 3].map((n) => `<span class="card" style="width:120px;height:64px;box-shadow:var(--shadow-${n});display:grid;place-items:center"><span class="t-label">sombra ${n}</span></span>`).join("")}</div></div></section>

<section class="ds-sec"><h2>Botões</h2><div class="ds-demo">
  <div class="ds-row"><button class="btn btn--primary">${icone("mais")}Principal</button><button class="btn btn--secondary">Secundário</button><button class="btn">Neutro</button><button class="btn btn--ghost">Fantasma</button><button class="btn btn--danger">${icone("proibido")}Perigo</button></div>
  <div class="ds-row"><button class="btn btn--primary btn--sm">Pequeno</button><button class="btn btn--primary btn--lg">Grande</button><button class="btn btn--secondary btn--icon" aria-label="Mais ações" data-tip="Mais ações">${icone("reticencias")}</button><button class="btn btn--primary" aria-busy="true">Salvando</button><button class="btn" disabled>Desativado</button></div>
  <p class="t-small t-muted">Um principal por tela. O botão de ícone sempre tem <code>aria-label</code>.</p></div></section>

<section class="ds-sec"><h2>Formulários</h2><div class="ds-demo"><div class="form-grid form-grid--2">
  <div class="field"><label class="field__label" for="d1">Nome da empresa<span class="req">*</span></label><input class="input" id="d1" placeholder="Ex.: Café Farol"><span class="field__hint">Como aparece na fachada ou no CNPJ.</span></div>
  <div class="field"><label class="field__label" for="d2">E-mail</label><input class="input" id="d2" aria-invalid="true" value="contato@"><span class="field__error">${icone("alerta", "icon icon--sm")}Confira o e-mail.</span></div>
  <div class="field"><label class="field__label" for="d3">Etapa</label><select class="select" id="d3"><option>Lead</option><option>Qualificado</option></select></div>
  <div class="field"><label class="field__label" for="d4">Busca</label><div class="input-group">${icone("busca")}<input class="input" id="d4" type="search" placeholder="Buscar"></div></div>
  <div class="field" style="grid-column:1/-1"><label class="field__label" for="d5">Notas</label><textarea class="textarea" id="d5" placeholder="Contexto e próxima ação"></textarea></div></div>
  <label class="check"><input type="checkbox" checked> Aceito revisar antes de usar</label>
  <label class="switch"><span><strong>Não contatar</strong><br><span class="t-small t-muted">Interruptor de bloqueio</span></span><input type="checkbox" checked></label>
  <div class="ds-row"><div class="segmented" role="group" aria-label="Exemplo"><button aria-pressed="true">${icone("mapa", "icon icon--sm")}Mapa</button><button aria-pressed="false">${icone("lista", "icon icon--sm")}Lista</button></div></div>
  <div class="chips"><button class="chip" aria-pressed="true">Todas <span class="chip__count">12</span></button>${etapas.slice(0, 4).map(([id, n]) => `<button class="chip" aria-pressed="false"><span class="dot" style="color:var(--stage-${id})"></span>${n} <span class="chip__count">3</span></button>`).join("")}</div></div></section>

<section class="ds-sec"><h2>Selos, indicadores e medidores</h2><div class="ds-demo">
  <div class="ds-row"><span class="badge">Neutro</span><span class="badge badge--accent">Marca</span><span class="badge badge--success">Ganho</span><span class="badge badge--warning">Fictícia</span><span class="badge badge--danger">Não contatar</span><span class="badge badge--info">Novo</span>${etapas.map(([id, n]) => `<span class="badge badge--stage" style="--stage:var(--stage-${id})"><span class="dot"></span>${n}</span>`).join("")}</div>
  <div class="ds-grid">${[["predio", "Empresas", "128", "Exemplo ilustrativo"], ["alvo", "Taxa de ganho", "—", "Sem negócios encerrados"]].map(([i, l, v, h]) => `<article class="card kpi"><span class="kpi__label">${icone(i, "icon icon--sm")}${l}</span><span class="kpi__value">${v}</span><span class="kpi__hint">${h}</span></article>`).join("")}</div>
  <div class="meter" style="max-width:240px"><span style="width:62%"></span></div></div></section>

<section class="ds-sec"><h2>Tabela</h2><div class="card table-wrap"><table class="table"><thead><tr><th>Empresa</th><th>Etapa</th><th class="num">Pontuação</th></tr></thead><tbody>
  <tr><td><button class="row-link">Exemplo A</button></td><td><span class="badge badge--stage" style="--stage:var(--stage-lead)"><span class="dot"></span>Lead</span></td><td class="num">45</td></tr>
  <tr aria-selected="true"><td><button class="row-link">Exemplo B (selecionada)</button></td><td><span class="badge badge--stage" style="--stage:var(--stage-ganho)"><span class="dot"></span>Ganho</span></td><td class="num">80</td></tr></tbody></table></div></section>

<section class="ds-sec"><h2>Avisos, vazio e carregamento</h2><div class="ds-grid ds-grid--wide">
  <div class="alert">${icone("info")}<span>Informação neutra.</span></div><div class="alert alert--success">${icone("ok")}<span>Tudo certo.</span></div>
  <div class="alert alert--warning">${icone("alerta")}<span>Dados de demonstração.</span></div><div class="alert alert--danger">${icone("alerta")}<span>Não deu certo. Tente de novo?</span></div></div>
  <div class="ds-grid ds-grid--wide"><div class="card"><div class="empty">${icone("busca", "icon empty__art")}<p class="empty__title">Nenhum resultado</p><p class="empty__text">Estado vazio com uma ação clara.</p><div class="empty__actions"><button class="btn btn--secondary">Limpar filtros</button></div></div></div>
  <div class="card card--pad" style="display:grid;gap:12px"><div class="skeleton" style="height:16px;width:60%"></div><div class="skeleton" style="height:12px"></div><div class="skeleton" style="height:12px;width:80%"></div><div class="ds-row"><span class="spinner" role="status" aria-label="Carregando"></span><span class="t-small t-muted">Carregando…</span></div></div></div></section>

<section class="ds-sec"><h2>Sobreposições</h2><div class="ds-demo"><div class="ds-row">
  <button class="btn btn--secondary" data-acao="modal">Abrir modal</button><button class="btn btn--secondary" data-acao="gaveta">Abrir gaveta</button>
  <div class="menu-anchor"><button class="btn btn--secondary" aria-haspopup="menu" aria-expanded="false" aria-controls="m1">Menu ${icone("reticencias", "icon icon--sm")}</button>
    <div class="menu" id="m1" role="menu" hidden><button class="menu__item" role="menuitem">${icone("importar")}Importar</button><button class="menu__item" role="menuitem">${icone("exportar")}Exportar</button><div class="menu__sep"></div><button class="menu__item" role="menuitem">${icone("engrenagem")}Ajustes</button></div></div>
  <button class="btn btn--secondary" data-acao="aviso">Mostrar aviso</button><button class="btn btn--secondary" data-tip="Dica curta no hover e no foco">Dica</button></div>
  <p class="t-small t-muted">Gaveta à direita no computador e folha inferior no celular, com foco preso e Esc para fechar.</p></div></section>

<section class="ds-sec"><h2>Navegação</h2><div class="ds-grid ds-grid--wide"><div class="card card--pad nav-group">
  ${[...new Set(MODULOS.map((m) => m.grupo))].map((g) => `<span class="t-label nav-group__label">${g}</span>${MODULOS.filter((m) => m.grupo === g).map((m, i) => `<a class="nav-item" href="#" ${m.id === "prospeccao" ? 'aria-current="page"' : ""}>${icone(m.icone)}${m.nome}${m.selo ? `<span class="nav-item__tag">${m.selo}</span>` : ""}</a>`).join("")}`).join("")}
  <p class="t-small t-muted" style="padding:8px 12px 0">Só módulos com tela aparecem. Atendimento, Agentes de IA, Operações e Administração entram em <code>MODULOS</code> (src/ui/shell.mjs) quando existirem.</p></div>
  <div class="card" style="position:relative;min-height:120px;overflow:hidden"><nav class="bottomnav" style="position:absolute;display:grid" aria-label="Exemplo de barra inferior">
    <button class="bottomnav__item" aria-current="page">${icone("painel")}Resumo</button><button class="bottomnav__item">${icone("mapa")}Mapa</button><button class="bottomnav__item">${icone("lista")}Empresas</button><button class="bottomnav__item">${icone("mais")}Adicionar</button></nav></div>
  <div class="card card--pad"><p class="t-label">Seletor de módulo (celular)</p><div class="menu-anchor" style="margin-top:8px"><button type="button" class="topbar__module" aria-haspopup="menu" aria-expanded="false" aria-controls="m2"><span>Bot Studio</span><span class="nav-item__tag">Prévia</span>${icone("abaixo", "icon icon--sm")}</button>
    <div class="menu" id="m2" role="menu" hidden style="left:0;right:auto"><p class="menu__label">Módulos</p>${MODULOS.map((m) => `<a class="menu__item" role="menuitem" href="#">${icone(m.icone)}${m.nome}</a>`).join("")}</div></div></div></div></section>

<section class="ds-sec"><h2>Estados operacionais</h2><div class="ds-demo">
  <p class="t-small t-muted">Como uma integração está agora. Ponto + texto, sem pílula. Use só estes estados (<code>ESTADOS</code> em src/ui/componentes.mjs).</p>
  <div class="ds-row" style="flex-wrap:wrap;gap:12px 20px">${Object.keys(ESTADOS).map((k) => estadoOperacional(k)).join("")}</div>
  <div class="ds-grid ds-grid--wide">
    ${blocoDeEstado({ estado: "carregando", titulo: "Carregando o espaço", texto: "Mostre o que está sendo carregado." })}
    ${blocoDeEstado({ estado: "desconectado", titulo: "Motor não conectado", texto: "Diga o que falta e o que ainda dá para fazer." })}
    ${blocoDeEstado({ estado: "nao-salvo", titulo: "Alterações não salvas", texto: "O rascunho só existe nesta aba." })}
    ${blocoDeEstado({ estado: "conflito", titulo: "Conflito de versão", texto: "Outra pessoa salvou antes. Compare antes de sobrescrever." })}
    ${blocoDeEstado({ estado: "validacao", titulo: "Precisa de correção", texto: "2 saídas sem ligação." })}
    ${blocoDeEstado({ estado: "permissao", titulo: "Sem permissão", texto: "Peça acesso a quem administra o espaço." })}
    ${blocoDeEstado({ estado: "indisponivel", titulo: "Serviço indisponível", texto: "Nada foi perdido. Tente de novo em instantes." })}
    ${blocoDeEstado({ estado: "vazio", titulo: "Sem dados", texto: "Explique como o primeiro dado aparece." })}
  </div></div></section>

<section class="ds-sec"><h2>Estados de versão</h2><div class="ds-demo"><div class="ds-row" style="flex-wrap:wrap">
  ${[["rascunho", "Rascunho"], ["revisao", "Em revisão"], ["correcao", "Precisa de correção"], ["aprovado", "Aprovado"], ["publicado", "Publicado"]].map(([e, n]) => `<span class="version-state" data-estado="${e}">${n}</span>`).join("")}</div>
  <p class="t-small t-muted">Cor e texto juntos. Aprovado é contorno (ainda não é definitivo); publicado é preenchido.</p></div></section>

<section class="ds-sec"><h2>Movimento</h2><div class="ds-demo">
  <div class="ds-row" style="flex-wrap:wrap">${[["fast", "120 ms", "toque, hover, cor"], ["base", "200 ms", "troca de conteúdo, dobra"], ["slow", "280 ms", "gavetas e folhas"]].map(([t, ms, uso]) => `<div class="card card--pad" style="min-width:180px"><p class="t-label">--duration-${t}</p><p class="t-heading">${ms}</p><p class="t-small t-muted">${uso}</p></div>`).join("")}</div>
  <div class="ds-row"><button class="btn btn--secondary" data-acao="ver-entrada">Ver entrada de conteúdo</button><span class="card card--pad" id="demo-entrada">Conteúdo</span></div>
  <p class="t-small t-muted">Só <code>transform</code> e <code>opacity</code>. Classes: <code>.pressable</code> (toque), <code>.view-enter</code> (troca de tela), <code>.reveal</code> (expansão), <code>.pulse-once</code> (algo novo apareceu). Com movimento reduzido, tudo dura 1 ms.</p></div></section>

<section class="ds-sec"><h2>Painel lateral e ação do polegar</h2><div class="ds-grid ds-grid--wide">
  <aside class="side-panel" style="animation:none"><div class="side-panel__head"><div><p class="t-label">Contexto</p><p class="t-heading">Painel lateral</p></div></div><div class="side-panel__body"><p class="t-small t-muted">Edição ao lado do trabalho, sem cobrir a tela, no computador. No celular o mesmo conteúdo vai para a folha inferior.</p></div></aside>
  <div class="card" style="position:relative;min-height:140px;overflow:hidden"><button class="fab" style="position:absolute;bottom:16px;right:16px;display:inline-flex">${icone("mais")}Passo</button></div></div></section>
<div id="sobre"></div>`;

const sobre = document.getElementById("sobre");
let soltar = null;
function fechar() { soltar?.(); sobre.innerHTML = ""; document.body.style.overflow = ""; }
function abrir(conteudo) {
  sobre.innerHTML = '<div class="overlay" data-acao="fechar"></div>' + conteudo;
  document.body.style.overflow = "hidden";
  const caixa = sobre.querySelector(".modal, .drawer");
  soltar = prenderFoco(caixa);
  caixa.querySelector("button")?.focus();
}
document.addEventListener("click", (e) => {
  const menu = e.target.closest('[aria-haspopup="menu"]');
  if (menu) { fecharMenus(menu); alternarMenu(menu); return; }
  if (!e.target.closest(".menu")) fecharMenus();
  const a = e.target.closest("[data-acao]")?.dataset.acao;
  if (a === "tema") aplicarTema(temaAtual() === "light" ? "dark" : "light");
  if (a === "aviso") aviso("Aviso de exemplo. Some sozinho.", { tipo: "success", acao: { rotulo: "Desfazer", executar: () => aviso("Desfeito.") } });
  if (a === "modal") abrir(`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 class="modal__title" id="mt">Publicar este fluxo?</h2><p class="t-muted">Confirmação de ação sensível: diga o que acontece e o que não volta atrás.</p><div class="modal__actions"><button class="btn btn--ghost" data-acao="fechar">Cancelar</button><button class="btn btn--primary" data-acao="fechar">Publicar</button></div></div>`);
  if (a === "gaveta") abrir(`<section class="drawer" role="dialog" aria-modal="true" aria-labelledby="gt"><span class="drawer__grab"></span><div class="drawer__head"><div style="flex:1"><span class="t-label">Exemplo</span><h2 class="drawer__title" id="gt">Gaveta de detalhes</h2></div><button class="btn btn--ghost btn--icon" data-acao="fechar" aria-label="Fechar">${icone("fechar")}</button></div><div class="drawer__body"><section class="section"><h3 class="section__title">Seção</h3><dl class="dl"><div><dt>Campo</dt><dd>Valor</dd></div><div><dt>Campo</dt><dd>Valor</dd></div></dl></section></div><div class="drawer__foot"><button class="btn btn--secondary" data-acao="fechar" style="flex:1">Fechar</button><button class="btn btn--primary" data-acao="fechar" style="flex:1">Salvar</button></div></section>`);
  if (a === "fechar") fechar();
  if (a === "ver-entrada") { const d = document.getElementById("demo-entrada"); d.classList.remove("view-enter"); void d.offsetWidth; d.classList.add("view-enter"); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { fecharMenus(); fechar(); } });
aplicarTema(temaAtual());
