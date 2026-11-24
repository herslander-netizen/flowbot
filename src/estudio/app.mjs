// Bot Studio — entrada da interface. Liga shell, estado, telas e eventos.
// Tudo o que é demonstração vem da fonte (dados.mjs); nada aqui conecta ao motor ou ao WhatsApp.
import { criarFonteDeDemonstracao, montarEntradaDaPonte, lerSaidaDaPonte } from "./dados.mjs";
import { estado, TELAS, problemas, alterado, comoRascunho, mudarRascunho, desfazerUltima, registrarEvento, reiniciarConversa, publicada } from "./estado.mjs";
import { iniciarConversa, responder, esgotarPrazo, noPorId, organizarFluxo } from "./fluxo.mjs";
import { inserirPasso, removerPasso, ligar, atualizarConfig, arvoreDoFluxo, repetirConversa } from "./edicao.mjs";
import { LIMITES, portasDoNo, nomeDaPorta } from "./catalogo.mjs";
import { cabecalho, telaAgentes, telaFluxo, telaOficina, telaSimulador, telaVersoes, detalheDoAgente, folhaDoPasso, detalhesDaSimulacao, sobreDemonstracao, painelLateral, nomeDoStatus } from "./telas.mjs";
import { ligarCanvas, enquadrar, zoom, centralizar, acabouDeArrastar, reiniciarVista } from "./canvas.mjs";
import { avisosDoPasso, seletorDeTipo } from "./inspetor.mjs";
import { montarShell, atualizarRotuloTema } from "../ui/shell.mjs";
import { icone } from "../ui/icones.mjs";
import { html, formatar, aviso, prenderFoco, temaAtual, aplicarTema, alternarMenu, fecharMenus, blocoDeEstado } from "../ui/componentes.mjs";

const $ = (s, r = document) => r.querySelector(s);
const largo = () => matchMedia("(min-width: 1024px)").matches;
const reduzir = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let soltarFoco = null; let focoAnterior = null;

/* ───────────────────────── Estrutura ───────────────────────── */
function montar() {
  document.body.innerHTML = montarShell({
    ativo: "estudio", raiz: "../",
    nota: "Prévia visual. Nada é salvo no motor nem enviado no WhatsApp.",
    acoes: [{ acao: "sobre-demo", icone: "info", rotulo: "O que é real nesta prévia" }],
    conteudo: `<main class="main main--studio" id="conteudo" tabindex="-1">
      <div class="page page--studio">
        <div id="cabecalho"></div>
        <nav class="tabs" aria-label="Telas do Bot Studio">${TELAS.map((t) => `<button type="button" class="tabs__item" data-tela="${t.id}">${icone(t.icone)}${t.nome}</button>`).join("")}</nav>
        <div id="tela"></div>
      </div>
    </main>`,
    inferior: `<nav class="bottomnav" aria-label="Telas do Bot Studio">${TELAS.map((t) => `<button type="button" class="bottomnav__item" data-tela="${t.id}">${icone(t.icone)}${t.curto}</button>`).join("")}</nav>
      <div id="painel"></div>`,
  });
}

