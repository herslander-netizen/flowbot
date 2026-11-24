// Modo Prospecção — camada de interface. Toda regra de negócio fica em prospecting.mjs.
// A tela é montada uma vez e cada região é atualizada sozinha, sem recriar o mapa.
import {
  ETAPAS, dadosDeDemonstracao, validarEmpresa, chaveEmpresa, importarCsv, criarRascunho, podePrepararAbordagem,
  pontuacao, explicarPontuacao, resumoFunil, exportarCsv,
} from "./prospecting.mjs";
import { icone } from "./ui/icones.mjs";
import { montarShell, atualizarRotuloTema } from "./ui/shell.mjs";
import { iniciarBuscaCep } from "./cep-ui.mjs";
import {
  html, formatar, aviso, prenderFoco, temaAtual, aplicarTema, alternarMenu, fecharMenus, ligarArrasteDaFolha, observarTeclado,
} from "./ui/componentes.mjs";

const REMETENTE = "Alvo Digital";
const estado = {
  leads: dadosDeDemonstracao(),
  filtro: "todos",
  busca: "",
  ordem: "recentes",
  vista: "mapa",          // mapa | lista (computador e tablet)
  aba: "resumo",          // resumo | mapa | lista (celular)
  marcado: null,          // empresa ou grupo marcado no mapa
  painel: null,           // { tipo: "detalhe", id } | { tipo: "novo" }
  legendaAberta: !matchMedia("(max-width: 767px)").matches,
};
const rascunhos = new Map();
const historico = new Map();
let mapa = null; let camada = null; let soltarFoco = null; let focoAnterior = null;

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const etapa = (id) => ETAPAS.find((e) => e.id === id) ?? ETAPAS[0];
const corEtapa = (id) => "var(--stage-" + id + ")";
const temCoordenadas = (l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude);
const local = (l) => [l.cidade, l.uf].filter(Boolean).join(" / ");

function registrar(id, texto, nomeIcone = "relogio") {
  const lista = historico.get(id) ?? [];
  lista.unshift({ texto, icone: nomeIcone, quando: new Date() });
  historico.set(id, lista.slice(0, 30));
}

function filtrados() {
  const termo = estado.busca.trim().toLocaleLowerCase("pt-BR");
  const lista = estado.leads.filter((l) => {
    if (estado.filtro !== "todos" && l.etapa !== estado.filtro) return false;
    if (!termo) return true;
    return [l.nome, l.cidade, l.uf, l.categoria].some((v) => String(v ?? "").toLocaleLowerCase("pt-BR").includes(termo));
  });
  if (estado.ordem === "nome") lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  else if (estado.ordem === "pontuacao") lista.sort((a, b) => pontuacao(b) - pontuacao(a));
  else lista.sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  return lista;
}

/* ───────────────────────── Estrutura ───────────────────────── */
function montarEstrutura() {
  document.body.innerHTML = montarShell({
    ativo: "prospeccao",
    nota: "Pesquisa separada de envio. Nada é disparado nesta versão.",
    acoes: [
      { acao: "importar", icone: "importar", rotulo: "Importar CSV" },
      { acao: "exportar", icone: "exportar", rotulo: "Exportar CSV" },
    ],
    conteudo: `
      <main class="main" id="conteudo" data-aba="${estado.aba}" tabindex="-1">
        <div class="page">
          <header class="page-head">
            <div>
              <p class="t-label page-head__crumb">Comercial · Prospecção</p>
              <h1 class="page-head__title">Prospecção</h1>
              <p class="page-head__text">Funil, território e abordagens com fatos verificáveis. Quem decide o contato é sempre uma pessoa.</p>
            </div>
            <div class="page-head__actions">
              <div class="menu-anchor">
                <button class="btn btn--ghost btn--icon" type="button" aria-label="Importar e exportar CSV" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-csv" data-tip="CSV">${icone("reticencias")}</button>
                <div class="menu" id="menu-csv" role="menu" hidden>
                  <button class="menu__item" type="button" role="menuitem" data-acao="importar">${icone("importar")}Importar CSV</button>
                  <button class="menu__item" type="button" role="menuitem" data-acao="exportar">${icone("exportar")}Exportar CSV</button>
                </div>
              </div>
              <button class="btn btn--primary" type="button" data-acao="novo">${icone("mais")}Adicionar empresa</button>
            </div>
          </header>
          <div id="aviso-demo"></div>
          <section class="overview" aria-label="Resumo do funil">
            <div class="kpis" id="kpis"></div>
            <section class="card" aria-labelledby="titulo-funil">
              <div class="card__head"><h2 class="card__title" id="titulo-funil">Funil comercial</h2><span class="t-small t-faint" id="funil-meta"></span></div>
              <div class="funnel__rows" id="funil"></div>
            </section>
          </section>
          <section class="workspace" aria-labelledby="titulo-territorio">
            <div class="workspace__bar">
              <div class="workspace__row">
                <h2 class="workspace__title" id="titulo-territorio">Território comercial</h2>
                <div class="segmented views-switch" role="group" aria-label="Visualização">
                  <button type="button" data-vista="mapa">${icone("mapa", "icon icon--sm")}Mapa</button>
                  <button type="button" data-vista="lista">${icone("lista", "icon icon--sm")}Lista</button>
                </div>
              </div>
              <div class="input-group search">
                ${icone("busca")}
                <input class="input" type="search" id="search" placeholder="Buscar empresas" aria-label="Pesquisar empresas" autocomplete="off" enterkeyhint="search">
                <kbd aria-hidden="true">/</kbd>
              </div>
              <div class="chips" id="chips" role="group" aria-label="Filtrar por etapa"></div>
            </div>
            <div class="views" id="views">
              <section class="card map-card" id="map-card" aria-label="Mapa de oportunidades">
                <div class="map" id="map" role="region" aria-label="Mapa com as empresas filtradas"></div>
                <div id="legenda"></div>
                <div id="selecao"></div>
                <div class="map-foot" id="map-foot"></div>
              </section>
              <section class="card list-card" aria-labelledby="titulo-lista">
                <div class="card__head list-head">
                  <h3 class="card__title" id="titulo-lista">Empresas <span class="t-faint t-num" id="contagem"></span></h3>
                  <label class="sr-only" for="ordem">Ordenar</label>
                  <select class="select select--sm" id="ordem">
                    <option value="recentes">Mais recentes</option><option value="nome">Nome</option><option value="pontuacao">Pontuação</option>
                  </select>
                </div>
                <div class="list-scroll" id="lista"></div>
              </section>
            </div>
          </section>
          <footer class="page-foot">FlowBot · Alvo Digital · Prospecção responsável · Sem integração com o motor de atendimento nesta versão</footer>
        </div>
      </main>`,
    inferior: `
  <nav class="bottomnav" aria-label="Seções da prospecção">
    <button type="button" class="bottomnav__item" data-aba="resumo">${icone("painel")}Resumo</button>
    <button type="button" class="bottomnav__item" data-aba="mapa">${icone("mapa")}Mapa</button>
    <button type="button" class="bottomnav__item" data-aba="lista">${icone("lista")}Empresas</button>
    <button type="button" class="bottomnav__item" data-acao="novo">${icone("mais")}Adicionar</button>
  </nav>
  <input class="sr-only" id="csv-file" type="file" accept=".csv,text/csv" tabindex="-1" aria-label="Arquivo CSV de empresas">
  <div id="painel"></div>`,
  });
}

