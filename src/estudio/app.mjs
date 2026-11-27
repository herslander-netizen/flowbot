// Bot Studio — entrada da interface. Liga shell, estado, fonte de dados, sincronia, telas e eventos.
// Tudo o que é demonstração vem da fonte (fontes.mjs); nada aqui conecta ao motor ou ao WhatsApp.
import { criarFonteDeDemonstracao, roteiroDaUrl, montarEntradaDaPonte, lerSaidaDaPonte } from "./dados.mjs";
import { criarSincronia } from "./sincronia.mjs";
import { conferirCenarios } from "./cenarios.mjs";
import { estado, TELAS, problemas, alterado, comoRascunho, mudarRascunho, desfazerUltima, refazerUltima, registrarEvento, reiniciarConversa, publicada, revisaoAtual, lembrarPosicao, lerPosicao } from "./estado.mjs";
import { iniciarConversa, responder, esgotarPrazo, noPorId, organizarFluxo, compararVersoes } from "./fluxo.mjs";
import { inserirPasso, removerPasso, ligar, atualizarConfig, arvoreDoFluxo, repetirConversa } from "./edicao.mjs";
import { LIMITES, portasDoNo, nomeDaPorta } from "./catalogo.mjs";
import { cabecalho, faixas, telaAgentes, telaFluxo, telaOficina, telaSimulador, telaVersoes, detalheDoAgente, folhaDoPasso, detalhesDaSimulacao, sobreDemonstracao, painelLateral, resultadosDaBusca, acoesDoPasso, folhaDeConflito } from "./telas.mjs";
import { ligarCanvas, enquadrar, zoom, centralizar, acabouDeArrastar, reiniciarVista } from "./canvas.mjs";
import { avisosDoPasso, seletorDeTipo } from "./inspetor.mjs";
import { montarShell, atualizarRotuloTema } from "../ui/shell.mjs";
import { icone } from "../ui/icones.mjs";
import { html, formatar, aviso, prenderFoco, temaAtual, aplicarTema, alternarMenu, fecharMenus, blocoDeEstado, ligarArrasteDaFolha, observarTeclado } from "../ui/componentes.mjs";

const $ = (s, r = document) => r.querySelector(s);
const largo = () => matchMedia("(min-width: 1024px)").matches;
const reduzir = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let soltarFoco = null; let focoAnterior = null;
const rolagens = {};

/* ───────────────────────── Estrutura ───────────────────────── */
function montar() {
  document.body.innerHTML = montarShell({
    ativo: "estudio", raiz: "../",
    nota: "Prévia visual. Nada é salvo no motor nem enviado no WhatsApp.",
    acoes: [{ acao: "sobre-demo", icone: "info", rotulo: "O que é real nesta prévia" }, { acao: "baixar-local", icone: "exportar", rotulo: "Baixar o rascunho (JSON)" }],
    conteudo: `<main class="main main--studio" id="conteudo" tabindex="-1">
      <div class="page page--studio">
        <div id="faixas"></div>
        <div id="cabecalho"></div>
        <nav class="tabs" aria-label="Telas do Bot Studio">${TELAS.map((t) => `<button type="button" class="tabs__item" data-tela="${t.id}">${icone(t.icone)}${t.nome}</button>`).join("")}</nav>
        <div id="tela"></div>
      </div>
    </main>`,
    inferior: `<nav class="bottomnav" aria-label="Telas do Bot Studio">${TELAS.map((t) => `<button type="button" class="bottomnav__item" data-tela="${t.id}">${icone(t.icone)}${t.curto}</button>`).join("")}</nav>
      <div id="painel"></div><div id="contexto"></div>`,
  });
}

