// Estrutura comum dos módulos do FlowBot: barra lateral (computador), barra superior (celular e tablet)
// e o seletor de módulos. Só módulos que existem aparecem; os próximos (Atendimento, Agentes de IA,
// Operações, Administração) entram aqui quando tiverem tela própria — ver docs/design-system/navegacao.md.
import { icone } from "./icones.mjs";
import { temaAtual } from "./componentes.mjs";

export const MODULOS = [
  { id: "prospeccao", nome: "Prospecção", grupo: "Comercial", icone: "alvo", caminho: "" },
  { id: "estudio", nome: "Bot Studio", grupo: "Automação", icone: "fluxo", caminho: "estudio/", selo: "Prévia" },
  { id: "whatsapp", nome: "Conexão WhatsApp", grupo: "Integrações", icone: "conversa", caminho: "whatsapp.html", selo: "Prévia" },
];

const rotuloTema = () => "Tema " + (temaAtual() === "light" ? "escuro" : "claro");

// raiz: caminho relativo até a raiz do app ("./" ou "../"). acoes: itens extras do menu do módulo.
export function montarShell({ ativo, raiz = "./", nota = "", acoes = [], conteudo = "", inferior = "" }) {
  const atual = MODULOS.find((m) => m.id === ativo);
  const href = (m) => raiz + m.caminho;
  const grupos = [...new Set(MODULOS.map((m) => m.grupo))];
  const itensMenu = acoes.map((a) => a.href
    ? `<a class="menu__item" role="menuitem" href="${a.href}">${icone(a.icone)}${a.rotulo}</a>`
    : `<button type="button" class="menu__item" role="menuitem" data-acao="${a.acao}">${icone(a.icone)}${a.rotulo}</button>`).join("");
  return `
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <div class="shell">
    <aside class="sidebar" aria-label="Menu do FlowBot">
      <a class="brand" href="${raiz}"><img src="${raiz}assets/flowbot-symbol.svg" alt="" width="26" height="26">flowbot</a>
      <nav aria-label="Módulos" class="nav-group">
        ${grupos.map((g) => `<span class="t-label nav-group__label">${g}</span>
          ${MODULOS.filter((m) => m.grupo === g).map((m) => `<a class="nav-item" href="${href(m)}" ${m.id === ativo ? 'aria-current="page"' : ""}>${icone(m.icone)}${m.nome}${m.selo ? `<span class="nav-item__tag">${m.selo}</span>` : ""}</a>`).join("")}`).join("")}
      </nav>
      <div class="sidebar__foot">
        ${nota ? `<p class="sidebar__note">${icone("escudo", "icon icon--sm")}<span>${nota}</span></p>` : ""}
        <button type="button" class="nav-item" data-acao="tema">${icone(temaAtual() === "light" ? "lua" : "sol")}<span data-rotulo-tema>${rotuloTema()}</span></button>
        <a class="nav-item" href="${raiz}landing/">${icone("link")}Site do FlowBot</a>
      </div>
    </aside>
    <div class="shell__main">
      <header class="topbar">
        <a class="brand" href="${raiz}" aria-label="FlowBot, início"><img src="${raiz}assets/flowbot-symbol.svg" alt="" width="26" height="26"><span class="brand__word">flowbot</span></a>
        <div class="menu-anchor topbar__switch">
          <button type="button" class="topbar__module" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-topo">
            <span class="topbar__module-name">${atual.nome}</span>${atual.selo ? `<span class="nav-item__tag">${atual.selo}</span>` : ""}${icone("abaixo", "icon icon--sm")}
            <span class="sr-only">: trocar de módulo e mais ações</span>
          </button>
          <div class="menu" id="menu-topo" role="menu" hidden>
            <p class="menu__label">Módulos</p>
            ${MODULOS.map((m) => `<a class="menu__item" role="menuitem" href="${href(m)}" ${m.id === ativo ? 'aria-current="page"' : ""}>${icone(m.icone)}${m.nome}${m.id === ativo ? icone("check", "icon icon--sm menu__check") : ""}</a>`).join("")}
            ${itensMenu ? `<div class="menu__sep"></div><p class="menu__label">${atual.nome}</p>${itensMenu}` : ""}
            <div class="menu__sep"></div>
            <button type="button" class="menu__item" role="menuitem" data-acao="tema">${icone("sol")}<span data-rotulo-tema>${rotuloTema()}</span></button>
            <a class="menu__item" role="menuitem" href="${raiz}landing/">${icone("link")}Site do FlowBot</a>
          </div>
        </div>
      </header>
      ${conteudo}
    </div>
  </div>
  ${inferior}`;
}

export function atualizarRotuloTema() {
  document.querySelectorAll("[data-rotulo-tema]").forEach((e) => { e.textContent = rotuloTema(); });
}