/* ───────────────────────── Regiões ───────────────────────── */
function kpi(rotulo, valor, dica, nomeIcone) {
  return `<div class="kpi"><span class="kpi__label">${icone(nomeIcone, "icon icon--sm")}${html(rotulo)}</span><span class="kpi__value">${valor}</span><span class="kpi__hint">${html(dica)}</span></div>`;
}

function desenharResumo() {
  const r = resumoFunil(estado.leads);
  const encerrados = r.ganhos + r.perdidos;
  $("#kpis").innerHTML =
    kpi("Empresas", formatar.numero(r.total), r.comCoordenadas + " no mapa", "predio") +
    kpi("Em andamento", formatar.numero(r.emAndamento), "Lead a Negociação", "atividade") +
    kpi("Taxa de ganho", r.taxaGanho === null ? "—" : formatar.percentual(r.taxaGanho),
      encerrados ? r.ganhos + " de " + encerrados + " encerrado(s)" : "Sem negócios encerrados", "alvo") +
    kpi("Não contatar", formatar.numero(r.naoContatar), "Fora de abordagens", "proibido");

  const maior = Math.max(1, ...r.porEtapa.map((e) => e.quantidade));
  const linha = (e) => `<button type="button" class="funnel__row" data-filtro="${e.id}" aria-pressed="${estado.filtro === e.id}" style="--stage:${corEtapa(e.id)}" aria-label="${html(e.nome)}: ${e.quantidade} empresa(s), ${formatar.percentual(e.percentual)} do total. Filtrar.">
      <span class="funnel__name"><span class="dot"></span>${html(e.nome)}</span>
      <span class="funnel__bar"><span style="width:${(e.quantidade / maior) * 100}%"></span></span>
      <span class="funnel__value t-num">${e.quantidade}<small>${formatar.percentual(e.percentual)}</small></span></button>`;
  $("#funil").innerHTML = r.porEtapa.slice(0, 5).map(linha).join("") + '<div class="funnel__sep" role="presentation"></div>' + r.porEtapa.slice(5).map(linha).join("");
  $("#funil-meta").textContent = r.total ? formatar.numero(r.total) + " empresa(s) nesta sessão" : "Sem empresas";

  $("#aviso-demo").innerHTML = r.demonstracao
    ? `<div class="strip strip--warn">${icone("info", "icon icon--sm")}<span><strong>Demonstração:</strong> ${r.demonstracao} empresa(s) fictícia(s), só nesta aba. O CSV guarda “Não contatar”, mas não é backup nem prova consentimento.</span></div>`
    : `<div class="strip strip--script">${icone("info", "icon icon--sm")}<span>Os dados ficam só nesta aba. O CSV guarda “Não contatar”, mas não é backup nem prova consentimento.</span></div>`;
}

function desenharChips() {
  const contagem = (id) => estado.leads.filter((l) => l.etapa === id).length;
  $("#chips").innerHTML = `<button type="button" class="chip" data-filtro="todos" aria-pressed="${estado.filtro === "todos"}">Todas <span class="chip__count">${estado.leads.length}</span></button>` +
    ETAPAS.map((e) => `<button type="button" class="chip" data-filtro="${e.id}" aria-pressed="${estado.filtro === e.id}"><span class="dot" style="color:${corEtapa(e.id)}"></span>${html(e.nome)} <span class="chip__count">${contagem(e.id)}</span></button>`).join("");
}

function seloEtapa(id) {
  return `<span class="badge badge--stage" style="--stage:${corEtapa(id)}"><span class="dot"></span>${html(etapa(id).nome)}</span>`;
}
function medidor(valor) {
  return `<span class="meter" role="img" aria-label="Pontuação ${valor} de 100"><span style="width:${valor}%;--meter:${valor >= 60 ? "var(--success)" : valor >= 30 ? "var(--warning)" : "var(--text-faint)"}"></span></span>`;
}