function desenharTopo() {
  $("#faixas").innerHTML = faixas();
  $("#cabecalho").innerHTML = cabecalho();
}
function desenhar({ animar = false } = {}) {
  document.querySelectorAll("[data-tela]").forEach((b) => { if (b.dataset.tela === estado.tela) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  $("#conteudo").dataset.tela = estado.tela;
  desenharTopo();
  const telas = { agentes: telaAgentes, fluxo: telaFluxo, oficina: telaOficina, simulador: telaSimulador, versoes: telaVersoes };
  const rolagem = window.scrollY;
  $("#tela").innerHTML = telas[estado.tela]({ largo: largo() });
  if (!animar) { $("#tela").querySelectorAll(".view-enter").forEach((e) => e.classList.remove("view-enter")); window.scrollTo({ top: rolagem }); }
  if (estado.tela === "fluxo" && largo() && estado.vistaFluxo === "mapa") ligarCanvas();
  if (estado.tela === "simulador") { const c = $("#chat"); if (c) c.scrollTop = c.scrollHeight; }
}
// Atualiza só o que muda ao digitar no editor (mantém o foco no campo).
function desenharDuranteEdicao() {
  desenharTopo();
  const d = $('[data-acao="desfazer"]'); if (d) d.disabled = !estado.desfazer.length;
  const r = $('[data-acao="refazer"]'); if (r) r.disabled = !estado.refazer.length;
  if (estado.tela !== "fluxo") return;
  if (largo()) {
    const lateral = $("#painel-lateral"); const ativo = document.activeElement?.id;
    if (estado.vistaFluxo === "mapa") { const wrap = $(".canvas-wrap"); if (wrap) { const m = document.createElement("div"); m.innerHTML = telaFluxo({ largo: true }); wrap.innerHTML = m.querySelector(".canvas-wrap").innerHTML; ligarCanvas(); } }
    if (lateral && !lateral.contains(document.activeElement)) lateral.innerHTML = painelLateral(problemas());
    else if (lateral) $("#avisos-do-passo").innerHTML = avisosDoPasso(problemas().filter((p) => p.path === estado.selecionado));
    if (ativo) document.getElementById(ativo)?.focus?.();
  }
}

function irPara(tela) {
  if (!TELAS.some((t) => t.id === tela)) return;
  rolagens[estado.tela] = window.scrollY;
  fecharFolha({ devolverFoco: false });
  estado.tela = tela;
  if (location.hash !== "#" + tela) history.replaceState(null, "", "#" + tela);
  desenhar({ animar: true });
  window.scrollTo({ top: rolagens[tela] ?? 0 });
  if (tela === "versoes" && estado.revisoes === null) carregarRevisoes();
  lembrarPosicao(rolagens);
}

/* ───────────────────────── Folhas (gaveta no computador, folha inferior no celular) ───────────────────────── */
function abrirFolha(folha) {
  if (!estado.folha) focoAnterior = document.activeElement;
  fecharContexto();
  estado.folha = folha;
  desenharFolha();
}
function conteudoDaFolha() {
  const f = estado.folha;
  if (f.tipo === "passo") return folhaDoPasso(f.id, ordemDosPassos());
  if (f.tipo === "agente") return detalheDoAgente(f.id);
  if (f.tipo === "tipos") return { cabeca: `<div class="drawer__heading"><span class="t-label">${f.depoisDe ? "Inserir depois de " + html(f.depoisDe) : "Novo passo"}</span><h2 class="drawer__title" id="tipos-titulo">Escolha o tipo</h2></div>`, corpo: seletorDeTipo() };
  if (f.tipo === "sim") return { cabeca: `<div class="drawer__heading"><span class="t-label">Simulador</span><h2 class="drawer__title" id="sim-titulo">Detalhes</h2></div>`, corpo: detalhesDaSimulacao() };
  if (f.tipo === "acoes") return { cabeca: `<div class="drawer__heading"><span class="t-label">Passo</span><h2 class="drawer__title" id="acoes-titulo">${html(f.id)}</h2></div>`, corpo: `<div class="sheet-menu" role="menu">${acoesDoPasso(f.id)}</div>` };
  if (f.tipo === "sinc") return folhaDeConflito();
  if (f.tipo === "demo") return sobreDemonstracao();
  return null;
}
function desenharFolha({ manterRolagem = false } = {}) {
  soltarFoco?.(); soltarFoco = null;
  const raiz = $("#painel");
  const c = estado.folha && conteudoDaFolha();
  document.body.classList.toggle("com-folha", !!c);
  if (!c) { estado.folha = null; raiz.innerHTML = ""; return; }
  const chave = estado.folha.tipo + (estado.folha.id ?? "");
  const mesma = raiz.querySelector(".drawer")?.dataset.chave === chave;
  const rolagem = raiz.querySelector(".drawer__body")?.scrollTop ?? 0;
  const titulo = c.cabeca.match(/id="([^"]+)"/)?.[1];
  raiz.innerHTML = `<div class="overlay" data-acao="fechar-folha"></div>
    <section class="drawer drawer--${estado.folha.tipo}" role="dialog" aria-modal="true" ${titulo ? `aria-labelledby="${titulo}"` : 'aria-label="Painel"'} data-chave="${html(chave)}">
      <span class="drawer__grab" aria-hidden="true"></span>
      <div class="drawer__head">${c.cabeca}<button type="button" class="btn btn--ghost btn--icon" data-acao="fechar-folha" aria-label="Fechar">${icone("fechar")}</button></div>
      <div class="drawer__body">${c.corpo}</div>
      ${c.rodape ? `<div class="drawer__foot">${c.rodape}</div>` : ""}
    </section>`;
  const gaveta = raiz.querySelector(".drawer");
  if (mesma || manterRolagem) { gaveta.style.animation = "none"; const o = raiz.querySelector(".overlay"); o.style.animation = "none"; o.style.opacity = "1"; gaveta.querySelector(".drawer__body").scrollTop = rolagem; }
  soltarFoco = prenderFoco(gaveta);
  if (!largo()) ligarArrasteDaFolha(gaveta, () => fecharFolha());
  if (!mesma) (gaveta.querySelector(".drawer__body textarea, .drawer__body input:not([type=checkbox]), .type-card[data-criar], .sheet-menu .menu__item") ?? gaveta.querySelector('.drawer__head [data-acao="fechar-folha"]'))?.focus({ preventScroll: true });
}
function fecharFolha({ devolverFoco = true } = {}) {
  if (!estado.folha) return;
  const eraPasso = estado.folha.tipo === "passo";
  estado.folha = null; desenharFolha();
  if (eraPasso && !largo()) { estado.selecionado = null; marcarSelecao(); }
  if (devolverFoco && focoAnterior && document.contains(focoAnterior)) focoAnterior.focus({ preventScroll: true });
}

/* Menu de contexto (botão direito no canvas) */
function abrirContexto(id, x, y) {
  const raiz = $("#contexto");
  raiz.innerHTML = `<div class="menu menu--context" role="menu" aria-label="Ações do passo ${html(id)}" style="left:${Math.min(x, innerWidth - 240)}px;top:${Math.min(y, innerHeight - 220)}px">${acoesDoPasso(id)}</div>`;
  raiz.querySelector(".menu__item")?.focus();
}
function fecharContexto() { const r = $("#contexto"); if (r?.innerHTML) r.innerHTML = ""; }

/* ───────────────────────── Editor ───────────────────────── */
function ordemDosPassos() { return largo() ? organizarFluxo(estado.rascunho).ordem : arvoreDoFluxo(estado.rascunho).filter((i) => !i.referencia && !i.faltando).map((i) => i.id); }
function marcarSelecao() {
  document.querySelectorAll(".node[data-no], .tree__node").forEach((n) => {
    const sel = n.dataset.no === estado.selecionado;
    if (n.classList.contains("node")) n.setAttribute("aria-pressed", String(sel)); else if (sel) n.setAttribute("aria-current", "true"); else n.removeAttribute("aria-current");
  });
}
function selecionarPasso(id, { focar = true } = {}) {
  if (!noPorId(estado.rascunho, id)) return;
  if (estado.tela !== "fluxo") irPara("fluxo");
  estado.selecionado = id; estado.busca = "";
  if (largo()) {
    if (estado.folha) fecharFolha({ devolverFoco: false });
    desenhar(); centralizar(id, { aproximar: true });
    if (focar) $("#painel-lateral .side-panel__body textarea, #painel-lateral .side-panel__body input")?.focus({ preventScroll: true });
  } else { abrirFolha({ tipo: "passo", id }); marcarSelecao(); }
  lembrarPosicao(rolagens);
}
function aplicarMudanca(novo, descricao) {
  const { revisaoInvalidada } = mudarRascunho(novo, descricao);
  estado.relatorioAprovacao = null;
  if (revisaoInvalidada) aviso("O rascunho mudou depois da revisão. A aprovação não vale para a revisão nova.");
}
function redesenharEdicao() {
  if (estado.folha?.tipo === "passo") { if (!noPorId(estado.rascunho, estado.folha.id)) fecharFolha({ devolverFoco: false }); else desenharFolha({ manterRolagem: true }); }
  if (estado.selecionado && !noPorId(estado.rascunho, estado.selecionado)) estado.selecionado = null;
  desenhar();
}
function inserir(tipo, depoisDe) {
  const porta = depoisDe ? portasDoNo(noPorId(estado.rascunho, depoisDe))[0]?.nome : null;
  const { doc, id } = inserirPasso(estado.rascunho, { tipo, depoisDe, porta });
  aplicarMudanca(doc, `Passo ${id} criado${depoisDe ? " depois de " + depoisDe : ""}`);
  estado.folha = null; desenharFolha();
  aviso(`Passo “${id}” criado${depoisDe ? "" : " solto: ligue uma saída até ele"}.`, { tipo: "success", acao: { rotulo: "Desfazer", executar: () => { desfazerUltima(); estado.selecionado = null; desenhar(); } } });
  selecionarPasso(id);
  requestAnimationFrame(() => document.querySelector(`.node[data-no="${CSS.escape(id)}"], .tree__node[data-no="${CSS.escape(id)}"]`)?.classList.add("pulse-once"));
}
function excluir(id) {
  try {
    const { doc } = removerPasso(estado.rascunho, id);
    aplicarMudanca(doc, `Passo ${id} excluído`);
    estado.selecionado = null; fecharContexto();
    if (estado.folha) { estado.folha = null; desenharFolha(); }
    desenhar();
    aviso(`Passo “${id}” excluído.`, { acao: { rotulo: "Desfazer", executar: () => { desfazerUltima(); desenhar(); } }, duracao: 7000 });
  } catch (erro) { aviso(erro.message, { tipo: "danger" }); }
}
function editarCampo(alvo) {
  const id = estado.selecionado ?? estado.folha?.id; const no = noPorId(estado.rascunho, id); if (!no) return;
  const novo = atualizarConfig(estado.rascunho, id, (c) => {
    if (alvo.dataset.campo) c[alvo.dataset.campo] = alvo.value;
    if (alvo.dataset.campoNumero) c[alvo.dataset.campoNumero] = Number(alvo.value);
    if (alvo.dataset.opcao !== undefined) c.options[Number(alvo.dataset.opcao)].label = alvo.value;
  });
  // Digitação não empilha um "desfazer" por letra: só a primeira mudança de cada campo.
  const chave = id + ":" + (alvo.dataset.campo ?? alvo.dataset.campoNumero ?? "opcao" + alvo.dataset.opcao);
  if (editarCampo.ultima === chave) { estado.rascunho = novo; estado.sinc.alterar(novo); } else { aplicarMudanca(novo, `Passo ${id} editado`); editarCampo.ultima = chave; }
  const cont = alvo.dataset.opcao !== undefined ? $(`[data-contador-opcao="${alvo.dataset.opcao}"]`) : $(`[data-contador="${alvo.id}"]`);
  if (cont) cont.textContent = alvo.value.length + "/" + (alvo.dataset.opcao !== undefined ? LIMITES.rotuloDaOpcao : LIMITES.texto);
  const avisos = $("#avisos-do-passo"); if (avisos) avisos.innerHTML = avisosDoPasso(problemas().filter((p) => p.path === id));
  desenharDuranteEdicao();
}
function opcoes(acao, indice) {
  const id = estado.selecionado ?? estado.folha?.id;
  const novo = atualizarConfig(estado.rascunho, id, (c) => {
    if (acao === "adicionar") { const usados = new Set(c.options.map((o) => o.value)); let v = c.options.length + 1; while (usados.has(String(v))) v++; c.options.push({ value: String(v), label: "Opção " + v }); }
    else c.options.splice(indice, 1);
  });
  aplicarMudanca(novo, `Opções de ${id} ${acao === "adicionar" ? "ampliadas" : "reduzidas"}`); editarCampo.ultima = null;
  redesenharEdicao();
}
function navegarAviso(direcao) {
  const ids = [...new Set(problemas().map((p) => p.path))].filter((id) => noPorId(estado.rascunho, id));
  if (!ids.length) return;
  const i = ids.indexOf(estado.selecionado);
  selecionarPasso(ids[(i + direcao + ids.length) % ids.length], { focar: false });
}
function desfazerOuRefazer(refazer) {
  const ok = refazer ? refazerUltima() : desfazerUltima();
  if (!ok) return; editarCampo.ultima = null; redesenharEdicao(); aviso(refazer ? "Alteração refeita." : "Alteração desfeita.");
}

/* ───────────────────────── Sincronia e aprovação ───────────────────────── */
function aoMudarSincronia(s) {
  if (!estado.carregado) return;
  desenharTopo();
  if (estado.folha?.tipo === "sinc") desenharFolha({ manterRolagem: true });
  if (s.estado === "salvo") { atualizarAprovacao(); if (estado.revisoes !== null) carregarRevisoes(); if (estado.tela === "oficina") desenhar(); }
  if (s.estado === "conflito") registrarEvento(`Conflito: a r${s.conflito.revisaoAtual} chegou enquanto você editava`, "erro");
}
async function atualizarAprovacao() {
  const r = await estado.fonte.aprovacaoAtual(estado.fonte.flowId);
  const antes = estado.aprovacao;
  estado.aprovacao = r.ok ? r.dados : null;
  estado.aprovacoesConhecidas = await estado.fonte.aprovacoes?.() ?? [];
  if (antes && !estado.aprovacao) registrarEvento(`Aprovação da r${antes.revision} deixou de valer: o rascunho mudou`, "erro");
  desenharTopo(); if (["oficina", "versoes"].includes(estado.tela)) desenhar();
}
async function carregarRevisoes() {
  const r = await estado.fonte.historico(estado.fonte.flowId);
  estado.revisoes = r.ok ? r.dados : { erro: r };
  if (estado.tela === "versoes") desenhar();
}
async function aprovar() {
  estado.aprovando = true; estado.relatorioAprovacao = null; desenhar();
  const rev = revisaoAtual();
  const r = await estado.fonte.aprovar(estado.fonte.flowId, { revision: rev, confirmation: true, scenarios: estado.espaco.cenarios });
  estado.aprovando = false;
  if (r.ok) {
    estado.ultimaAprovada = rev; registrarEvento(`r${rev} aprovada (cenários independentes passaram)`, "ok");
    await atualizarAprovacao();
    aviso(`r${rev} aprovada. Aprovação não é publicação.`, { tipo: "success" });
  } else {
    estado.relatorioAprovacao = { mensagem: r.mensagem ?? "Não deu para aprovar.", reports: r.relatorios ?? r.corpo?.reports ?? null };
    registrarEvento(`Aprovação recusada: ${r.mensagem ?? r.codigo}`, "erro");
    if (r.estado === "conflito") estado.sinc.salvar();
  }
  desenhar();
}
function baixarJson(nome, dados) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function comparar(a, b) {
  const [x, y] = await Promise.all([estado.fonte.obterRascunho(estado.fonte.flowId, a), estado.fonte.obterRascunho(estado.fonte.flowId, b)]);
  if (!x.ok || !y.ok) { aviso("Não deu para carregar as duas revisões.", { tipo: "danger" }); return; }
  estado.comparar = { a, b, docA: x.dados.document, docB: y.dados.document, diff: compararVersoes(x.dados.document, y.dados.document) };
  desenhar(); $("#t-diff")?.scrollIntoView({ block: "start", behavior: reduzir() ? "auto" : "smooth" });
}

/* ───────────────────────── Simulador ───────────────────────── */
const docDoSimulador = () => estado.simVersao === "publicada" ? publicada() : estado.rascunho;
function enviar(texto, rotulo = texto) {
  if (!estado.conversa) estado.conversa = iniciarConversa({ firstName: estado.contato.trim() });
  estado.entradas.push({ tipo: "say", texto });
  estado.mensagens.push({ de: "cliente", texto: rotulo, hora: formatar.hora(new Date()) });
  receber(responder(docDoSimulador(), estado.conversa, texto));
}
function receber(saidas) {
  const hora = formatar.hora(new Date());
  const caminho = estado.conversa.caminho; const novos = caminho.slice(estado.caminhoVisto ?? 0); estado.caminhoVisto = caminho.length;
  saidas.forEach((m, i) => estado.mensagens.push({ de: m.tipo === "equipe" ? "equipe" : "bot", texto: m.texto, opcoes: m.opcoes, hora, etapas: i === 0 ? novos : null }));
  estado.comparacao = null;
  if (estado.conversa?.status === "failed") registrarEvento("Simulação parou: " + (estado.conversa.motivo ?? ""), "erro");
  desenhar();
  if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true });
  if (matchMedia("(pointer: fine)").matches) $("#mensagem")?.focus({ preventScroll: true });
}
function compararSimulacao() {
  const outraPublicada = estado.simVersao !== "publicada";
  const r = repetirConversa(outraPublicada ? publicada() : estado.rascunho, estado.entradas, { firstName: estado.contato.trim() });
  const aqui = estado.conversa; const ultimaAqui = [...estado.mensagens].reverse().find((m) => m.de !== "cliente")?.texto;
  estado.comparacao = { outra: outraPublicada ? "v1 publicada" : "versão rascunho", status: r.status, cursor: r.cursor, ultima: r.saidas.at(-1), aqui: ultimaAqui, igual: r.status === aqui.status && r.cursor === aqui.cursor && r.saidas.at(-1) === ultimaAqui };
  desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true });
}
function reiniciar() { reiniciarConversa(); estado.caminhoVisto = 0; }

