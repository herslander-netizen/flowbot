// Testes de navegador do Bot Studio (prévia). Servidor ligado (npm run dev) e Playwright instalado fora do projeto.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = new URL("estudio/", process.env.FLOWBOT_URL ?? "http://127.0.0.1:4173/").href;
const fixture = (n) => fileURLToPath(new URL("../fixtures/" + n, import.meta.url));
const resultados = []; const erros = [];
async function caso(nome, fn) {
  try { await fn(); resultados.push(["ok", nome]); }
  catch (erro) { resultados.push(["FALHOU", nome + " — " + erro.message.split("\n").slice(0, 6).join(" | ")]); }
}
const navegador = await chromium.launch();
async function pagina(largura, hash = "", altura = 900) {
  const movel = largura < 768;
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, acceptDownloads: true, ...(movel ? { isMobile: true, hasTouch: true } : {}) });
  const p = await contexto.newPage();
  p.on("pageerror", (e) => erros.push(largura + "px: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") erros.push(largura + "px console: " + m.text()); });
  await p.goto(BASE + hash, { waitUntil: "networkidle" });
  await p.waitForSelector("#cabecalho .studio-head");
  return p;
}
const ALVOS = ".bottomnav__item, .btn, .reply-btn, .tree__node, .agent-card, .chain__btn, .fab, .chip, .action-row, .demo-flag, .bot-row, .topbar__module";

for (const largura of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
  await caso(`${largura}px: cinco telas sem rolagem horizontal${largura < 768 ? " e alvos de 44px" : ""}`, async () => {
    const p = await pagina(largura, "", largura < 768 ? 720 : 900);
    for (const tela of ["agentes", "fluxo", "oficina", "simulador", "versoes"]) {
      await p.click(`${largura < 768 ? ".bottomnav__item" : ".tabs__item"}[data-tela="${tela}"]`);
      await p.waitForTimeout(120);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(sw <= largura, `scrollWidth ${sw} em ${tela}`);
      if (largura < 768) {
        const pequenos = await p.$$eval(ALVOS, (els) => els.filter((e) => e.offsetParent && !e.closest("[hidden]") && e.offsetHeight < 44).map((e) => e.className + ": " + e.textContent.trim().slice(0, 20)));
        assert.deepEqual(pequenos, [], "alvos pequenos em " + tela);
      }
    }
    await p.context().close();
  });
}

await caso("demonstração identificada e nenhum agente aparece ativo", async () => {
  const p = await pagina(1280);
  assert.ok(await p.isVisible(".demo-flag >> text=Demonstração"));
  assert.equal(await p.locator('.op-state[data-estado="conectado"]').count(), 0, "nada conectado na tela de agentes");
  await p.click('.agent-card[data-agente="qualificador"]');
  await p.waitForSelector(".drawer >> text=Sem execuções registradas");
  assert.ok(await p.isVisible(".drawer >> text=Ferramentas"));
  await p.click('.drawer .dep-chip[data-agente="recepcionista"]');
  assert.equal(await p.textContent("#agente-titulo"), "Recepcionista", "navega pelas dependências");
  await p.keyboard.press("Escape");
  await p.click('.chain__btn[data-agente="arquiteto"]');
  assert.ok(await p.isVisible(".drawer >> text=Desligado"));
  await p.keyboard.press("Escape");
  await p.click('.demo-flag');
  assert.ok(await p.isVisible(".drawer >> text=O que é real aqui"));
  await p.keyboard.press("Escape");
  await p.context().close();
});

await caso("canvas: zoom, enquadrar, seleção e painel lateral", async () => {
  const p = await pagina(1440, "#fluxo");
  await p.waitForSelector(".canvas .node");
  assert.equal(await p.locator(".canvas .node").count(), 12);
  const z0 = await p.textContent("#zoom-valor");
  await p.click('[data-zoom="1"]');
  assert.notEqual(await p.textContent("#zoom-valor"), z0);
  await p.click('[data-zoom="fit"]');
  const palco = await p.$eval("#palco", (e) => e.getBoundingClientRect()); const tela = await p.$eval("#canvas", (e) => e.getBoundingClientRect());
  assert.ok(palco.width <= tela.width + 1 && palco.height <= tela.height + 1, "enquadrar mostra o fluxo inteiro");
  // panorâmica com arrasto no fundo
  const antes = await p.$eval("#palco", (e) => e.style.transform);
  await p.mouse.move(tela.x + 20, tela.y + tela.height - 20); await p.mouse.down(); await p.mouse.move(tela.x + 140, tela.y + tela.height - 60, { steps: 5 }); await p.mouse.up();
  assert.notEqual(await p.$eval("#palco", (e) => e.style.transform), antes, "arrastar move o palco");
  await p.click('.canvas .node[data-no="menu"]', { force: true });
  await p.waitForSelector('#painel-lateral >> text=Opções');
  assert.equal(await p.getAttribute('.canvas .node[data-no="menu"]', "aria-pressed"), "true");
  assert.ok(await p.locator(".edge--active").count() >= 2, "ligações do passo destacadas");
  await p.context().close();
});