function desenharLista() {
  const dados = filtrados();
  $("#contagem").textContent = "· " + dados.length;
  if (!dados.length) {
    const semNada = !estado.leads.length;
    $("#lista").innerHTML = `<div class="empty">${icone("busca", "icon empty__art")}
      <p class="empty__title">${semNada ? "Nenhuma empresa ainda" : "Nenhuma empresa com esses filtros"}</p>
      <p class="empty__text">${semNada ? "Importe uma lista CSV autorizada ou cadastre a primeira empresa." : "Mude a busca ou a etapa para ver outras empresas."}</p>
      <div class="empty__actions">${semNada ? `<button class="btn btn--secondary" data-acao="importar">${icone("importar")}Importar CSV</button><button class="btn btn--primary" data-acao="novo">${icone("mais")}Adicionar empresa</button>` : `<button class="btn btn--secondary" data-acao="limpar-filtros">Limpar filtros</button>`}</div></div>`;
    return;
  }
  const cartoes = dados.map((l) => {
    const p = pontuacao(l);
    return `<button type="button" class="lead-card" data-acao="abrir" data-id="${html(l.id)}">
      <span class="lead-card__top"><span class="avatar" aria-hidden="true">${html(l.nome.charAt(0).toUpperCase())}</span>
        <span class="lead-card__text"><span class="lead-card__name">${html(l.nome)}</span><br><span class="lead-card__sub">${html(l.categoria || "Segmento não informado")}${local(l) ? " · " + html(local(l)) : ""}</span></span>
        ${icone("seta", "icon icon--sm")}</span>
      <span class="lead-card__bottom">${seloEtapa(l.etapa)}${l.suprimido ? `<span class="badge badge--danger">${icone("proibido", "icon icon--sm")}Não contatar</span>` : ""}
        <span class="lead-card__score">${medidor(p)}<span>${p}/100</span></span></span></button>`;
  }).join("");
  const linhas = dados.map((l) => {
    const p = pontuacao(l);
    return `<tr><td><button type="button" class="row-link" data-acao="abrir" data-id="${html(l.id)}">${html(l.nome)}</button></td>
      <td class="t-muted">${html(l.categoria || "—")}</td><td class="t-muted">${html(local(l) || "—")}</td>
      <td>${seloEtapa(l.etapa)}</td>
      <td>${l.suprimido ? '<span class="badge badge--danger">Não contatar</span>' : '<span class="t-faint">—</span>'}</td>
      <td class="num"><span class="score-cell">${medidor(p)}<span>${p}</span></span></td></tr>`;
  }).join("");
  $("#lista").innerHTML = `<div class="lead-cards">${cartoes}</div>
    <div class="table-view table-wrap"><table class="table"><caption class="sr-only">Empresas filtradas</caption>
      <thead><tr><th scope="col">Empresa</th><th scope="col">Segmento</th><th scope="col">Local</th><th scope="col">Etapa</th><th scope="col">Contato</th><th scope="col" class="num">Pontuação</th></tr></thead>
      <tbody>${linhas}</tbody></table></div>`;
}