function desenhar({ animar = false } = {}) {
  document.querySelectorAll("[data-tela]").forEach((b) => { if (b.dataset.tela === estado.tela) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  $("#conteudo").dataset.tela = estado.tela;
  $("#cabecalho").innerHTML = cabecalho();
  const telas = { agentes: telaAgentes, fluxo: telaFluxo, oficina: telaOficina, simulador: telaSimulador, versoes: telaVersoes };
  const rolagem = window.scrollY;
  $("#tela").innerHTML = telas[estado.tela]({ largo: largo() });
  if (!animar) $("#tela").querySelectorAll(".view-enter").forEach((e) => e.classList.remove("view-enter"));
  else window.scrollTo({ top: 0 });
  if (!animar) window.scrollTo({ top: rolagem });
  if (estado.tela === "fluxo" && largo() && estado.vistaFluxo === "mapa") ligarCanvas();
  if (estado.tela === "simulador") { const c = $("#chat"); if (c) c.scrollTop = c.scrollHeight; }
}
// Atualiza só o que muda ao digitar no editor (mantém o foco no campo).
function desenharDuranteEdicao() {
  $("#cabecalho").innerHTML = cabecalho();
  if (estado.tela !== "fluxo") return;
  if (largo()) {
    const lateral = $("#painel-lateral");
    const ativo = document.activeElement?.id;
    if (estado.vistaFluxo === "mapa") { const tela = $("#canvas"); const resto = tela?.parentElement; if (resto) { const m = document.createElement("div"); m.innerHTML = telaFluxo({ largo: true }); resto.innerHTML = m.querySelector(".canvas-wrap").innerHTML; ligarCanvas(); } }
    if (lateral && !lateral.contains(document.activeElement)) lateral.innerHTML = painelLateral(problemas());
    else if (lateral) $("#avisos-do-passo").innerHTML = avisosDoPasso(problemas().filter((p) => p.path === estado.selecionado));
    if (ativo) document.getElementById(ativo)?.focus?.();
  }
}

function irPara(tela) {
  if (!TELAS.some((t) => t.id === tela)) return;
  fecharFolha({ devolverFoco: false });
  estado.tela = tela;
  if (location.hash !== "#" + tela) history.replaceState(null, "", "#" + tela);
  desenhar({ animar: true });
}

/* ───────────────────────── Folhas (gaveta no computador, folha inferior no celular) ───────────────────────── */
function abrirFolha(folha) {
  if (!estado.folha) focoAnterior = document.activeElement;
  estado.folha = folha;
  desenharFolha();
}
function conteudoDaFolha() {
  const f = estado.folha;
  if (f.tipo === "passo") return folhaDoPasso(f.id, ordemDosPassos());
  if (f.tipo === "agente") return detalheDoAgente(f.id);
  if (f.tipo === "tipos") return { cabeca: `<div class="drawer__heading"><span class="t-label">${f.depoisDe ? "Inserir depois de " + html(f.depoisDe) : "Novo passo"}</span><h2 class="drawer__title" id="tipos-titulo">Escolha o tipo</h2></div>`, corpo: seletorDeTipo() };
  if (f.tipo === "sim") return { cabeca: `<div class="drawer__heading"><span class="t-label">Simulador</span><h2 class="drawer__title" id="sim-titulo">Detalhes</h2></div>`, corpo: detalhesDaSimulacao() };
  if (f.tipo === "demo") return sobreDemonstracao();
  return null;
}
function desenharFolha({ manterRolagem = false } = {}) {
  soltarFoco?.(); soltarFoco = null;
  const raiz = $("#painel");
  const c = estado.folha && conteudoDaFolha();
  document.body.style.overflow = c ? "hidden" : "";
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
  if (!mesma) (gaveta.querySelector(".drawer__body textarea, .drawer__body input:not([type=checkbox]), .type-card[data-criar]") ?? gaveta.querySelector('.drawer__head [data-acao="fechar-folha"]'))?.focus({ preventScroll: true });
}
function fecharFolha({ devolverFoco = true } = {}) {
  if (!estado.folha) return;
  const eraPasso = estado.folha.tipo === "passo";
  estado.folha = null; desenharFolha();
  if (eraPasso && !largo()) { estado.selecionado = null; marcarSelecao(); }
  if (devolverFoco && focoAnterior && document.contains(focoAnterior)) focoAnterior.focus({ preventScroll: true });
}

/* ───────────────────────── Editor ───────────────────────── */
function ordemDosPassos() { return largo() ? organizarFluxo(estado.rascunho).ordem : arvoreDoFluxo(estado.rascunho).filter((i) => !i.referencia && !i.faltando).map((i) => i.id); }
function marcarSelecao() {
  document.querySelectorAll(".node[data-no], .tree__node").forEach((n) => {
    const sel = n.dataset.no === estado.selecionado;
    if (n.classList.contains("node")) n.setAttribute("aria-pressed", String(sel)); else if (sel) n.setAttribute("aria-current", "true"); else n.removeAttribute("aria-current");
  });
}
function selecionarPasso(id) {
  if (!noPorId(estado.rascunho, id)) return;
  if (estado.tela !== "fluxo") irPara("fluxo");
  estado.selecionado = id;
  if (largo()) {
    if (estado.folha) fecharFolha({ devolverFoco: false });
    desenhar(); centralizar(id);
    $("#painel-lateral .side-panel__body textarea, #painel-lateral .side-panel__body input")?.focus({ preventScroll: true });
  } else { abrirFolha({ tipo: "passo", id }); marcarSelecao(); }
}
function aplicarMudanca(novo, descricao, { desfazivel = true } = {}) {
  const { revisaoInvalidada } = mudarRascunho(novo, descricao);
  if (revisaoInvalidada) aviso("O rascunho mudou depois da revisão. A aprovação foi desfeita.");
  if (desfazivel) return;
}
function redesenharEdicao() {
  if (estado.folha?.tipo === "passo") { if (!noPorId(estado.rascunho, estado.folha.id)) fecharFolha({ devolverFoco: false }); else desenharFolha({ manterRolagem: true }); }
  desenhar();
}
function inserir(tipo, depoisDe) {
  const porta = depoisDe ? portasDoNo(noPorId(estado.rascunho, depoisDe))[0]?.nome : null;
  const { doc, id } = inserirPasso(estado.rascunho, { tipo, depoisDe, porta });
  aplicarMudanca(doc, `Passo ${id} criado${depoisDe ? " depois de " + depoisDe : ""}`);
  estado.folha = null; desenharFolha();
  aviso(`Passo “${id}” criado${depoisDe ? "" : " solto: ligue uma saída até ele"}.`, { tipo: "success", acao: { rotulo: "Desfazer", executar: () => { desfazerUltima(); estado.selecionado = null; desenhar(); } } });
  selecionarPasso(id);
  setTimeout(() => document.querySelector(`.node[data-no="${CSS.escape(id)}"], .tree__node[data-no="${CSS.escape(id)}"]`)?.classList.add("pulse-once"), 50);
}
function excluir(id) {
  try {
    const { doc } = removerPasso(estado.rascunho, id);
    aplicarMudanca(doc, `Passo ${id} excluído`);
    estado.selecionado = null;
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
  if (editarCampo.ultima === chave) { estado.rascunho = novo; } else { aplicarMudanca(novo, `Passo ${id} editado`); editarCampo.ultima = chave; }
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
  for (const m of saidas) estado.mensagens.push({ de: "bot", texto: m.texto, opcoes: m.opcoes, hora });
  estado.comparacao = null;
  if (estado.conversa?.status === "failed") registrarEvento("Simulação parou: " + (estado.conversa.motivo ?? ""), "erro");
  desenhar();
  if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true });
  if (matchMedia("(pointer: fine)").matches) $("#mensagem")?.focus({ preventScroll: true });
}
function compararSimulacao() {
  const outraPublicada = estado.simVersao !== "publicada";
  const outra = outraPublicada ? publicada() : estado.rascunho;
  const r = repetirConversa(outra, estado.entradas, { firstName: estado.contato.trim() });
  const aqui = estado.conversa;
  const ultimaAqui = [...estado.mensagens].reverse().find((m) => m.de === "bot")?.texto;
  estado.comparacao = { outra: outraPublicada ? "v1 publicada" : "versão rascunho", status: r.status, cursor: r.cursor, ultima: r.saidas.at(-1), igual: r.status === aqui.status && r.cursor === aqui.cursor && r.saidas.at(-1) === ultimaAqui };
  desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true });
}

