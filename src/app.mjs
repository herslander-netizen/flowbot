import {
  ETAPAS, dadosDeDemonstracao, validarEmpresa, chaveEmpresa,
  importarCsv, criarRascunho, pontuacao, exportarCsv
} from "./prospecting.mjs";

let leads = dadosDeDemonstracao();
let filtro = "todos";
let busca = "";
let vista = "mapa";
let selecionado = null;
let formularioAberto = false;
let mapa = null;
let avisoTimer = null;
const rascunhos = new Map();
const app = document.querySelector("#app");

function html(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
}

function icone(nome) {
  const desenhos = {
    grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2"/><path d="M17 4a4 4 0 0 1 0 8M19 15a6 6 0 0 1 2 5v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    download: '<path d="M12 3v14m-5-5 5 5 5-5"/><path d="M4 19v2h16v-2"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    x: '<path d="M5 5 19 19M19 5 5 19"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    spark: '<path d="m12 3 1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6L12 3Z"/><path d="m19 18 .7 2.3L22 21l-2.3.7L19 24l-.7-2.3L16 21l2.3-.7L19 18Z"/>',
    shield: '<path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/>',
  };
  return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    (desenhos[nome] ?? "") + '</svg>';
}

function etiqueta(etapa) { return ETAPAS.find((x) => x.id === etapa) ?? ETAPAS[0]; }
function filtrados() {
  return leads.filter((lead) => {
    if (filtro !== "todos" && lead.etapa !== filtro) return false;
    if (!busca.trim()) return true;
    const termo = busca.toLocaleLowerCase("pt-BR");
    return [lead.nome, lead.cidade, lead.uf, lead.categoria]
      .some((v) => String(v ?? "").toLocaleLowerCase("pt-BR").includes(termo));
  });
}
function estatistica(label, valor, detalhe) {
  return '<article class="stat"><div class="stat-label">' + html(label) +
    '</div><div class="stat-value">' + valor + '</div><div class="stat-detail">' +
    html(detalhe) + '</div></article>';
}
function leadCard(lead) {
  const etapa = etiqueta(lead.etapa);
  const local = [lead.cidade, lead.uf].filter(Boolean).join(" / ");
  return [
    '<button type="button" class="lead" data-action="lead" data-id="', html(lead.id), '">',
    '<span class="lead-head"><span class="lead-avatar">', html(lead.nome.charAt(0).toUpperCase()), '</span>',
    '<span><span class="lead-name">', html(lead.nome), '</span><br><span class="lead-sub">',
    html(lead.categoria || "Segmento não informado"), local ? " · " + html(local) : "", '</span></span>',
    '<span class="lead-end">', icone("arrow"), '</span></span>',
    '<span class="lead-foot"><span class="status"><span class="stage-dot" style="background:',
    html(etapa.cor), '"></span>', html(etapa.nome), '</span>',
    lead.suprimido ? '<span class="stop">Não contatar</span>' : '',
    '<span class="score">', pontuacao(lead), '/100</span></span></button>'
  ].join("");
}
function lista() {
  const dados = filtrados();
  const titulacao = '<div class="panel-heading"><h3 class="panel-title">Empresas no funil</h3>' +
    '<span class="panel-meta">' + dados.length + ' resultados</span></div>';
  const corpo = dados.length ? dados.map(leadCard).join("") :
    '<div class="empty"><strong>Nenhuma empresa encontrada</strong>Altere os filtros ou importe uma lista CSV autorizada.</div>';
  return titulacao + '<div class="lead-list">' + corpo + '</div>';
}
function filtros() {
  return '<button class="stage-button ' + (filtro === "todos" ? "active" : '') +
    '" type="button" data-filter="todos">Todas <span class="stage-count">' + leads.length +
    '</span></button>' + ETAPAS.map((etapa) => {
      const total = leads.filter((l) => l.etapa === etapa.id).length;
      return '<button type="button" class="stage-button ' + (filtro === etapa.id ? "active" : "") +
        '" data-filter="' + etapa.id + '"><span class="stage-dot" style="background:' +
        etapa.cor + '"></span>' + html(etapa.nome) + ' <span class="stage-count">' +
        total + '</span></button>';
    }).join("");
}
function renderApp() {
  if (mapa) { mapa.remove(); mapa = null; }
  const ativos = leads.filter((l) => !l.suprimido);
  app.innerHTML = [
    '<div class="app"><aside class="sidebar"><a class="brand" href="./"><img alt="" src="./assets/flowbot-symbol.svg">flowbot</a>',
    '<nav aria-label="Navegação principal">',
    '<button class="nav-link active" data-view="mapa">', icone("grid"), 'Visão geral</button>',
    '<button class="nav-link" data-view="lista">', icone("users"), 'Empresas</button>',
    '<button class="nav-link" data-action="new">', icone("plus"), 'Novo lead</button>',
    '</nav><div class="sidebar-bottom"><strong>Prospecção responsável</strong><br>Pesquisa separada de envio. Nenhum contato será disparado neste MVP.</div></aside>',
    '<main class="main"><div class="topbar"><div class="top-brand"><img alt="" src="./assets/flowbot-symbol.svg">flowbot</div>',
    '<span class="pill">● MVP local · Sem envios</span></div>',
    '<section class="heading-row"><div><p class="eyebrow">FLOWBOT / COMERCIAL</p>',
    '<h1>Seu próximo cliente<br>começa aqui<span style="color:var(--blue)">.</span></h1>',
    '<p class="subtitle">Organize empresas, entenda oportunidades e prepare abordagens que usam fatos verificáveis. A decisão de contato continua sendo sua.</p></div>',
    '<div class="actions"><button class="btn btn-ghost" type="button" data-action="export">',
    icone("download"), 'Exportar CSV</button>',
    '<button class="btn" type="button" data-action="import">', icone("upload"), 'Importar CSV</button>',
    '<button class="btn btn-primary" type="button" data-action="new">', icone("plus"), 'Adicionar empresa</button>',
    '<input class="file-input" id="csv-file" type="file" accept=".csv,text/csv" aria-label="Arquivo CSV de empresas"/></div></section>',
    '<section class="stats" aria-label="Resumo do funil">',
    estatistica("Empresas cadastradas", leads.length, "Dados desta sessão"),
    estatistica("Leads qualificados", leads.filter((l) => l.etapa === "qualificado").length, "Prontos para revisão"),
    estatistica("Em negociação", leads.filter((l) => ["proposta", "negociacao"].includes(l.etapa)).length, "Propostas e negociações"),
    estatistica("Contatos permitidos?", ativos.length, "Ainda sem autorização de envio"),
    '</section>',
    '<div class="note">', icone("info"),
    '<span>Este é um <strong>ambiente local de demonstração</strong>: os dados ficam apenas na memória desta aba e se perdem ao atualizar. Os exemplos são fictícios. Nenhum scraping, WhatsApp, e-mail ou IA é executado. Exporte o CSV para guardar as informações.</span></div>',
    '<div class="workspace-bar"><div><h2 class="section-label">Território comercial</h2><p class="section-description">Pesquise, filtre e avance cada empresa no funil.</p></div>',
    '<div class="switcher" aria-label="Visualização"><button type="button" data-view="mapa" class="',
    vista === "mapa" ? "active" : '', '">Mapa</button><button type="button" data-view="lista" class="',
    vista === "lista" ? "active" : '', '">Lista</button></div></div>',
    '<div class="toolbar"><input class="search" type="search" id="search" placeholder="Buscar empresa, cidade ou segmento…" value="',
    html(busca), '" aria-label="Pesquisar empresas"></div>',
    '<div class="stage-filter" aria-label="Filtrar etapas">', filtros(), '</div>',
    '<div class="workspace ', vista === "lista" ? 'list-mode' : '', '">',
    '<section class="panel map-panel ', vista === "lista" ? 'hidden' : '', '">',
    '<div class="panel-heading"><h3 class="panel-title">Mapa de oportunidades</h3>',
    '<span class="panel-meta">● Pontos com coordenadas</span></div>',
    '<div class="map-wrap"><div id="map" role="region" aria-label="Mapa com empresas da lista"></div></div>',
    '<div class="map-note">© OpenStreetMap contributors. Mapa para navegação pontual; não é fonte de coleta de leads. Empresas importadas sem coordenadas aparecem somente na lista.</div></section>',
    '<section class="panel list-panel" id="results">', lista(), '</section></div>',
    '<footer class="footer">FlowBot · Produto da Alvo Digital · Prospecção responsável · Sem integração com o motor em produção</footer>',
    '</main></div>',
    selecionado ? renderDetalhe() : (formularioAberto ? renderFormulario() : ''),
    '<div id="toast" class="toast hidden" role="status" aria-live="polite"></div>'
  ].join("");
  if (vista === "mapa") setTimeout(montarMapa, 0);
  if (selecionado || formularioAberto) {
    const fechar = document.querySelector('[data-action="close"]');
    fechar?.focus({ preventScroll: true });
  }
}
function renderDetalhe() {
  const l = leads.find((x) => x.id === selecionado);
  if (!l) { selecionado = null; return ""; }
  const e = etiqueta(l.etapa);
  const texto = rascunhos.get(l.id) ?? "";
  return [
    '<div class="overlay" data-overlay="true"><section class="drawer" role="dialog" aria-modal="true" aria-label="Detalhes da empresa">',
    '<div class="drawer-head"><div><span class="drawer-kicker">Detalhes do prospect</span><h2>',
    html(l.nome), '</h2><span class="panel-meta">',
    html([l.categoria, l.cidade, l.uf].filter(Boolean).join(" · ")), '</span></div>',
    '<button type="button" class="icon-btn" data-action="close" aria-label="Fechar">',
    icone("x"), '</button></div>',
    '<div class="detail-grid"><div class="detail"><label>Pontuação explicável</label><strong>',
    pontuacao(l), ' de 100</strong></div><div class="detail"><label>Origem do cadastro</label><strong>',
    html(l.origem.replaceAll("_", " ")), '</strong></div></div>',
    '<div class="field"><label for="lead-stage">Etapa comercial</label><select id="lead-stage">',
    ETAPAS.map((s) => '<option value="' + s.id + '" ' + (s.id === l.etapa ? 'selected' : '') +
      '>' + html(s.nome) + '</option>').join(""), '</select></div>',
    '<div class="field"><label for="lead-notes">Notas internas</label><textarea id="lead-notes" maxlength="1000" placeholder="Registre o contexto e a próxima ação…">',
    html(l.nota), '</textarea><small>Informações internas. Não insira dados sensíveis.</small></div>',
    '<div class="hr"></div><div class="field-title">Informações verificáveis</div>',
    '<div class="detail-grid"><div class="detail"><label>Site</label><strong>',
    l.site ? '<a href="' + html(l.site) + '" target="_blank" rel="noopener noreferrer">Visitar ↗</a>' : 'Não informado',
    '</strong></div><div class="detail"><label>CNPJ</label><strong>',
    html(l.cnpj || "Não informado"), '</strong></div></div>',
    '<div class="info">', l.fato && l.fonteFato ?
      'Fato informado: ' + html(l.fato) + '<br>Confira a fonte antes de usar: <a href="' +
      html(l.fonteFato) + '" target="_blank" rel="noopener noreferrer">Abrir evidência ↗</a>' :
      'Nenhuma evidência com URL de origem cadastrada. O rascunho não incluirá alegações específicas.',
    '</div>',
    '<label class="checkbox-row"><input type="checkbox" id="suppression" ',
    l.suprimido ? 'checked' : '', '> Não contatar / excluir de abordagens</label>',
    '<div class="hr"></div><div class="field-title">Mensagem personalizada · Revisão humana</div>',
    '<div class="field"><label for="lead-draft">Rascunho (não é enviado)</label>',
    '<textarea id="lead-draft" rows="8" placeholder="Clique em Preparar rascunho para criar uma sugestão…">',
    html(texto), '</textarea><small>Nenhum contato é autorizado automaticamente. Verifique origem, base legal e política do canal antes de abordar.</small></div>',
    '<div class="drawer-actions"><button class="btn" data-action="generate">', icone("spark"),
    'Preparar rascunho</button><button class="btn btn-primary" data-action="copy">',
    icone("copy"), 'Copiar texto</button></div>',
    '<div class="hr"></div><div class="panel-meta">Criado em ',
    html(new Date(l.criadoEm).toLocaleDateString("pt-BR")), ' · Nenhuma ação enviada</div>',
    '</section></div>'
  ].join("");
}
function renderFormulario() {
  return [
    '<div class="overlay" data-overlay="true"><section class="drawer" role="dialog" aria-modal="true" aria-label="Adicionar empresa">',
    '<div class="drawer-head"><div><span class="drawer-kicker">Novo registro</span><h2>Adicionar empresa</h2>',
    '<span class="panel-meta">Cadastre apenas dados comerciais necessários.</span></div>',
    '<button type="button" class="icon-btn" data-action="close" aria-label="Fechar">',
    icone("x"), '</button></div>',
    '<form id="new-company"><div class="field"><label for="new-name">Nome da empresa *</label>',
    '<input id="new-name" name="nome" maxlength="140" required minlength="2" autocomplete="off"></div>',
    '<div class="detail-grid"><div class="field"><label for="new-city">Cidade</label>',
    '<input id="new-city" name="cidade" maxlength="100"></div>',
    '<div class="field"><label for="new-uf">UF</label><input id="new-uf" name="uf" maxlength="2"></div></div>',
    '<div class="field"><label for="new-category">Segmento</label>',
    '<input id="new-category" name="categoria" maxlength="80"></div>',
    '<div class="field"><label for="new-cnpj">CNPJ (opcional)</label>',
    '<input id="new-cnpj" name="cnpj" maxlength="18" inputmode="numeric"></div>',
    '<div class="field"><label for="new-site">Site comercial</label>',
    '<input id="new-site" type="url" name="site" placeholder="https://empresa.com.br"></div>',
    '<div class="detail-grid"><div class="field"><label for="new-lat">Latitude</label>',
    '<input id="new-lat" name="latitude" type="number" step="any" placeholder="-10.916"></div>',
    '<div class="field"><label for="new-lng">Longitude</label>',
    '<input id="new-lng" name="longitude" type="number" step="any" placeholder="-37.061"></div></div>',
    '<div class="field"><label for="new-fact">Fato público (opcional)</label>',
    '<textarea id="new-fact" name="fato" maxlength="300"></textarea></div>',
    '<div class="field"><label for="new-fact-url">URL da fonte do fato</label>',
    '<input id="new-fact-url" name="fonteFato" type="url" placeholder="https://fonte-oficial.com/...">',
    '<small>Sem fonte, o fato não será usado no rascunho.</small></div>',
    '<p class="info">O cadastro não inicia campanhas nem faz consultas externas. Contatos pessoais não são solicitados neste MVP.</p>',
    '<button class="btn btn-primary" style="width:100%;margin-top:17px" type="submit">',
    icone("plus"), 'Salvar empresa na sessão</button></form></section></div>'
  ].join("");
}

