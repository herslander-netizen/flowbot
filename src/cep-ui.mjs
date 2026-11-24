// Busca de empresas por CEP: UI isolada da Prospecção existente.
// Nenhum resultado entra no CRM sem clique explícito do usuário.
import { icone } from "./ui/icones.mjs";
import { html, fecharMenus, prenderFoco } from "./ui/componentes.mjs";

const SEGMENTOS = [
  ["todos", "Todos os segmentos"],
  ["comercio", "Comércio"],
  ["alimentacao", "Alimentação"],
  ["servicos", "Serviços"],
  ["beleza", "Beleza"],
  ["saude", "Saúde"],
  ["hospedagem", "Hospedagem"],
];

export function iniciarBuscaCep({ getLeads, onImport, onMessage, fetchImpl = fetch }) {
  const actions = document.querySelector(".page-head__actions");
  if (!actions) throw new Error("A interface de Prospecção não está pronta.");
  const launch = document.createElement("button");
  launch.type = "button";
  launch.className = "btn btn--secondary";
  launch.id = "buscar-empresas-cep";
  launch.innerHTML = icone("pino") + "Buscar por CEP";
  actions.insertBefore(launch, actions.querySelector('[data-acao="novo"]'));

  const menu = document.querySelector("#menu-topo");
  const menuLaunch = document.createElement("button");
  menuLaunch.type = "button";
  menuLaunch.className = "menu__item";
  menuLaunch.setAttribute("role", "menuitem");
  menuLaunch.innerHTML = icone("pino") + "Buscar por CEP";
  menu?.prepend(menuLaunch);

  const root = document.createElement("div");
  root.id = "cep-search-root";
  document.body.appendChild(root);
  const state = {
    open: false, busy: false, cep: "", raio: "1000", segmento: "todos",
    resultado: null, error: "",
  };
  let lastFocus = null, releaseFocus = null, controller = null, requestCounter = 0;

  function resultMarkup() {
    const result = state.resultado;
    if (!result) return "";
    const existing = new Set(getLeads().map((x) =>
      [String(x.nome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        String(x.cidade).toLowerCase(), String(x.uf).toUpperCase()].join("|")));
    const item = (empresa) => {
      const key = [empresa.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        empresa.cidade.toLowerCase(), empresa.uf.toUpperCase()].join("|");
      const duplicated = existing.has(key);
      return '<li class="cep-result">' +
        '<div class="cep-result__main"><strong>' + html(empresa.nome) + '</strong>' +
        '<span class="t-small t-muted">' + html(empresa.categoria) + " · " +
        html(String(empresa.distanciaMetros)) + ' m do centro aproximado</span>' +
        '<a href="' + html(empresa.fonte) +
        '" target="_blank" rel="noopener noreferrer" class="t-small">Ver fonte no OpenStreetMap</a></div>' +
        '<button type="button" class="btn btn--secondary cep-result__add" data-cep-import="' +
        html(empresa.id) + '"' + (duplicated ? " disabled" : "") + ">" +
        (duplicated ? "Já cadastrada" : "Adicionar") + "</button></li>";
    };
    return '<section class="cep-results" aria-labelledby="cep-results-title">' +
      '<h3 id="cep-results-title" class="section__title">Resultados <span>' +
      result.empresas.length + " empresa(s)</span></h3>" +
      '<p class="t-small t-muted">' + html(result.endereco) + "</p>" +
      '<p class="t-small t-muted">' + html(result.observacao) + "</p>" +
      (result.empresas.length
        ? '<ul class="cep-results__list">' + result.empresas.map(item).join("") + "</ul>"
        : '<div class="empty"><p class="empty__title">Nenhuma empresa mapeada</p>' +
          '<p class="empty__text">O OpenStreetMap pode não ter negócios cadastrados nessa área. Tente outro raio ou região.</p></div>') +
      '<p class="t-small t-faint">Fonte: © OpenStreetMap contributors. ' +
      'Dados colaborativos, não equivalem a cadastro empresarial oficial. Não há envio de mensagens.</p></section>';
  }

  function paint({ refocus = true } = {}) {
    if (!state.open) { root.innerHTML = ""; return; }
    const opt = SEGMENTOS.map(([value, label]) =>
      '<option value="' + value + '"' + (state.segmento === value ? " selected" : "") + ">" +
      html(label) + "</option>").join("");
    root.innerHTML = '<div class="overlay" data-cep-close></div>' +
      '<section class="drawer" role="dialog" aria-modal="true" aria-labelledby="cep-title">' +
      '<span class="drawer__grab" aria-hidden="true"></span>' +
      '<div class="drawer__head"><div class="drawer__heading">' +
      '<span class="t-label">Prospecção · Território</span>' +
      '<h2 class="drawer__title" id="cep-title">Buscar empresas por CEP</h2>' +
      '<p class="t-small t-muted">Descubra negócios mapeados perto de um CEP. A inclusão no funil é manual.</p>' +
      '</div><button class="btn btn--ghost btn--icon" type="button" data-cep-close aria-label="Fechar busca">' +
      icone("fechar") + '</button></div>' +
      '<div class="drawer__body cep-drawer__body">' +
      '<form id="cep-search-form" class="cep-form">' +
      '<div class="field"><label class="field__label" for="cep-input">CEP de referência</label>' +
      '<input class="input" id="cep-input" name="cep" inputmode="numeric" autocomplete="postal-code" ' +
      'maxlength="9" placeholder="00000-000" required data-cep-focus value="' + html(state.cep) + '"></div>' +
      '<div class="form-grid form-grid--2">' +
      '<div class="field"><label class="field__label" for="cep-radius">Distância</label>' +
      '<select class="select" id="cep-radius" name="raio">' +
      [500, 1000, 3000, 5000].map((v) =>
        '<option value="' + v + '"' + (state.raio === String(v) ? " selected" : "") + '>' +
        (v >= 1000 ? v / 1000 + " km" : v + " m") + "</option>").join("") +
      '</select></div>' +
      '<div class="field"><label class="field__label" for="cep-segment">Segmento</label>' +
      '<select class="select" id="cep-segment" name="segmento">' + opt + '</select></div></div>' +
      '<button class="btn btn--primary cep-form__submit" type="submit"' +
      (state.busy ? " disabled" : "") + '>' +
      (state.busy ? "Buscando..." : icone("busca") + "Pesquisar empresas") + '</button>' +
      '</form>' +
      '<div id="cep-status" role="status" aria-live="polite">' +
      (state.error ? '<div class="alert alert--danger">' + icone("alerta") +
        '<span>' + html(state.error) + '</span></div>' : "") +
      (state.busy ? '<p class="t-small t-muted">Consultando ViaCEP, localização e negócios do OpenStreetMap...</p>' : "") +
      '</div>' + resultMarkup() +
      '<p class="field__hint">O CEP pode representar uma área ampla; resultados e coordenadas são aproximados. ' +
      'Nenhum telefone, consentimento ou contato é inferido.</p></div></section>';
    releaseFocus?.();
    releaseFocus = prenderFoco(root.querySelector(".drawer"));
    if (refocus) root.querySelector("[data-cep-focus]")?.focus({ preventScroll: true });
  }

  function open() {
    if (state.open) return;
    lastFocus = document.activeElement;
    fecharMenus();
    state.open = true;
    state.error = "";
    document.body.style.overflow = "hidden";
    paint();
  }
  function close() {
    if (!state.open) return;
    requestCounter++;
    controller?.abort();
    controller = null;
    state.busy = false;
    state.open = false;
    releaseFocus?.();
    releaseFocus = null;
    root.innerHTML = "";
    document.body.style.overflow = "";
    if (document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  async function search(form) {
    const data = new FormData(form);
    state.cep = String(data.get("cep") ?? "").trim();
    state.raio = String(data.get("raio") ?? "1000");
    state.segmento = String(data.get("segmento") ?? "todos");
    const onlyDigits = state.cep.replace(/\D/g, "");
    if (!/^\d{8}$/.test(onlyDigits)) {
      state.error = "Informe um CEP com 8 números.";
      state.resultado = null;
      paint();
      return;
    }
    controller?.abort();
    controller = new AbortController();
    const thisRequest = ++requestCounter;
    state.cep = onlyDigits.slice(0, 5) + "-" + onlyDigits.slice(5);
    state.busy = true;
    state.error = "";
    state.resultado = null;
    paint({ refocus: false });
    try {
      const query = new URLSearchParams({ cep: onlyDigits, raio: state.raio, segmento: state.segmento });
      const response = await fetchImpl("/api/prospeccao/cep?" + query, {
        headers: { accept: "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.mensagem === "string"
        ? data.mensagem : "A pesquisa está indisponível. Verifique se o serviço de CEP está configurado.");
      if (!Array.isArray(data.empresas)) throw new Error("A busca retornou um formato inválido.");
      if (thisRequest !== requestCounter || !state.open) return;
      state.resultado = data;
    } catch (error) {
      if (thisRequest !== requestCounter || !state.open) return;
      state.error = error.name === "AbortError" ? "" :
        (error instanceof SyntaxError ? "Serviço de CEP não disponível nesta prévia estática." :
        (error.message || "A pesquisa falhou."));
    } finally {
      if (thisRequest === requestCounter && state.open) {
        state.busy = false;
        paint({ refocus: false });
        root.querySelector("#cep-status")?.scrollIntoView({ block: "nearest" });
      }
    }
  }

  launch.addEventListener("click", open);
  menuLaunch.addEventListener("click", open);
  root.addEventListener("click", (event) => {
    const target = event.target.closest?.("[data-cep-close], [data-cep-import]");
    if (!target) return;
    if (target.hasAttribute("data-cep-close")) { close(); return; }
    if (!state.resultado || state.busy) return;
    const company = state.resultado.empresas.find((x) => x.id === target.dataset.cepImport);
    if (!company) return;
    const result = onImport(company, state.resultado);
    if (result.ok) { close(); onMessage(result.message, "success"); }
    else { state.error = result.message; paint({ refocus: false }); }
  });
  root.addEventListener("submit", (event) => {
    if (event.target.id !== "cep-search-form") return;
    event.preventDefault();
    if (!state.busy) void search(event.target);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }, true);
  return { open, close };
}