/* ───────────────────────── Avaliação oficial (ponte offline do motor) ───────────────────────── */
function baixarEntrada() {
  const { entrada, erro } = montarEntradaDaPonte({ rascunho: estado.rascunho, base: publicada(), cenarios: estado.espaco.cenarios, perfil: estado.espaco.perfil });
  if (erro) { aviso(erro, { tipo: "danger" }); return; }
  baixarJson("entrada.json", entrada);
  registrarEvento("Entrada da avaliação oficial baixada");
}
async function importarSaida(arquivo) {
  if (arquivo.size > 2 * 1024 * 1024) { aviso("Arquivo grande demais para uma saída da ponte.", { tipo: "danger" }); return; }
  const r = lerSaidaDaPonte(await arquivo.text());
  if (!r.valido) { aviso("Não é uma saída da ponte do motor: " + r.motivo, { tipo: "danger", duracao: 7000 }); return; }
  estado.avaliacao = r;
  registrarEvento(r.ok ? (r.cenariosOk ? "Avaliação oficial: cenários passaram" : "Avaliação oficial: cenário falhou") : "Avaliação oficial: " + r.erro, r.ok && r.cenariosOk ? "ok" : "erro");
  desenhar();
  aviso(r.ok ? (r.cenariosOk ? "Resultado do motor importado: todos os cenários passaram." : "Resultado do motor importado: há cenários com falha.") : "O motor recusou o rascunho.", { tipo: r.ok && r.cenariosOk ? "success" : "danger" });
}