function desenharVistas() {
  const vista = estado.vista;
  $("#views").dataset.vista = vista;
  $("#map-card").hidden = vista !== "mapa";
  document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === vista)));
  $("#conteudo").dataset.aba = estado.aba;
  document.querySelectorAll(".bottomnav__item[data-aba]").forEach((b) => {
    if (b.dataset.aba === estado.aba) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  if (vista === "mapa") { iniciarMapa(); mapa?.invalidateSize(); setTimeout(() => mapa?.invalidateSize(), 60); }
}

function atualizar({ mapaJunto = true } = {}) {
  desenharResumo(); desenharChips(); desenharLista(); desenharVistas();
  if (mapaJunto) desenharMarcadores();
  desenharPainel();
}

/* ───────────────────────── Mapa ───────────────────────── */
function iniciarMapa() {
  if (mapa) return;
  const elemento = $("#map");
  if (!globalThis.L) {
    elemento.innerHTML = `<div class="map-empty"><div class="empty">${icone("mapa", "icon empty__art")}<p class="empty__title">Mapa indisponível</p><p class="empty__text">A biblioteca do mapa não carregou (sem conexão?). Continue pela lista.</p><div class="empty__actions"><button class="btn btn--secondary" data-vista="lista">Ver lista</button></div></div></div>`;
    return;
  }
  mapa = L.map(elemento, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView([-14.2, -51.9], 4);
  L.control.zoom({ position: "topright", zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" }).addTo(mapa);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  camada = L.layerGroup().addTo(mapa);
  mapa.on("zoomend", () => { if (!desenhando) desenharMarcadores({ enquadrar: false }); });
  mapa.on("click", () => { if (estado.marcado) { estado.marcado = null; desenharSelecao(); desenharMarcadores({ enquadrar: false }); } });
}

// Agrupa pontos que ficariam a menos de 44 px na tela, para o mapa continuar legível.
function agrupar(pontos) {
  const grupos = [];
  for (const l of pontos) {
    const p = mapa.latLngToLayerPoint([l.latitude, l.longitude]);
    const grupo = grupos.find((g) => g.ponto.distanceTo(p) < 44);
    if (grupo) grupo.itens.push(l); else grupos.push({ ponto: p, itens: [l] });
  }
  return grupos;
}

let ultimoEnquadramento = "";
let desenhando = false;
function desenharMarcadores(opcoes = {}) {
  if (desenhando) return;
  desenhando = true;
  try { desenharMarcadoresAgora(opcoes); } finally { desenhando = false; }
}
function desenharMarcadoresAgora({ enquadrar = true } = {}) {
  if (!mapa || estado.vista !== "mapa") { desenharRodapeMapa(); return; }
  const pontos = filtrados().filter(temCoordenadas);
  // Enquadrar antes de limpar: o Leaflet dispara "zoomend" durante setView/fitBounds.
  const chave = pontos.map((l) => l.id).join(",");
  if (pontos.length && enquadrar && chave !== ultimoEnquadramento && mapa.getSize().x > 0) {
    ultimoEnquadramento = chave;
    if (pontos.length === 1) mapa.setView([pontos[0].latitude, pontos[0].longitude], 13, { animate: false });
    else mapa.fitBounds(pontos.map((l) => [l.latitude, l.longitude]), { padding: [48, 48], maxZoom: 13, animate: false });
  }
  camada.clearLayers();
  const vazio = $("#map .map-empty"); vazio?.remove();
  if (!pontos.length) {
    $("#map").insertAdjacentHTML("beforeend", `<div class="map-empty"><div class="empty">${icone("pino", "icon empty__art")}<p class="empty__title">Nenhuma empresa com localização</p><p class="empty__text">As empresas filtradas não têm latitude e longitude. Elas continuam na lista.</p></div></div>`);
    desenharLegenda([]); desenharRodapeMapa(); desenharSelecao();
    return;
  }
  for (const grupo of agrupar(pontos)) {
    if (grupo.itens.length === 1) {
      const l = grupo.itens[0];
      const marcado = estado.marcado?.tipo === "empresa" && estado.marcado.id === l.id;
      const icon = L.divIcon({ className: "pin-icon", iconSize: [24, 24], iconAnchor: [12, 12],
        html: `<span class="pin${marcado ? " pin--selected" : ""}${l.suprimido ? " pin--blocked" : ""}" style="--stage:${corEtapa(l.etapa)}"></span>` });
      L.marker([l.latitude, l.longitude], { icon, title: l.nome + " · " + etapa(l.etapa).nome, alt: l.nome, riseOnHover: true, zIndexOffset: marcado ? 1000 : 0 })
        .on("click", () => marcar({ tipo: "empresa", id: l.id }))
        .on("keypress", (e) => { if (e.originalEvent.key === "Enter" || e.originalEvent.key === " ") marcar({ tipo: "empresa", id: l.id }); })
        .addTo(camada);
    } else {
      const total = grupo.itens.length; let acumulado = 0;
      const fatias = ETAPAS.map((e) => {
        const n = grupo.itens.filter((l) => l.etapa === e.id).length;
        if (!n) return null;
        const inicio = acumulado / total * 360; acumulado += n;
        return corEtapa(e.id) + " " + inicio + "deg " + (acumulado / total * 360) + "deg";
      }).filter(Boolean).join(", ");
      const centro = mapa.layerPointToLatLng(grupo.ponto);
      const icon = L.divIcon({ className: "pin-icon", iconSize: [40, 40], iconAnchor: [20, 20],
        html: `<span class="cluster" style="--fatias:${fatias}"><span>${total}</span></span>` });
      L.marker(centro, { icon, title: total + " empresas próximas", alt: total + " empresas", riseOnHover: true })
        .on("click", () => abrirGrupo(grupo.itens))
        .on("keypress", (e) => { if (e.originalEvent.key === "Enter") abrirGrupo(grupo.itens); })
        .addTo(camada);
    }
  }
  desenharLegenda(pontos); desenharRodapeMapa(); desenharSelecao();
}

function abrirGrupo(itens) {
  const limites = L.latLngBounds(itens.map((l) => [l.latitude, l.longitude]));
  if (mapa.getZoom() < 16 && limites.getNorthEast().distanceTo(limites.getSouthWest()) > 30) {
    mapa.fitBounds(limites, { padding: [64, 64], maxZoom: 17 });
  } else {
    marcar({ tipo: "grupo", ids: itens.map((l) => l.id) });
  }
}

function marcar(alvo) {
  estado.marcado = alvo;
  desenharMarcadores({ enquadrar: false });
  $("#selecao .btn--primary")?.focus({ preventScroll: true });
}

function desenharLegenda(pontos) {
  const presentes = ETAPAS.map((e) => ({ ...e, n: pontos.filter((l) => l.etapa === e.id).length })).filter((e) => e.n);
  $("#legenda").innerHTML = presentes.length ? `<div class="map-legend${estado.legendaAberta ? "" : " map-legend--collapsed"}">
    <button type="button" class="map-legend__toggle t-label" data-acao="legenda" aria-expanded="${estado.legendaAberta}">Legenda ${icone(estado.legendaAberta ? "menos" : "mais", "icon icon--sm")}</button>
    ${presentes.map((e) => `<span class="map-legend__item" style="--stage:${corEtapa(e.id)}"><span class="dot"></span>${html(e.nome)}<b>${e.n}</b></span>`).join("")}</div>` : "";
}

function desenharRodapeMapa() {
  const filtradosAgora = filtrados();
  const sem = filtradosAgora.filter((l) => !temCoordenadas(l)).length;
  $("#map-foot").innerHTML = `${icone("info", "icon icon--sm")}<span>${sem ? sem + " empresa(s) sem localização aparecem só na lista. " : ""}O mapa serve para navegar pelo território; não é fonte de coleta de empresas. © OpenStreetMap.</span>`;
}

function desenharSelecao() {
  const alvo = estado.marcado;
  if (!alvo) { $("#selecao").innerHTML = ""; return; }
  if (alvo.tipo === "grupo") {
    const itens = alvo.ids.map((id) => estado.leads.find((l) => l.id === id)).filter(Boolean);
    $("#selecao").innerHTML = `<div class="map-select" role="dialog" aria-label="Empresas neste ponto">
      <div class="map-select__head"><div class="grow"><p class="map-select__name">${itens.length} empresas neste ponto</p><p class="t-small t-muted">Mesma localização ou muito próximas.</p></div>
      <button type="button" class="btn btn--ghost btn--icon btn--sm" data-acao="desmarcar" aria-label="Fechar">${icone("fechar")}</button></div>
      <ul>${itens.map((l) => `<li><button type="button" class="menu__item" data-acao="abrir" data-id="${html(l.id)}"><span class="dot" style="color:${corEtapa(l.etapa)}"></span>${html(l.nome)}</button></li>`).join("")}</ul></div>`;
    return;
  }
  const l = estado.leads.find((x) => x.id === alvo.id);
  if (!l) { estado.marcado = null; $("#selecao").innerHTML = ""; return; }
  const p = pontuacao(l);
  $("#selecao").innerHTML = `<div class="map-select" role="dialog" aria-label="Empresa selecionada no mapa">
    <div class="map-select__head"><div class="grow"><p class="map-select__name">${html(l.nome)}</p>
      <p class="map-select__meta">${seloEtapa(l.etapa)}<span>${html([l.categoria, local(l)].filter(Boolean).join(" · ") || "Sem segmento e local")}</span></p></div>
      <button type="button" class="btn btn--ghost btn--icon btn--sm" data-acao="desmarcar" aria-label="Fechar">${icone("fechar")}</button></div>
    <div class="map-select__meta">${medidor(p)}<span class="t-num">Pontuação ${p}/100</span>${l.suprimido ? '<span class="badge badge--danger">Não contatar</span>' : ""}</div>
    <div class="map-select__actions"><button type="button" class="btn btn--primary" data-acao="abrir" data-id="${html(l.id)}">Abrir detalhes</button></div></div>`;
}

function verNoMapa(id) {
  const l = estado.leads.find((x) => x.id === id);
  if (!l || !temCoordenadas(l)) return;
  fecharPainel();
  estado.vista = "mapa"; estado.aba = "mapa";
  if (estado.filtro !== "todos" && estado.filtro !== l.etapa) estado.filtro = "todos";
  atualizar({ mapaJunto: false });
  mapa?.setView([l.latitude, l.longitude], Math.max(mapa.getZoom(), 14), { animate: false });
  marcar({ tipo: "empresa", id: l.id });
  $("#map-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ───────────────────────── Painéis ───────────────────────── */
function abrirPainel(painel) {
  if (!estado.painel) focoAnterior = document.activeElement;
  estado.painel = painel;
  fecharMenus();
  desenharPainel();
}
function fecharPainel() {
  if (!estado.painel) return;
  const voltarPara = estado.painel.tipo === "detalhe" ? estado.painel.id : null;
  estado.painel = null;
  desenharPainel();
  const alvo = (focoAnterior && document.contains(focoAnterior)) ? focoAnterior
    : voltarPara ? document.querySelector(`[data-acao="abrir"][data-id="${CSS.escape(voltarPara)}"]`) : null;
  alvo?.focus({ preventScroll: true });
}

function desenharPainel() {
  soltarFoco?.(); soltarFoco = null;
  const raiz = $("#painel");
  const p = estado.painel;
  document.body.style.overflow = p ? "hidden" : "";
  if (!p) { raiz.innerHTML = ""; return; }
  const jaAberto = raiz.querySelector(".drawer")?.dataset.chave === (p.tipo + (p.id ?? ""));
  const rolagem = raiz.querySelector(".drawer__body")?.scrollTop ?? 0;
  raiz.innerHTML = '<div class="overlay" data-acao="fechar-fundo"></div>' + (p.tipo === "novo" ? painelNovo() : painelDetalhe(p.id));
  const gaveta = raiz.querySelector(".drawer");
  if (!gaveta) { estado.painel = null; raiz.innerHTML = ""; return; }
  if (jaAberto) { gaveta.style.animation = "none"; raiz.querySelector(".overlay").style.animation = "none"; raiz.querySelector(".overlay").style.opacity = "1"; gaveta.querySelector(".drawer__body").scrollTop = rolagem; }
  soltarFoco = prenderFoco(gaveta);
  if (!jaAberto) ligarArrasteDaFolha(gaveta, fecharPainel);
  if (!jaAberto) (gaveta.querySelector("[data-foco-inicial]") ?? gaveta.querySelector('[data-acao="fechar"]'))?.focus({ preventScroll: true });
}

function painelDetalhe(id) {
  const l = estado.leads.find((x) => x.id === id);
  if (!l) return "";
  const p = pontuacao(l);
  const criterios = explicarPontuacao(l);
  const indice = ETAPAS.findIndex((e) => e.id === l.etapa);
  const eventos = historico.get(l.id) ?? [];
  const bloqueado = !podePrepararAbordagem(l);
  const texto = bloqueado ? "" : rascunhos.get(l.id) ?? "";
  const evidencia = l.fato && l.fonteFato;
  return `<section class="drawer" role="dialog" aria-modal="true" aria-labelledby="detalhe-titulo" data-chave="detalhe${html(l.id)}">
    <span class="drawer__grab" aria-hidden="true"></span>
    <div class="drawer__head">
      <div class="drawer__heading">
        <span class="t-label">Empresa</span>
        <h2 class="drawer__title" id="detalhe-titulo">${html(l.nome)}</h2>
        <span class="t-small t-muted">${html([l.categoria || "Segmento não informado", local(l)].filter(Boolean).join(" · "))}</span>
        <span class="badges">${seloEtapa(l.etapa)}${l.suprimido ? `<span class="badge badge--danger">${icone("proibido", "icon icon--sm")}Não contatar</span>` : ""}${l.origem === "exemplo_ficticio" ? '<span class="badge badge--warning">Fictícia</span>' : ""}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--icon" data-acao="fechar" aria-label="Fechar detalhes">${icone("fechar")}</button>
    </div>
    <div class="drawer__body">
      <section class="section" aria-labelledby="s-etapa">
        <h3 class="section__title" id="s-etapa">Etapa do funil <span>${indice + 1} de ${ETAPAS.length}</span></h3>
        <div class="stepper" aria-hidden="true" style="--stage:${corEtapa(l.etapa)}">${ETAPAS.map((_, i) => `<span class="${i <= indice ? "on" : ""}"></span>`).join("")}</div>
        <label class="sr-only" for="lead-stage">Etapa comercial</label>
        <select class="select" id="lead-stage">${ETAPAS.map((e) => `<option value="${e.id}"${e.id === l.etapa ? " selected" : ""}>${html(e.nome)}</option>`).join("")}</select>
      </section>

      <section class="section" aria-labelledby="s-pontos">
        <h3 class="section__title" id="s-pontos">Pontuação explicável</h3>
        <div class="score-big"><b>${p}</b><span class="t-muted">de 100</span></div>
        ${medidor(p)}
        <ul class="criteria">${criterios.map((c) => `<li class="${c.atendido ? "ok" : ""}">${icone(c.atendido ? "check" : "menos", "icon icon--sm")}<span>${html(c.rotulo)}</span><span>${c.atendido ? "+" : ""}${c.atendido ? c.pontos : 0}/${c.pontos}</span></li>`).join("")}</ul>
      </section>

      <section class="section" aria-labelledby="s-ident">
        <h3 class="section__title" id="s-ident">Identificação</h3>
        <dl class="dl"><div><dt>CNPJ</dt><dd>${html(l.cnpj || "Não informado")}</dd></div><div><dt>Segmento</dt><dd>${html(l.categoria || "Não informado")}</dd></div>
        <div><dt>Origem</dt><dd>${html(l.origem.replaceAll("_", " "))}</dd></div><div><dt>Cadastro</dt><dd>${html(formatar.data(l.criadoEm))}</dd></div></dl>
      </section>

      <section class="section" aria-labelledby="s-local">
        <h3 class="section__title" id="s-local">Localização</h3>
        <dl class="dl"><div><dt>Cidade / UF</dt><dd>${html(local(l) || "Não informado")}</dd></div>
        <div><dt>Coordenadas</dt><dd class="t-num">${temCoordenadas(l) ? l.latitude.toFixed(3) + ", " + l.longitude.toFixed(3) : "Não informadas"}</dd></div></dl>
        ${temCoordenadas(l) ? `<button type="button" class="btn btn--secondary btn--sm" data-acao="ver-no-mapa" data-id="${html(l.id)}">${icone("pino", "icon icon--sm")}Ver no mapa</button>` : '<p class="t-small t-faint">Sem coordenadas, a empresa aparece só na lista.</p>'}
      </section>

      <section class="section" aria-labelledby="s-evid">
        <h3 class="section__title" id="s-evid">Evidências verificáveis</h3>
        <div class="evidence">
          <span>${icone("site", "icon icon--sm")}</span>${l.site ? `<a href="${html(l.site)}" target="_blank" rel="noopener noreferrer">Site da empresa ${icone("link", "icon icon--sm")}</a>` : '<span class="t-muted">Site não informado.</span>'}
        </div>
        ${evidencia ? `<div class="evidence"><span><strong>Fato informado:</strong> ${html(l.fato)}</span><a href="${html(l.fonteFato)}" target="_blank" rel="noopener noreferrer">Conferir a fonte ${icone("link", "icon icon--sm")}</a></div>`
          : `<div class="alert alert--warning">${icone("alerta")}<span>Nenhum fato com URL de fonte. O rascunho não fará afirmações específicas sobre a empresa.</span></div>`}
      </section>

      <section class="section" aria-labelledby="s-notas">
        <h3 class="section__title" id="s-notas">Notas internas</h3>
        <label class="sr-only" for="lead-notes">Notas internas</label>
        <textarea class="textarea" id="lead-notes" maxlength="1000" placeholder="Contexto, próxima ação, quem cuida…">${html(l.nota)}</textarea>
        <p class="field__hint">Só para a equipe. Não registre dados pessoais sensíveis.</p>
      </section>

      <section class="section" aria-labelledby="s-contato">
        <h3 class="section__title" id="s-contato">Contato</h3>
        <label class="switch"><span><strong>Não contatar</strong><br><span class="t-small t-muted">Exclui a empresa de qualquer abordagem. Não se desfaz nesta versão.</span></span><input type="checkbox" id="suppression"${l.suprimido ? " checked disabled" : ""}></label>
      </section>

      <section class="section" aria-labelledby="s-rasc">
        <h3 class="section__title" id="s-rasc">Rascunho de abordagem <span class="badge">Revisão humana</span></h3>
        ${l.suprimido ? `<div class="alert alert--danger">${icone("proibido")}<span>Esta empresa está marcada como não contatar. Não é possível remover esta marcação nesta versão.</span></div>` : ""}
        ${bloqueado ? "" : `<label class="sr-only" for="lead-draft">Rascunho (não é enviado)</label>
        <textarea class="textarea" id="lead-draft" rows="8" placeholder="Use Preparar rascunho para criar uma sugestão a partir dos dados acima.">${html(texto)}</textarea>`}
        <p class="field__hint">O FlowBot não envia mensagens. Confira fatos, base legal e regras do canal antes de usar.</p>
        <div class="draft-actions">
          <button type="button" class="btn btn--secondary" data-acao="gerar"${bloqueado ? " disabled" : ""}>${icone("faisca")}Preparar rascunho</button>
          <button type="button" class="btn btn--primary" data-acao="copiar"${bloqueado ? " disabled" : ""}>${icone("copiar")}Copiar texto</button>
        </div>
      </section>

      <section class="section" aria-labelledby="s-hist">
        <h3 class="section__title" id="s-hist">Histórico desta sessão</h3>
        <ol class="timeline">
          ${eventos.map((e) => `<li>${icone(e.icone, "icon icon--sm")}<span>${html(e.texto)}</span><time>${formatar.hora(e.quando)}</time></li>`).join("")}
          <li>${icone("mais", "icon icon--sm")}<span>Cadastrada (${html(l.origem.replaceAll("_", " "))})</span><time>${html(formatar.data(l.criadoEm))}</time></li>
        </ol>
      </section>
    </div>
  </section>`;
}

function painelNovo() {
  return `<section class="drawer" role="dialog" aria-modal="true" aria-labelledby="novo-titulo" data-chave="novo">
    <span class="drawer__grab" aria-hidden="true"></span>
    <div class="drawer__head">
      <div class="drawer__heading"><span class="t-label">Novo registro</span><h2 class="drawer__title" id="novo-titulo">Adicionar empresa</h2>
      <span class="t-small t-muted">Cadastre só dados comerciais. Nada é consultado fora daqui.</span></div>
      <button type="button" class="btn btn--ghost btn--icon" data-acao="fechar" aria-label="Fechar formulário">${icone("fechar")}</button>
    </div>
    <form id="new-company" class="drawer__body" novalidate>
      <div id="erro-form" role="alert"></div>
      <fieldset class="fieldset"><legend class="section__title">Identificação</legend>
        <div class="field"><label class="field__label" for="new-name">Nome da empresa<span class="req" aria-hidden="true">*</span></label>
          <input class="input" id="new-name" name="nome" maxlength="140" required minlength="2" autocomplete="off" enterkeyhint="next" data-foco-inicial aria-describedby="erro-nome"><span class="field__error" id="erro-nome" hidden></span></div>
        <div class="field"><label class="field__label" for="new-category">Segmento</label><input class="input" id="new-category" name="categoria" maxlength="80" enterkeyhint="next" placeholder="Ex.: Barbearia, Varejo"></div>
        <div class="field"><label class="field__label" for="new-cnpj">CNPJ <span class="t-faint">(opcional)</span></label><input class="input" id="new-cnpj" name="cnpj" maxlength="18" inputmode="numeric" enterkeyhint="next" placeholder="00.000.000/0000-00"></div>
      </fieldset>
      <fieldset class="fieldset"><legend class="section__title">Localização</legend>
        <div class="form-grid form-grid--city">
          <div class="field"><label class="field__label" for="new-city">Cidade</label><input class="input" id="new-city" name="cidade" maxlength="100" enterkeyhint="next"></div>
          <div class="field"><label class="field__label" for="new-uf">UF</label><input class="input" id="new-uf" name="uf" maxlength="2" autocapitalize="characters" enterkeyhint="next"></div>
        </div>
        <div class="form-grid form-grid--2">
          <div class="field"><label class="field__label" for="new-lat">Latitude</label><input class="input" id="new-lat" name="latitude" type="number" step="any" inputmode="decimal" placeholder="-10.916"></div>
          <div class="field"><label class="field__label" for="new-lng">Longitude</label><input class="input" id="new-lng" name="longitude" type="number" step="any" inputmode="decimal" placeholder="-37.061"></div>
        </div>
        <p class="field__hint">Use coordenadas de uma fonte confiável. Sem elas, a empresa aparece só na lista.</p>
      </fieldset>
      <fieldset class="fieldset"><legend class="section__title">Evidências</legend>
        <div class="field"><label class="field__label" for="new-site">Site comercial</label><input class="input" id="new-site" type="url" name="site" inputmode="url" placeholder="https://empresa.com.br"></div>
        <div class="field"><label class="field__label" for="new-fact">Fato público <span class="t-faint">(opcional)</span></label><textarea class="textarea" id="new-fact" name="fato" maxlength="300" rows="3"></textarea></div>
        <div class="field"><label class="field__label" for="new-fact-url">URL da fonte do fato</label><input class="input" id="new-fact-url" name="fonteFato" type="url" inputmode="url" placeholder="https://fonte-oficial.com/…">
          <span class="field__hint">Sem fonte, o fato não entra no rascunho.</span></div>
      </fieldset>
      <div class="alert">${icone("escudo")}<span>O cadastro não inicia campanhas nem consulta serviços externos. Contatos pessoais não são pedidos.</span></div>
    </form>
    <div class="drawer__foot">
      <button class="btn btn--secondary" type="button" data-acao="fechar">Cancelar</button>
      <button class="btn btn--primary grow" type="submit" form="new-company">${icone("mais")}Salvar empresa</button>
    </div>
  </section>`;
}

/* ───────────────────────── Ações ───────────────────────── */
function atualizarLead(id, campos) {
  estado.leads = estado.leads.map((x) => x.id === id ? { ...x, ...campos } : x);
  atualizar();
}
function baixarCsv() {
  const blob = new Blob([exportarCsv(estado.leads)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "flowbot-prospeccao.csv";
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  aviso(estado.leads.length + " empresa(s) exportada(s). Guarde o arquivo em local seguro.", { tipo: "success" });
}
async function importarArquivo(arquivo) {
  if (!arquivo) return;
  if (arquivo.size > 1_000_000) { aviso("CSV acima de 1 MB. Divida em arquivos menores.", { tipo: "danger" }); return; }
  try {
    const resposta = importarCsv(await arquivo.text(), estado.leads);
    const bloqueados = new Set(resposta.suprimirIds);
    estado.leads = [...estado.leads.map((l) => {
      if (!bloqueados.has(l.id)) return l;
      rascunhos.delete(l.id);
      registrar(l.id, "Marcada como não contatar por CSV", "proibido");
      return { ...l, suprimido: true };
    }), ...resposta.adicionados];
    resposta.adicionados.forEach((l) => registrar(l.id, "Importada de " + arquivo.name, "importar"));
    ultimoEnquadramento = "";
    atualizar();
    aviso(resposta.adicionados.length + " importada(s) · " + resposta.duplicados + " duplicada(s) · " + resposta.erros.length + " linha(s) inválida(s)." +
      (resposta.erros.length ? " " + resposta.erros[0] : ""), { tipo: resposta.adicionados.length ? "success" : "info", duracao: 7000 });
  } catch (erro) { aviso(erro.message, { tipo: "danger" }); }
}
function trocarTema() {
  const novo = temaAtual() === "light" ? "dark" : "light";
  aplicarTema(novo);
  atualizarRotuloTema();
  desenharMarcadores({ enquadrar: false });
}

document.addEventListener("click", async (evento) => {
  const menuBotao = evento.target.closest?.('[aria-haspopup="menu"]');
  if (menuBotao) { fecharMenus(menuBotao); alternarMenu(menuBotao); return; }
  if (!evento.target.closest?.(".menu")) fecharMenus();

  const alvo = evento.target.closest?.("[data-acao], [data-filtro], [data-vista], [data-aba]");
  if (!alvo || alvo.disabled) return;
  if (alvo.dataset.filtro) {
    estado.filtro = estado.filtro === alvo.dataset.filtro && alvo.classList.contains("funnel__row") ? "todos" : alvo.dataset.filtro;
    estado.marcado = null; atualizar(); return;
  }
  if (alvo.dataset.vista) { estado.vista = alvo.dataset.vista; estado.marcado = null; atualizar(); return; }
  if (alvo.dataset.aba) {
    estado.aba = alvo.dataset.aba;
    try { sessionStorage.setItem("flowbot-prospeccao-aba", estado.aba); } catch { /* sem armazenamento */ }
    if (estado.aba !== "resumo") estado.vista = estado.aba;
    atualizar(); window.scrollTo({ top: 0 }); return;
  }
  const acao = alvo.dataset.acao;
  if (acao === "novo") abrirPainel({ tipo: "novo" });
  else if (acao === "abrir") { estado.marcado = null; desenharSelecao(); abrirPainel({ tipo: "detalhe", id: alvo.dataset.id }); }
  else if (acao === "fechar" || acao === "fechar-fundo") fecharPainel();
  else if (acao === "importar") { fecharMenus(); $("#csv-file").click(); }
  else if (acao === "exportar") { fecharMenus(); baixarCsv(); }
  else if (acao === "tema") { fecharMenus(); trocarTema(); }
  else if (acao === "desmarcar") { estado.marcado = null; desenharMarcadores({ enquadrar: false }); }
  else if (acao === "legenda") { estado.legendaAberta = !estado.legendaAberta; desenharMarcadores({ enquadrar: false }); $(".map-legend__toggle")?.focus(); }
  else if (acao === "limpar-filtros") { estado.filtro = "todos"; estado.busca = ""; $("#search").value = ""; atualizar(); }
  else if (acao === "ver-no-mapa") verNoMapa(alvo.dataset.id);
  else if (acao === "gerar" && estado.painel?.tipo === "detalhe") {
    const lead = estado.leads.find((x) => x.id === estado.painel.id);
    if (!podePrepararAbordagem(lead)) return;
    rascunhos.set(lead.id, criarRascunho(lead, REMETENTE));
    registrar(lead.id, "Rascunho preparado", "faisca");
    desenharPainel();
    aviso("Rascunho criado. Confira o texto e as fontes antes de usar.", { tipo: "success" });
  } else if (acao === "copiar" && estado.painel?.tipo === "detalhe") {
    const lead = estado.leads.find((x) => x.id === estado.painel.id);
    if (!podePrepararAbordagem(lead)) return;
    const texto = $("#lead-draft")?.value.trim();
    if (!texto) { aviso("Prepare ou escreva uma mensagem antes de copiar."); return; }
    try {
      await navigator.clipboard.writeText(texto);
      registrar(lead.id, "Texto copiado para revisão", "copiar");
      desenharPainel();
      aviso("Texto copiado. O FlowBot não enviou nenhuma mensagem.", { tipo: "success" });
    } catch {
      aviso("Não foi possível copiar automaticamente. Selecione o texto no campo.", { tipo: "danger" });
    }
  }
});

document.addEventListener("input", (evento) => {
  const id = evento.target.id;
  if (id === "search") {
    estado.busca = evento.target.value;
    desenharLista(); desenharMarcadores(); return;
  }
  if (id === "lead-notes" && estado.painel?.tipo === "detalhe") {
    const l = estado.leads.find((x) => x.id === estado.painel.id);
    if (l) l.nota = evento.target.value.slice(0, 1000);
  }
  if (id === "lead-draft" && estado.painel?.tipo === "detalhe") {
    const lead = estado.leads.find((x) => x.id === estado.painel.id);
    if (podePrepararAbordagem(lead)) rascunhos.set(lead.id, evento.target.value);
  }
  if (evento.target.closest?.("#new-company")) { evento.target.removeAttribute("aria-invalid"); $("#erro-form").innerHTML = ""; }
});

document.addEventListener("change", (evento) => {
  const id = evento.target.id;
  if (id === "csv-file") { void importarArquivo(evento.target.files?.[0]); evento.target.value = ""; }
  if (id === "ordem") { estado.ordem = evento.target.value; desenharLista(); }
  if (id === "lead-stage" && estado.painel?.tipo === "detalhe") {
    const de = etapa(estado.leads.find((x) => x.id === estado.painel.id).etapa).nome;
    registrar(estado.painel.id, "Etapa: " + de + " → " + etapa(evento.target.value).nome, "seta");
    atualizarLead(estado.painel.id, { etapa: evento.target.value });
    $("#lead-stage")?.focus({ preventScroll: true });
  }
  if (id === "suppression" && estado.painel?.tipo === "detalhe") {
    const lead = estado.leads.find((x) => x.id === estado.painel.id);
    if (!evento.target.checked || !podePrepararAbordagem(lead)) { desenharPainel(); return; }
    rascunhos.delete(lead.id);
    registrar(lead.id, "Marcada como não contatar", "proibido");
    atualizarLead(lead.id, { suprimido: true });
    $('#painel [data-acao="fechar"]')?.focus({ preventScroll: true });
    aviso("Empresa marcada: não contatar.");
  }
});

document.addEventListener("submit", (evento) => {
  if (evento.target.id !== "new-company") return;
  evento.preventDefault();
  const form = evento.target;
  const nome = form.elements.nome;
  const erroNome = $("#erro-nome");
  if (nome.value.trim().length < 2) {
    nome.setAttribute("aria-invalid", "true");
    erroNome.hidden = false; erroNome.textContent = "Informe o nome da empresa, com pelo menos 2 caracteres.";
    nome.focus(); return;
  }
  erroNome.hidden = true;
  try {
    const lead = validarEmpresa(Object.fromEntries(new FormData(form).entries()));
    if (estado.leads.some((l) => chaveEmpresa(l) === chaveEmpresa(lead)))
      throw new Error("Esta empresa já está cadastrada. Verifique CNPJ, nome e cidade.");
    estado.leads = [...estado.leads, lead];
    registrar(lead.id, "Cadastrada manualmente", "mais");
    ultimoEnquadramento = "";
    focoAnterior = null;
    estado.painel = { tipo: "detalhe", id: lead.id };
    atualizar();
    aviso("Empresa cadastrada só nesta sessão.", { tipo: "success" });
  } catch (erro) {
    $("#erro-form").innerHTML = `<div class="alert alert--danger">${icone("alerta")}<span>${html(erro.message)}</span></div>`;
    $("#erro-form").scrollIntoView({ block: "nearest" });
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    if (document.querySelector('[aria-haspopup="menu"][aria-expanded="true"]')) { fecharMenus(); return; }
    if (estado.painel) { fecharPainel(); return; }
    if (estado.marcado) { estado.marcado = null; desenharMarcadores({ enquadrar: false }); }
  }
  const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (evento.key === "/" && !digitando && !estado.painel) { evento.preventDefault(); $("#search").focus(); }
});

aplicarTema(temaAtual());
// Celular: volta para a aba em que a pessoa estava nesta sessão.
try { const aba = sessionStorage.getItem("flowbot-prospeccao-aba"); if (matchMedia("(max-width: 767px)").matches && ["resumo", "mapa", "lista"].includes(aba)) { estado.aba = aba; if (aba !== "resumo") estado.vista = aba; } } catch { /* sem armazenamento */ }
montarEstrutura();
observarTeclado();
atualizar();

// Módulo de descoberta geográfica: somente importação manual, sem canais de envio.
iniciarBuscaCep({
  getLeads: () => estado.leads,
  onMessage: (message, tipo) => aviso(message, { tipo }),
  onImport: (empresa, consulta) => {
    try {
      if (!/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/.test(empresa.fonte))
        throw new Error("Empresa sem fonte pública verificável.");
      const lead = validarEmpresa({
        nome: empresa.nome,
        cidade: empresa.cidade,
        uf: empresa.uf,
        categoria: empresa.categoria,
        latitude: empresa.latitude,
        longitude: empresa.longitude,
        site: empresa.site,
        origem: "osm_cep_importacao_manual",
        etapa: "pesquisado",
        optInWhatsapp: false,
        suprimido: false,
        nota: "Encontrada por CEP " + consulta.cep + " (raio " + consulta.raio +
          " m). Fonte: " + empresa.fonte + ". Localização aproximada; confira antes de abordar.",
      });
      if (estado.leads.some((x) => chaveEmpresa(x) === chaveEmpresa(lead)))
        return { ok: false, message: "Esta empresa já consta no funil. Nenhuma duplicata foi criada." };
      estado.leads = [...estado.leads, lead];
      registrar(lead.id, "Incluída manualmente a partir do OpenStreetMap", "pino");
      ultimoEnquadramento = "";
      estado.filtro = "todos";
      estado.busca = "";
      $("#search").value = "";
      atualizar();
      return { ok: true, message: "Empresa adicionada ao funil. Nenhuma mensagem foi enviada." };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  },
});