await caso("editor: criar, ligar, editar com limite, excluir e desfazer", async () => {
  const p = await pagina(1440, "#fluxo");
  await p.click('[data-acao="novo-passo"]:visible');
  await p.waitForSelector(".type-card[data-criar]");
  assert.ok(await p.isVisible(".type-card--off >> text=Webhook"), "webhook indisponível com motivo");
  await p.click('.type-card[data-criar="message.text"]');
  await p.waitForSelector('.canvas .node[data-no="texto"]');
  assert.ok(await p.isVisible("text=1 aviso(s)") || await p.isVisible("text=aviso(s)"), "passo solto vira aviso");
  assert.ok(await p.isVisible(".studio-head >> text=Alterações não salvas"));
  // ligar: a saída "depois" do texto vai para fim e alguém chega nele
  await p.selectOption('#painel-lateral [data-ligar="next"]', "fim");
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="agendar"]', { force: true });
  await p.selectOption('#painel-lateral [data-ligar="next"]', "texto");
  await p.waitForSelector(".op-state >> text=Estrutura ok");
  await p.click('.canvas .node[data-no="texto"]', { force: true });
  await p.fill("#campo-texto", "");
  assert.ok(await p.isVisible("#avisos-do-passo >> text=O texto está vazio."));
  await p.fill("#campo-texto", "Até já!");
  assert.equal(await p.textContent('[data-contador="campo-texto"]'), "7/4096");
  await p.click('#painel-lateral [data-acao="excluir-passo"]');
  await p.waitForSelector('.canvas .node[data-no="texto"]', { state: "detached" });
  await p.click(".toast__action");
  await p.waitForSelector('.canvas .node[data-no="texto"]');
  assert.equal(await p.locator('.canvas .node[data-no="inicio"]').count(), 1);
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="inicio"]', { force: true });
  assert.ok(await p.isVisible("#painel-lateral >> text=A entrada do fluxo não pode ser excluída."));
  await p.context().close();
});

await caso("celular: árvore, folha com anterior/próximo e passo novo pelo botão do polegar", async () => {
  const p = await pagina(390, "#fluxo", 844);
  assert.ok(await p.locator(".tree__item--ref >> text=vai para").count() >= 1, "retornos aparecem como referência");
  assert.ok(await p.isVisible('.tree__via >> text=opção 1'));
  await p.click('.tree__node[data-no="ola"]');
  await p.waitForSelector(".drawer >> #passo-titulo");
  assert.equal(await p.textContent("#passo-titulo"), "ola");
  await p.click('[data-acao="passo-seguinte"]');
  assert.equal(await p.textContent("#passo-titulo"), "menu");
  await p.click('[data-acao="passo-anterior"]');
  assert.equal(await p.textContent("#passo-titulo"), "ola");
  await p.click('.drawer__head [data-acao="fechar-folha"]');
  await p.click(".fab");
  await p.click('.type-card[data-criar="action.handoff"]');
  await p.waitForSelector(".drawer >> #passo-titulo");
  assert.equal(await p.textContent("#passo-titulo"), "equipe");
  await p.waitForTimeout(400);
  const caixa = await p.$eval(".drawer", (e) => e.getBoundingClientRect());
  assert.ok(caixa.bottom <= 844 + 1 && caixa.top > 0, "folha inteira na tela");
  await p.context().close();
});

await caso("oficina: pedir desligado, proposta, checklist e aprovação só na tela", async () => {
  const p = await pagina(1280, "#oficina");
  assert.equal(await p.isDisabled("text=Pedir proposta"), true);
  await p.click('[data-acao="exemplo-oficina"]');
  assert.ok(await p.isVisible("text=Pronta para revisão"));
  assert.ok(await p.isVisible("text=nenhum agente rodou"));
  await p.click('[data-acao="usar-proposta"]');
  assert.equal(await p.isDisabled('[data-acao="aprovar"]'), true);
  for (const k of ["estrutura", "lacunas", "simulei"]) await p.check(`[data-checar="${k}"]`);
  await p.click('[data-acao="aprovar"]');
  assert.ok(await p.isVisible("text=Aprovado nesta tela"));
  assert.equal(await p.isDisabled("text=Publicar v2"), true);
  // editar depois de aprovar desfaz a aprovação
  await p.click('.tabs__item[data-tela="fluxo"]');
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="servicos"]', { force: true });
  await p.fill("#campo-texto", "Texto novo");
  assert.ok(await p.isVisible(".studio-head >> .version-state >> text=Rascunho"));
  await p.context().close();
});

await caso("simulador: respostas rápidas, etapa, silêncio, comparação e falha", async () => {
  const p = await pagina(1440, "#simulador");
  await p.click('[data-dizer="oi"]');
  assert.ok(await p.isVisible(".bubble >> text=Olá, Ana! Como podemos ajudar?"));
  assert.ok(await p.isVisible(".step-now >> text=espera"));
  await p.click('.reply-btn:not([disabled]) >> text=Serviços');
  assert.ok(await p.isVisible(".vars >> text=session.escolha"));
  assert.ok(await p.isVisible("text=Conversa concluída"));
  await p.click('[data-acao="comparar-sim"]');
  assert.ok(await p.isVisible(".compare >> text=Mesmo resultado"));
  await p.click('.phone__head [data-acao="reiniciar"]');
  await p.click('[data-dizer="oi"]');
  await p.click('[data-acao="silencio"]');
  assert.ok(await p.isVisible("text=Quando quiser, é só escrever de novo."));
  await p.context().close();
});