/* ───────────────────────── Eventos ───────────────────────── */
let toqueLongo = null; let ignorarClique = false;
function ligarEventos() {
  document.addEventListener("click", (evento) => {
    if (ignorarClique) { ignorarClique = false; evento.preventDefault(); return; }
    const alvo = evento.target.closest("button, a, [data-acao]");
    if (alvo?.matches('[aria-haspopup="menu"]')) { fecharMenus(alvo); alternarMenu(alvo); return; }
    if (!evento.target.closest(".menu")) { fecharMenus(); }
    if (!evento.target.closest(".menu--context")) fecharContexto();
    if (!evento.target.closest(".search-box")) fecharBusca();
    if (!alvo || alvo.disabled) return;
    if (alvo.closest(".canvas") && acabouDeArrastar()) return;
    if (alvo.dataset.tela) { irPara(alvo.dataset.tela); return; }
    if (alvo.dataset.zoom) { alvo.dataset.zoom === "fit" ? enquadrar() : zoom(alvo.dataset.zoom === "1" ? 1.2 : 1 / 1.2); return; }
    if (alvo.dataset.no) { fecharContexto(); if (estado.folha && estado.folha.tipo !== "passo") fecharFolha({ devolverFoco: false }); selecionarPasso(alvo.dataset.no); return; }
    if (alvo.dataset.agente) { abrirFolha({ tipo: "agente", id: alvo.dataset.agente }); return; }
    if (alvo.dataset.criar) { inserir(alvo.dataset.criar, estado.folha?.depoisDe ?? null); return; }
    if (alvo.dataset.vista) { estado.vistaFluxo = alvo.dataset.vista; lembrarPosicao(rolagens); desenhar(); return; }
    if (alvo.dataset.resposta) { enviar(alvo.dataset.resposta, alvo.dataset.rotulo); return; }
    if (alvo.dataset.dizer) { enviar(alvo.dataset.dizer); return; }
    if (alvo.dataset.simVersao) { estado.simVersao = alvo.dataset.simVersao; reiniciar(); lembrarPosicao(rolagens); desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true }); return; }
    if (alvo.dataset.oficina) { estado.oficinaAba = alvo.dataset.oficina; lembrarPosicao(rolagens); desenhar(); window.scrollTo({ top: 0 }); return; }
    if (alvo.dataset.comparar) { const [a, b] = alvo.dataset.comparar.split(":").map(Number); comparar(a, b); return; }
    if (alvo.dataset.ir) { fecharFolha({ devolverFoco: false }); irPara(alvo.dataset.ir); return; }
    const acao = alvo.dataset.acao; if (!acao) return;
    if (alvo.closest(".menu")) fecharMenus();
    const acoes = {
      tema: () => { aplicarTema(temaAtual() === "light" ? "dark" : "light"); atualizarRotuloTema(); },
      "fechar-folha": () => fecharFolha(),
      "sobre-demo": () => abrirFolha({ tipo: "demo" }),
      "novo-passo": () => abrirFolha({ tipo: "tipos", depoisDe: null }),
      "inserir-depois": () => abrirFolha({ tipo: "tipos", depoisDe: alvo.dataset.noAlvo }),
      "excluir-passo": () => excluir(alvo.dataset.noAlvo),
      "simular-daqui": () => { fecharContexto(); estado.simVersao = "rascunho"; reiniciar(); irPara("simulador"); },
      "adicionar-opcao": () => opcoes("adicionar"),
      "remover-opcao": () => opcoes("remover", Number(alvo.dataset.indice)),
      desselecionar: () => { estado.selecionado = null; desenhar(); },
      desfazer: () => desfazerOuRefazer(false),
      refazer: () => desfazerOuRefazer(true),
      "aviso-anterior": () => navegarAviso(-1), "aviso-seguinte": () => navegarAviso(1),
      "passo-anterior": () => navegarPasso(-1), "passo-seguinte": () => navegarPasso(1),
      "ver-avisos": () => navegarAviso(1),
      "ver-sincronia": () => abrirFolha({ tipo: "sinc" }),
      "tentar-de-novo": async () => { const s = estado.sinc.estado; if (!estado.carregado) { iniciar(); return; } s.estado = "nao-salvo"; desenharTopo(); await estado.sinc.tentarDeNovo(); },
      "conflito-minhas": async () => { fecharFolha({ devolverFoco: false }); const doc = await estado.sinc.resolver("minhas"); estado.rascunho = doc; registrarEvento("Conflito resolvido: suas alterações foram mantidas"); desenhar(); aviso("Suas alterações foram salvas por cima da revisão nova.", { tipo: "success" }); },
      "conflito-delas": async () => { fecharFolha({ devolverFoco: false }); const doc = await estado.sinc.resolver("delas"); estado.desfazer.push(estado.rascunho); estado.rascunho = doc; registrarEvento("Conflito resolvido: revisão nova adotada"); redesenharEdicao(); aviso("Agora você edita a revisão nova. Suas alterações podem ser recuperadas com Desfazer.", { acao: { rotulo: "Desfazer", executar: () => desfazerOuRefazer(false) }, duracao: 8000 }); },
      "baixar-local": () => { fecharMenus(); baixarJson("rascunho-local.json", estado.rascunho); },
      "exemplo-oficina": async () => { estado.resultado = await estado.fonte.resultadoDeExemplo(); registrarEvento("Proposta de exemplo aberta na oficina", "oficina"); if (!largo()) estado.oficinaAba = "proposta"; desenhar(); $("#resultado")?.scrollIntoView({ block: "start", behavior: reduzir() ? "auto" : "smooth" }); },
      "usar-proposta": () => { aplicarMudanca(structuredClone(estado.resultado.flow), "Proposta da oficina virou o rascunho"); estado.marcacao = "revisao"; if (!largo()) estado.oficinaAba = "revisao"; desenhar(); aviso("A proposta virou o rascunho. Simule antes de aprovar.", { tipo: "success" }); },
      "rodar-cenarios": () => { const { reports, scenariosPassed } = conferirCenarios(estado.rascunho, estado.espaco.cenarios); estado.execucaoLocal = { ok: scenariosPassed, reports, quando: new Date(), revisao: revisaoAtual() }; registrarEvento(`Cenários na prévia: ${reports.filter((r) => r.ok).length}/${reports.length} passaram`, scenariosPassed ? "ok" : "erro"); desenhar(); },
      aprovar: () => aprovar(),
      "pedir-correcao": () => { estado.marcacao = "correcao"; estado.checklist = { estrutura: false, lacunas: false, simulei: false }; registrarEvento("Correção pedida na revisão", "erro"); desenhar(); },
      silencio: () => receber(esgotarPrazo(docDoSimulador(), estado.conversa)),
      reiniciar: () => { reiniciar(); desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true }); },
      "detalhes-sim": () => abrirFolha({ tipo: "sim" }),
      "comparar-sim": () => compararSimulacao(),
      "baixar-entrada": () => baixarEntrada(),
      "carregar-revisoes": () => { estado.revisoes = null; desenhar(); carregarRevisoes(); },
      "limpar-comparacao": () => { estado.comparar = null; desenhar(); },
    };
    acoes[acao]?.();
  });
  // Botão direito no canvas abre o menu do passo.
  document.addEventListener("contextmenu", (e) => {
    const no = e.target.closest(".node[data-no]"); if (!no) return;
    e.preventDefault(); abrirContexto(no.dataset.no, e.clientX, e.clientY);
  });
  // Toque longo na árvore abre as ações do passo numa folha.
  document.addEventListener("pointerdown", (e) => {
    const no = e.target.closest(".tree__node[data-contexto]"); if (!no || e.pointerType === "mouse") return;
    const x = e.clientX; const y = e.clientY;
    toqueLongo = { timer: setTimeout(() => { toqueLongo = null; ignorarClique = true; navigator.vibrate?.(8); abrirFolha({ tipo: "acoes", id: no.dataset.contexto }); }, 480), x, y };
  });
  const cancelarToque = (e) => { if (toqueLongo && (e.type !== "pointermove" || Math.hypot(e.clientX - toqueLongo.x, e.clientY - toqueLongo.y) > 10)) { clearTimeout(toqueLongo.timer); toqueLongo = null; } };
  ["pointerup", "pointercancel", "pointermove"].forEach((t) => document.addEventListener(t, cancelarToque));

  document.addEventListener("input", (evento) => {
    const a = evento.target;
    if (a.dataset.campo || a.dataset.opcao !== undefined) editarCampo(a);
    else if (a.id === "busca-passo") atualizarBusca(a.value);
    else if (a.id === "briefing") { estado.briefing = a.value; $('[data-contador="briefing"]').textContent = a.value.length + "/6000"; }
    else if (a.dataset.fato !== undefined) { const f = estado.espaco.perfil.facts[Number(a.dataset.fato)]; f.example = f.type === "list" ? a.value.split(",").map((x) => x.trim()).filter(Boolean) : a.value; }
    else if (a.id === "contato") estado.contato = a.value;
  });
  document.addEventListener("change", (evento) => {
    const a = evento.target;
    if (a.dataset.campoNumero) { editarCampo(a); return; }
    if (a.dataset.ligar) {
      const id = estado.selecionado ?? estado.folha?.id;
      aplicarMudanca(ligar(estado.rascunho, id, a.dataset.ligar, a.value || null), `Saída “${nomeDaPorta(a.dataset.ligar)}” de ${id} ${a.value ? "ligada a " + a.value : "desligada"}`);
      editarCampo.ultima = null; redesenharEdicao(); return;
    }
    if (a.dataset.checar) { estado.checklist[a.dataset.checar] = a.checked; desenhar(); $(`[data-checar="${a.dataset.checar}"]`)?.focus(); return; }
    if (a.id === "mostrar-etapas") { estado.mostrarEtapas = a.checked; lembrarPosicao(rolagens); desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true }); return; }
    if (a.id === "contato") { reiniciar(); desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true }); return; }
    if (a.id === "saida-ponte" && a.files[0]) { importarSaida(a.files[0]); a.value = ""; }
  });
  document.addEventListener("submit", (evento) => {
    if (evento.target.id !== "composer") return;
    evento.preventDefault();
    const campo = $("#mensagem"); const texto = campo.value.trim(); if (!texto) return;
    campo.value = ""; enviar(texto);
  });
  document.addEventListener("keydown", (evento) => {
    const digitando = evento.target.closest("input, textarea, select, [contenteditable]");
    if (evento.key === "Escape") {
      if ($("#contexto")?.innerHTML) { fecharContexto(); return; }
      if (evento.target.id === "busca-passo" && estado.busca) { atualizarBusca(""); evento.target.value = ""; return; }
      const menu = document.querySelector('[aria-haspopup="menu"][aria-expanded="true"]');
      if (menu) { fecharMenus(); menu.focus(); return; }
      if (estado.folha) { fecharFolha(); return; }
      if (estado.selecionado && largo()) { const id = estado.selecionado; estado.selecionado = null; desenhar(); document.querySelector(`.node[data-no="${CSS.escape(id)}"]`)?.focus(); }
      return;
    }
    if (evento.target.id === "busca-passo") {
      const hits = [...document.querySelectorAll(".search-hit")];
      if (evento.key === "Enter" && hits[0]) { evento.preventDefault(); selecionarPasso(hits[0].dataset.no); }
      if (evento.key === "ArrowDown" && hits[0]) { evento.preventDefault(); hits[0].focus(); }
      return;
    }
    if (evento.target.classList?.contains("search-hit") && ["ArrowDown", "ArrowUp"].includes(evento.key)) {
      evento.preventDefault(); const hits = [...document.querySelectorAll(".search-hit")]; const i = hits.indexOf(evento.target);
      (evento.key === "ArrowDown" ? hits[i + 1] : hits[i - 1] ?? $("#busca-passo"))?.focus(); return;
    }
    if (digitando) return;
    if (evento.key === "/" && estado.tela === "fluxo") { evento.preventDefault(); $("#busca-passo")?.focus(); return; }
    const mod = evento.ctrlKey || evento.metaKey;
    if (mod && evento.key.toLowerCase() === "z" && estado.tela === "fluxo") { evento.preventDefault(); desfazerOuRefazer(evento.shiftKey); return; }
    if (mod && evento.key.toLowerCase() === "y" && estado.tela === "fluxo") { evento.preventDefault(); desfazerOuRefazer(true); return; }
    if ((evento.key === "Delete" || evento.key === "Backspace") && estado.tela === "fluxo" && estado.selecionado && largo() && evento.target.closest(".canvas")) { evento.preventDefault(); excluir(estado.selecionado); }
  });
  window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (t !== estado.tela) irPara(t); });
  window.addEventListener("beforeunload", (e) => { const s = estado.sinc?.estado.estado; if (s && s !== "salvo") { e.preventDefault(); e.returnValue = ""; } });
  let espera = null;
  window.addEventListener("scroll", () => { clearTimeout(espera); espera = setTimeout(() => { rolagens[estado.tela] = window.scrollY; lembrarPosicao(rolagens); }, 200); }, { passive: true });
  let eraLargo = largo();
  matchMedia("(min-width: 1024px)").addEventListener("change", () => { if (largo() !== eraLargo) { eraLargo = largo(); fecharFolha({ devolverFoco: false }); reiniciarVista(); desenhar(); } });
  // Teclado virtual aberto: esconde a barra inferior para a conversa e os campos ganharem espaço.
  observarTeclado();
}
function atualizarBusca(valor) {
  estado.busca = valor;
  if (largo()) { const lista = $("#busca-resultados"); if (lista) { lista.innerHTML = resultadosDaBusca(); lista.hidden = !valor.trim(); $(".search-box")?.setAttribute("aria-expanded", String(!!valor.trim())); } }
  else { const pos = $("#busca-passo").selectionStart; desenhar(); const c = $("#busca-passo"); c.focus(); c.setSelectionRange(pos, pos); }
}
function fecharBusca() { const lista = $("#busca-resultados"); if (lista && largo() && !lista.hidden) lista.hidden = true; }
function navegarPasso(direcao) {
  const ordem = ordemDosPassos(); const i = ordem.indexOf(estado.folha.id); const id = ordem[i + direcao]; if (!id) return;
  estado.folha = { tipo: "passo", id }; estado.selecionado = id; desenharFolha(); marcarSelecao();
  document.querySelector(`.tree__node[data-no="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
}

/* ───────────────────────── Início ───────────────────────── */
async function iniciar() {
  $("#tela").innerHTML = `<div class="studio-loading">${blocoDeEstado({ estado: "carregando", titulo: "Abrindo o rascunho", texto: "Buscando a revisão mais recente." })}</div>`;
  estado.fonte ??= criarFonteDeDemonstracao({ roteiro: roteiroDaUrl() });
  if (!estado.espaco) estado.espaco = await estado.fonte.carregarEspaco();
  estado.sinc ??= criarSincronia({ fonte: estado.fonte, flowId: estado.fonte.flowId, aoMudar: aoMudarSincronia });
  const doc = await estado.sinc.carregar();
  if (!doc) {
    $("#faixas").innerHTML = faixas();
    $("#tela").innerHTML = `<div class="studio-loading">${blocoDeEstado({ estado: "indisponivel", titulo: "Não deu para abrir o rascunho", texto: estado.sinc.estado.erro?.mensagem ?? "O servidor não respondeu.", acao: '<button type="button" class="btn btn--secondary btn--sm" data-acao="tentar-de-novo">Tentar de novo</button>' })}</div>`;
    return;
  }
  estado.rascunho = doc;
  estado.briefing = estado.espaco.briefing;
  const pos = lerPosicao();
  if (pos) { Object.assign(rolagens, pos.rolagens ?? {}); estado.vistaFluxo = pos.vistaFluxo ?? "mapa"; estado.simVersao = pos.simVersao ?? "rascunho"; estado.mostrarEtapas = !!pos.mostrarEtapas; estado.oficinaAba = pos.oficinaAba ?? "pedido"; if (pos.selecionado && noPorId(doc, pos.selecionado)) estado.selecionado = largo() ? pos.selecionado : null; }
  const t = location.hash.slice(1); estado.tela = TELAS.some((x) => x.id === t) ? t : "agentes";
  estado.carregado = true;
  desenhar();
  window.scrollTo({ top: rolagens[estado.tela] ?? 0 });
  atualizarAprovacao();
  if (estado.tela === "versoes") carregarRevisoes();
}
aplicarTema(temaAtual());
montar();
ligarEventos();
iniciar();