/* ───────────────────────── Avaliação oficial (ponte offline do motor) ───────────────────────── */
function baixarEntrada() {
  const { entrada, erro } = montarEntradaDaPonte({ rascunho: estado.rascunho, base: publicada(), cenarios: estado.espaco.cenarios, perfil: estado.espaco.perfil });
  if (erro) { aviso(erro, { tipo: "danger" }); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(entrada, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "entrada.json" });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
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
function ligarEventos() {
  document.addEventListener("click", (evento) => {
    const alvo = evento.target.closest("button, a, [data-acao]");
    if (alvo?.matches('[aria-haspopup="menu"]')) { fecharMenus(alvo); alternarMenu(alvo); return; }
    if (!evento.target.closest(".menu")) fecharMenus();
    if (!alvo || alvo.disabled) return;
    if (alvo.closest(".canvas") && acabouDeArrastar()) return;
    if (alvo.dataset.tela) { irPara(alvo.dataset.tela); return; }
    if (alvo.dataset.zoom) { alvo.dataset.zoom === "fit" ? enquadrar() : zoom(alvo.dataset.zoom === "1" ? 1.2 : 1 / 1.2); return; }
    if (alvo.dataset.no !== undefined && alvo.dataset.no) { if (estado.folha && estado.folha.tipo !== "passo") fecharFolha({ devolverFoco: false }); selecionarPasso(alvo.dataset.no); return; }
    if (alvo.dataset.agente) { abrirFolha({ tipo: "agente", id: alvo.dataset.agente }); return; }
    if (alvo.dataset.criar) { inserir(alvo.dataset.criar, estado.folha?.depoisDe ?? null); return; }
    if (alvo.dataset.vista) { estado.vistaFluxo = alvo.dataset.vista; desenhar(); return; }
    if (alvo.dataset.resposta) { enviar(alvo.dataset.resposta, alvo.dataset.rotulo); return; }
    if (alvo.dataset.dizer) { enviar(alvo.dataset.dizer); return; }
    if (alvo.dataset.simVersao) { estado.simVersao = alvo.dataset.simVersao; reiniciarConversa(); estado.comparacao = null; desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true }); return; }
    if (alvo.dataset.ir) { fecharFolha({ devolverFoco: false }); irPara(alvo.dataset.ir); return; }
    const acao = alvo.dataset.acao; if (!acao) return;
    const acoes = {
      tema: () => { aplicarTema(temaAtual() === "light" ? "dark" : "light"); atualizarRotuloTema(); },
      "fechar-folha": () => fecharFolha(),
      "sobre-demo": () => abrirFolha({ tipo: "demo" }),
      "novo-passo": () => abrirFolha({ tipo: "tipos", depoisDe: null }),
      "inserir-depois": () => abrirFolha({ tipo: "tipos", depoisDe: alvo.dataset.noAlvo }),
      "excluir-passo": () => excluir(alvo.dataset.noAlvo),
      "adicionar-opcao": () => opcoes("adicionar"),
      "remover-opcao": () => opcoes("remover", Number(alvo.dataset.indice)),
      desselecionar: () => { estado.selecionado = null; desenhar(); },
      desfazer: () => { if (desfazerUltima()) { editarCampo.ultima = null; redesenharEdicao(); aviso("Alteração desfeita."); } },
      "passo-anterior": () => navegarPasso(-1), "passo-seguinte": () => navegarPasso(1),
      "ver-avisos": () => { const p = problemas()[0]; if (p && noPorId(estado.rascunho, p.path)) selecionarPasso(p.path); },
      "exemplo-oficina": async () => { estado.resultado = await estado.fonte.resultadoDeExemplo(); registrarEvento("Proposta de exemplo aberta na oficina", "oficina"); desenhar(); $("#resultado")?.scrollIntoView({ block: "start", behavior: reduzir() ? "auto" : "smooth" }); },
      "usar-proposta": () => { mudarRascunho(structuredClone(estado.resultado.flow), "Proposta da oficina virou o rascunho"); estado.revisao = estado.resultado.status === "ready_for_review" ? "revisao" : "correcao"; desenhar(); aviso("A proposta virou o rascunho. Simule antes de aprovar.", { tipo: "success" }); },
      aprovar: () => { estado.revisao = "aprovado"; registrarEvento("Aprovado nesta tela (não gravado)", "ok"); desenhar(); aviso("Aprovado só nesta tela. Nada foi publicado.", { tipo: "success" }); },
      "pedir-correcao": () => { estado.revisao = "correcao"; estado.checklist = { estrutura: false, lacunas: false, simulei: false }; registrarEvento("Correção pedida na revisão", "erro"); desenhar(); },
      "desfazer-aprovacao": () => { estado.revisao = "revisao"; registrarEvento("Aprovação desfeita"); desenhar(); },
      silencio: () => receber(esgotarPrazo(docDoSimulador(), estado.conversa)),
      reiniciar: () => { reiniciarConversa(); estado.comparacao = null; desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true }); },
      "detalhes-sim": () => abrirFolha({ tipo: "sim" }),
      "comparar-sim": () => compararSimulacao(),
      "baixar-entrada": () => baixarEntrada(),
    };
    if (alvo.closest(".menu")) fecharMenus();
    acoes[acao]?.();
  });
  document.addEventListener("input", (evento) => {
    const a = evento.target;
    if (a.dataset.campo || a.dataset.opcao !== undefined) editarCampo(a);
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
    if (a.id === "contato") { reiniciarConversa(); desenhar(); if (estado.folha?.tipo === "sim") desenharFolha({ manterRolagem: true }); return; }
    if (a.id === "saida-ponte" && a.files[0]) { importarSaida(a.files[0]); a.value = ""; }
  });
  document.addEventListener("submit", (evento) => {
    if (evento.target.id !== "composer") return;
    evento.preventDefault();
    const campo = $("#mensagem"); const texto = campo.value.trim(); if (!texto) return;
    campo.value = ""; enviar(texto);
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      const menu = document.querySelector('[aria-haspopup="menu"][aria-expanded="true"]');
      if (menu) { fecharMenus(); menu.focus(); return; }
      if (estado.folha) { fecharFolha(); return; }
      if (estado.selecionado && largo()) { const id = estado.selecionado; estado.selecionado = null; desenhar(); document.querySelector(`.node[data-no="${CSS.escape(id)}"]`)?.focus(); }
    }
    if ((evento.ctrlKey || evento.metaKey) && evento.key === "z" && !evento.target.closest("input, textarea") && estado.tela === "fluxo") { evento.preventDefault(); if (desfazerUltima()) { redesenharEdicao(); aviso("Alteração desfeita."); } }
  });
  window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (t !== estado.tela) irPara(t); });
  window.addEventListener("beforeunload", (e) => { if (alterado()) { e.preventDefault(); e.returnValue = ""; } });
  let eraLargo = largo();
  matchMedia("(min-width: 1024px)").addEventListener("change", () => { if (largo() !== eraLargo) { eraLargo = largo(); fecharFolha({ devolverFoco: false }); reiniciarVista(); desenhar(); } });
}
function navegarPasso(direcao) {
  const ordem = ordemDosPassos(); const i = ordem.indexOf(estado.folha.id); const id = ordem[i + direcao]; if (!id) return;
  estado.folha = { tipo: "passo", id }; estado.selecionado = id; desenharFolha(); marcarSelecao();
  document.querySelector(`.tree__node[data-no="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
}

/* ───────────────────────── Início ───────────────────────── */
async function iniciar() {
  aplicarTema(temaAtual());
  montar();
  $("#tela").innerHTML = `<div class="studio-loading">${blocoDeEstado({ estado: "carregando", titulo: "Carregando o espaço", texto: "Lendo os dados de demonstração." })}</div>`;
  ligarEventos();
  estado.fonte = criarFonteDeDemonstracao();
  try {
    estado.espaco = await estado.fonte.carregarEspaco();
  } catch {
    $("#tela").innerHTML = blocoDeEstado({ estado: "indisponivel", titulo: "Não deu para abrir o Bot Studio", texto: "A fonte de dados não respondeu. Recarregue a página." });
    return;
  }
  estado.rascunho = comoRascunho(estado.espaco.publicada);
  estado.briefing = estado.espaco.briefing;
  estado.vistaFluxo = "mapa";
  const t = location.hash.slice(1); estado.tela = TELAS.some((x) => x.id === t) ? t : "agentes";
  estado.carregado = true;
  desenhar();
}
iniciar();

export { nomeDoStatus };