function montarMapa() {
  const elemento = document.querySelector("#map");
  if (!elemento) return;
  if (!globalThis.L) {
    elemento.innerHTML = '<div class="map-empty">O mapa precisa de conexão para carregar a biblioteca Leaflet. Você pode continuar pela lista.</div>';
    return;
  }
  const pontos = filtrados().filter((l) => Number.isFinite(l.latitude) &&
    Number.isFinite(l.longitude));
  if (!pontos.length) {
    elemento.innerHTML = '<div class="map-empty">Nenhuma empresa filtrada possui coordenadas. Adicione latitude e longitude na importação CSV.</div>';
    return;
  }
  mapa = L.map(elemento, { zoomControl: true, scrollWheelZoom: false }).setView([-10.93, -37.06], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mapa);
  const bounds = [];
  pontos.forEach((l) => {
    const color = etiqueta(l.etapa).cor;
    const ponto = L.circleMarker([l.latitude, l.longitude], {
      radius: 9, color: "#0f1520", weight: 3, fillColor: color, fillOpacity: 1,
    }).addTo(mapa);
    ponto.bindTooltip(html(l.nome), { direction: "top" });
    ponto.on("click", () => { selecionado = l.id; renderApp(); });
    bounds.push([l.latitude, l.longitude]);
  });
  if (bounds.length > 1) mapa.fitBounds(bounds, { padding: [34, 34], maxZoom: 12 });
  setTimeout(() => mapa?.invalidateSize(), 100);
}