await caso("simulador no celular: conversa primeiro, detalhes em folha", async () => {
  const p = await pagina(360, "#simulador", 740);
  const fone = await p.$eval(".phone", (e) => e.getBoundingClientRect());
  const nav = await p.$eval(".bottomnav", (e) => e.getBoundingClientRect());
  assert.ok(fone.bottom <= nav.top + 1, "a conversa não fica sob a barra inferior");
  await p.click('[data-dizer="oi"]');
  await p.click('[data-acao="detalhes-sim"]');
  await p.waitForSelector(".drawer >> text=Etapa atual");
  assert.ok(await p.isVisible(".drawer .step-now >> text=espera"));
  await p.context().close();
});

await caso("versões: estados distintos, histórico e avaliação oficial importada", async () => {
  const p = await pagina(1280, "#versoes");
  for (const e of ["rascunho", "revisao", "aprovado", "publicado"]) assert.equal(await p.locator(`.cycle .version-state[data-estado="${e}"]`).count(), 1, e);
  const [download] = await Promise.all([p.waitForEvent("download"), p.click('[data-acao="baixar-entrada"]')]);
  assert.equal(download.suggestedFilename(), "entrada.json");
  const entrada = JSON.parse((await import("node:fs")).readFileSync(await download.path(), "utf8"));
  assert.deepEqual(Object.keys(entrada).sort(), ["base", "draft", "perfil", "scenarios"]);
  await p.setInputFiles("#saida-ponte", fixture("saida-ponte-cenario-falhou.json"));
  await p.waitForSelector(".report");
  assert.ok(await p.isVisible(".report >> text=1 cenário(s) falharam"));
  assert.ok(await p.isVisible(".report__fail"));
  await p.setInputFiles("#saida-ponte", fixture("saida-ponte-fluxo-invalido.json"));
  assert.ok(await p.isVisible("text=O motor recusou o rascunho"));
  await p.click('.issue[data-no="espera"]');
  await p.waitForSelector('#painel-lateral >> #lateral-titulo');
  assert.equal(await p.textContent("#lateral-titulo"), "espera", "problema do motor leva ao passo");
  await p.goto(BASE + "#versoes", { waitUntil: "networkidle" });
  await p.waitForSelector("#saida-ponte", { state: "attached" });
  await p.setInputFiles("#saida-ponte", fixture("saida-ponte-offline.json"));
  assert.ok(await p.isVisible("text=Todos os cenários passaram"));
  assert.ok(await p.isVisible(".timeline >> text=Avaliação oficial: cenários passaram"));
  await p.context().close();
});

await caso("teclado: Enter abre o passo, Escape fecha e devolve o foco; F enquadra", async () => {
  const p = await pagina(390, "#fluxo", 844);
  await p.focus('.tree__node[data-no="ola"]'); await p.keyboard.press("Enter");
  await p.waitForSelector(".drawer");
  assert.equal(await p.evaluate(() => document.activeElement.id), "campo-texto");
  await p.keyboard.press("Escape");
  assert.equal(await p.evaluate(() => document.activeElement.dataset.no), "ola");
  await p.context().close();
  const q = await pagina(1440, "#fluxo");
  await q.focus("#canvas"); await q.keyboard.press("+");
  const z = await q.textContent("#zoom-valor"); await q.keyboard.press("f");
  assert.notEqual(await q.textContent("#zoom-valor"), z);
  await q.context().close();
});

await caso("tema claro e troca de módulo pelo topo", async () => {
  const p = await pagina(390);
  await p.click(".topbar__module");
  assert.ok(await p.isVisible('#menu-topo a[href="../"] >> text=Prospecção'));
  await p.click('#menu-topo [data-acao="tema"]');
  assert.equal(await p.getAttribute("html", "data-theme"), "light");
  await p.click(".topbar__module"); await p.click('#menu-topo [data-acao="tema"]');
  await p.context().close();
});

await caso("movimento reduzido respeitado", async () => {
  const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const p = await c.newPage(); await p.goto(BASE + "#agentes", { waitUntil: "networkidle" });
  await p.click('.bottomnav__item[data-tela="fluxo"]');
  const d = await p.$eval(".view-enter, .tree", (e) => parseFloat(getComputedStyle(e).animationDuration));
  assert.ok(d <= 0.01, "duração " + d);
  await c.close();
});

await caso("sem erros no console", async () => { assert.deepEqual(erros, []); });

await navegador.close();
for (const [s, n] of resultados) console.log((s === "ok" ? "ok    " : "FALHOU") + "  " + n);
const falhas = resultados.filter(([s]) => s !== "ok").length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} passaram`);
process.exit(falhas ? 1 : 0);