function toast(texto) {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = texto;
  el.classList.remove("hidden");
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.add("hidden"), 4300);
}
function abrir(id) { selecionado = id; formularioAberto = false; renderApp(); }
function fechar() { selecionado = null; formularioAberto = false; renderApp(); }
function atualizarLead(id, campos) {
  leads = leads.map((x) => x.id === id ? { ...x, ...campos } : x);
  renderApp();
}
function baixarCsv() {
  const blob = new Blob([exportarCsv(leads)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "flowbot-prospeccao.csv";
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Arquivo exportado. Guarde-o em local seguro.");
}
async function importarArquivo(arquivo) {
  if (!arquivo) return;
  if (arquivo.size > 1_000_000) { toast("CSV acima de 1 MB. Divida em arquivos menores."); return; }
  try {
    const resposta = importarCsv(await arquivo.text(), leads);
    leads = [...leads, ...resposta.adicionados];
    renderApp();
    toast(resposta.adicionados.length + " empresas importadas · " + resposta.duplicados +
      " duplicadas · " + resposta.erros.length + " linhas inválidas." +
      (resposta.erros.length ? " " + resposta.erros[0] : ""));
  } catch (erro) { toast(erro.message); }
}

document.addEventListener("click", async (evento) => {
  const alvo = evento.target.closest?.("[data-action], [data-filter], [data-view], [data-overlay]");
  if (!alvo) return;
  if (alvo.dataset.overlay) {
    if (evento.target === alvo) fechar();
    return;
  }
  if (alvo.dataset.filter) { filtro = alvo.dataset.filter; renderApp(); return; }
  if (alvo.dataset.view) { vista = alvo.dataset.view; renderApp(); return; }
  const acao = alvo.dataset.action;
  if (acao === "new") { formularioAberto = true; selecionado = null; renderApp(); }
  if (acao === "lead") abrir(alvo.dataset.id);
  if (acao === "close") fechar();
  if (acao === "import") document.querySelector("#csv-file")?.click();
  if (acao === "export") baixarCsv();
  if (acao === "generate" && selecionado) {
    const lead = leads.find((x) => x.id === selecionado);
    rascunhos.set(selecionado, criarRascunho(lead, "Alvo Digital"));
    const campo = document.querySelector("#lead-draft");
    if (campo) campo.value = rascunhos.get(selecionado);
    toast("Rascunho criado. Confira o texto e as fontes antes de usar.");
  }
  if (acao === "copy" && selecionado) {
    const texto = document.querySelector("#lead-draft")?.value.trim();
    if (!texto) { toast("Prepare ou escreva uma mensagem antes de copiar."); return; }
    try {
      await navigator.clipboard.writeText(texto);
      toast("Texto copiado. O FlowBot não enviou nenhuma mensagem.");
    } catch {
      toast("Não foi possível copiar automaticamente. Selecione o texto no campo.");
    }
  }
});
document.addEventListener("input", (evento) => {
  if (evento.target.id === "search") {
    busca = evento.target.value;
    const secao = document.querySelector("#results");
    if (secao) secao.innerHTML = lista();
    if (vista === "mapa") { if (mapa) { mapa.remove(); mapa = null; } montarMapa(); }
  }
  if (evento.target.id === "lead-notes" && selecionado) {
    const l = leads.find((x) => x.id === selecionado);
    if (l) l.nota = evento.target.value.slice(0, 1000);
  }
  if (evento.target.id === "lead-draft" && selecionado) {
    rascunhos.set(selecionado, evento.target.value);
  }
});
document.addEventListener("change", (evento) => {
  if (evento.target.id === "csv-file") {
    void importarArquivo(evento.target.files?.[0]);
    evento.target.value = "";
  }
  if (evento.target.id === "lead-stage" && selecionado) {
    atualizarLead(selecionado, { etapa: evento.target.value });
  }
  if (evento.target.id === "suppression" && selecionado) {
    atualizarLead(selecionado, { suprimido: evento.target.checked });
    toast(evento.target.checked ? "Empresa marcada: não contatar." : "Marcação removida. Isso não concede consentimento.");
  }
});
document.addEventListener("submit", (evento) => {
  if (evento.target.id !== "new-company") return;
  evento.preventDefault();
  try {
    const lead = validarEmpresa(Object.fromEntries(new FormData(evento.target).entries()));
    if (leads.some((l) => chaveEmpresa(l) === chaveEmpresa(lead)))
      throw new Error("Esta empresa já está cadastrada. Verifique CNPJ, nome e cidade.");
    leads = [...leads, lead];
    formularioAberto = false;
    selecionado = lead.id;
    renderApp();
    toast("Empresa cadastrada apenas nesta sessão.");
  } catch (erro) { toast(erro.message); }
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && (selecionado || formularioAberto)) fechar();
});
renderApp();