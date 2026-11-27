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
  await p.waitForSelector("#cabecalho .studio-head, .state-block", { state: "attached" });
  return p;
}
const ALVOS = ".bottomnav__item, .btn, .reply-btn, .tree__node, .agent-card, .chain__btn, .fab, .chip, .action-row, .demo-flag, .bot-row, .topbar__module, .stepper__tab, button.save-state, .link-btn--warn, .tree__ref, .tree__missing";

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
  assert.equal(await p.locator('#tela .op-state[data-estado="conectado"]').count(), 0, "nenhum agente ou bot aparece conectado");
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
  await p.waitForSelector(".studio-head >> text=Salvo · r2", { timeout: 5000 });
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

await caso("oficina: sugestão, execução, resultado e aprovação presa à revisão salva", async () => {
  const p = await pagina(1280, "#oficina");
  assert.equal(await p.isDisabled("text=Pedir proposta"), true);
  await p.click('[data-acao="exemplo-oficina"]');
  await p.waitForSelector(".log--sugestao >> text=exemplo fictício, não rodou");
  assert.ok(await p.isVisible(".log--execucao"));
  assert.equal(await p.isDisabled('[data-acao="aprovar"]'), true);
  // Executar os cenários na prévia: a v1 não tem "Horários" e reprova um cenário
  await p.click('[data-acao="rodar-cenarios"]');
  assert.ok(await p.isVisible(".log--resultado >> text=1 cenário(s) falharam"));
  await p.click('[data-acao="usar-proposta"]');
  await p.waitForSelector(".studio-head >> text=Salvo · r2", { timeout: 5000 });
  for (const k of ["estrutura", "lacunas", "simulei"]) await p.check(`[data-checar="${k}"]`);
  await p.click('[data-acao="aprovar"]');
  await p.waitForSelector("text=Revisão r2 aprovada");
  assert.ok(await p.isVisible(".studio-head .version-state >> text=Aprovado"));
  assert.equal(await p.isDisabled("text=Publicar"), true);
  // editar depois de aprovar: revisão nova, aprovação não vale
  await p.click('.tabs__item[data-tela="fluxo"]');
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="servicos"]', { force: true });
  await p.fill("#campo-texto", "Texto novo");
  await p.waitForSelector(".studio-head >> text=Salvo · r3", { timeout: 5000 });
  assert.ok(await p.isVisible(".studio-head .version-state >> text=Rascunho"));
  await p.click('.tabs__item[data-tela="oficina"]');
  await p.waitForSelector("text=A aprovação da r2 não vale mais");
  await p.context().close();
});

await caso("oficina no celular: etapas como abas", async () => {
  const p = await pagina(390, "#oficina", 844);
  await p.click('[data-acao="exemplo-oficina"]');
  await p.waitForSelector('.stepper__tab[data-oficina="proposta"][aria-selected="true"]');
  assert.equal(await p.isVisible("#briefing"), false, "pedido fica na própria aba");
  await p.click('.stepper__tab[data-oficina="revisao"]');
  assert.ok(await p.isVisible(".log--aprovacao"));
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
  assert.equal(await p.locator(".chat-steps").count(), 0, "etapas escondidas por padrão");
  await p.check("#mostrar-etapas");
  assert.ok(await p.locator(".chat-steps").count() >= 1);
  assert.ok(await p.isVisible("text=encaminhado") === false);
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
  assert.equal(await p.locator(".cycle__step").count(), 4);
  assert.equal(await p.getAttribute('.cycle__step[aria-current="step"]', "data-estado"), "atual");
  await p.waitForSelector(".rev-list .rev >> text=r1");
  const [download] = await Promise.all([p.waitForEvent("download"), p.click('[data-acao="baixar-entrada"]')]);
  assert.equal(download.suggestedFilename(), "entrada.json");
  const entrada = JSON.parse((await import("node:fs")).readFileSync(await download.path(), "utf8"));
  assert.deepEqual(Object.keys(entrada).sort(), ["base", "draft", "perfil", "scenarios"]);
  await p.setInputFiles("#saida-ponte", fixture("saida-ponte-cenario-falhou.json"));
  await p.waitForSelector(".report >> text=1 cenário(s) falharam");
  assert.ok(await p.isVisible(".report__fail"));
  await p.setInputFiles("#saida-ponte", fixture("saida-ponte-fluxo-invalido.json"));
  await p.waitForSelector(".report, .state-block >> text=O motor recusou o rascunho");
  await p.click('.issue[data-no="espera"]');
  await p.waitForSelector('#painel-lateral >> #lateral-titulo');
  assert.equal(await p.textContent("#lateral-titulo"), "espera", "problema do motor leva ao passo");
  await p.goto(BASE + "#versoes", { waitUntil: "networkidle" });
  await p.waitForSelector("#saida-ponte", { state: "attached" });
  await p.setInputFiles("#saida-ponte", fixture("saida-ponte-offline.json"));
  await p.waitForSelector("text=Todos os cenários passaram");
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


await caso("conflito: alterações locais preservadas e resolvidas mantendo as minhas", async () => {
  const p = await pagina(1280, "?roteiro=conflito#fluxo");
  assert.ok(await p.isVisible(".strip--script >> text=Roteiro de homologação"));
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="servicos"]', { force: true });
  await p.fill("#campo-texto", "Meu texto de serviços");
  await p.waitForSelector(".strip--danger >> text=Conflito", { timeout: 5000 });
  assert.ok(await p.isVisible(".studio-head >> text=Conflito de revisão"));
  assert.equal(await p.inputValue("#campo-texto"), "Meu texto de serviços", "o que eu escrevi continua aqui");
  await p.click('.strip--danger [data-acao="ver-sincronia"]');
  await p.waitForSelector(".drawer >> text=Os dois mexeram em");
  assert.ok(await p.isVisible(".drawer >> text=Sua base era a r1; agora existe a r2"));
  const [download] = await Promise.all([p.waitForEvent("download"), p.click('.drawer [data-acao="baixar-local"]')]);
  assert.equal(download.suggestedFilename(), "rascunho-local.json");
  await p.click('[data-acao="conflito-minhas"]');
  await p.waitForSelector(".studio-head >> text=Salvo · r3", { timeout: 5000 });
  await p.click('.tabs__item[data-tela="versoes"]');
  await p.waitForSelector(".rev-list >> text=Outra pessoa (roteiro)");
  await p.click('[data-comparar="1:2"]');
  await p.waitForSelector("#t-diff >> text=r1 × r2");
  await p.context().close();
});

await caso("conflito: usar a revisão nova e recuperar as minhas com desfazer", async () => {
  const p = await pagina(390, "?roteiro=conflito#fluxo", 844);
  await p.click('.tree__node[data-no="servicos"]');
  await p.fill("#campo-texto", "Meu texto");
  await p.click('.drawer__head [data-acao="fechar-folha"]');
  await p.waitForSelector(".strip--danger", { timeout: 5000 });
  await p.click('.strip--danger [data-acao="ver-sincronia"]');
  await p.click('[data-acao="conflito-delas"]');
  await p.waitForSelector(".studio-head >> text=Salvo · r2");
  assert.ok(await p.isVisible(".tree__summary >> text=Veja nossos serviços"));
  await p.click(".toast__action");
  assert.ok(await p.isVisible(".tree__summary >> text=Meu texto"));
  await p.context().close();
});

for (const [roteiro, texto] of [["permissao", "Somente leitura"], ["sessao", "Sessão expirada"]]) {
  await caso(`${roteiro}: para de salvar, avisa e mantém tudo local`, async () => {
    const p = await pagina(1280, `?roteiro=${roteiro}#fluxo`);
    await p.click('[data-zoom="fit"]');
    await p.click('.canvas .node[data-no="agendar"]', { force: true });
    await p.fill("#campo-texto", "Texto local");
    await p.waitForSelector(`.strip >> text=${texto}`, { timeout: 5000 });
    assert.ok(await p.isVisible(`.studio-head >> text=${texto}`));
    assert.equal(await p.inputValue("#campo-texto"), "Texto local");
    assert.ok(await p.isVisible('.strip [data-acao="baixar-local"]'));
    await p.context().close();
  });
}

await caso("indisponível: tela de erro com tentar de novo, sem dados inventados", async () => {
  const p = await navegador.newPage(); await p.goto(BASE + "?roteiro=indisponivel#fluxo", { waitUntil: "networkidle" });
  await p.waitForSelector("text=Não deu para abrir o rascunho");
  assert.ok(await p.isVisible('[data-acao="tentar-de-novo"]'));
  assert.equal(await p.locator(".node, .tree__node").count(), 0);
  await p.close();
});

await caso("fluxo extenso: 59 passos, minimapa, busca e desempenho", async () => {
  const p = await pagina(1440, "?roteiro=extenso#fluxo");
  await p.waitForSelector(".canvas .node");
  assert.equal(await p.locator(".canvas .node").count(), 59);
  assert.ok(await p.isVisible("#minimapa"));
  const antes = await p.$eval("#palco", (e) => e.style.transform);
  await p.click("#minimapa svg");
  assert.notEqual(await p.$eval("#palco", (e) => e.style.transform), antes, "clicar no minimapa leva até o ponto");
  await p.click("#busca-passo"); await p.keyboard.type("detalhes-5");
  await p.waitForSelector(".search-hit >> text=detalhes-5");
  await p.keyboard.press("Enter");
  await p.waitForSelector("#lateral-titulo >> text=detalhes-5");
  const ms = await p.evaluate(async () => { const t = performance.now(); document.querySelector('.tabs__item[data-tela="agentes"]').click(); document.querySelector('.tabs__item[data-tela="fluxo"]').click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t; });
  assert.ok(ms < 400, "redesenhar 59 passos levou " + Math.round(ms) + " ms");
  await p.context().close();
});

await caso("desfazer e refazer pelo botão e pelo teclado", async () => {
  const p = await pagina(1280, "#fluxo");
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="ola"]', { force: true });
  await p.fill("#campo-texto", "Oi!");
  await p.click('[data-acao="desfazer"]');
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="ola"]', { force: true });
  assert.match(await p.inputValue("#campo-texto"), /Como podemos ajudar/);
  await p.click('[data-acao="refazer"]');
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="ola"]', { force: true });
  assert.equal(await p.inputValue("#campo-texto"), "Oi!");
  await p.focus("#canvas"); await p.keyboard.press("Control+z");
  assert.equal(await p.isDisabled('[data-acao="refazer"]'), false);
  await p.context().close();
});

await caso("menu de contexto no canvas e toque longo na árvore", async () => {
  const p = await pagina(1280, "#fluxo");
  await p.click('[data-zoom="fit"]');
  await p.click('.canvas .node[data-no="agendar"]', { button: "right", force: true });
  await p.waitForSelector(".menu--context");
  await p.click('.menu--context [data-acao="inserir-depois"]');
  await p.waitForSelector(".drawer >> text=Inserir depois de agendar");
  await p.context().close();
  const q = await pagina(390, "#fluxo", 844);
  const r = await q.$eval('.tree__node[data-no="menu"]', (e) => { const b = e.getBoundingClientRect(); return { x: b.x + 40, y: b.y + 20 }; });
  await q.dispatchEvent('.tree__node[data-no="menu"]', "pointerdown", { pointerType: "touch", clientX: r.x, clientY: r.y, pointerId: 7, isPrimary: true });
  await q.waitForTimeout(650);
  await q.dispatchEvent('.tree__node[data-no="menu"]', "pointerup", { pointerType: "touch", clientX: r.x, clientY: r.y, pointerId: 7 });
  await q.waitForSelector(".sheet-menu >> text=Inserir passo depois");
  await q.context().close();
});

await caso("folha inferior fecha arrastando para baixo", async () => {
  const p = await pagina(390, "#agentes", 844);
  await p.click('.agent-card[data-agente="guardiao"]');
  await p.waitForSelector(".drawer"); await p.waitForTimeout(350);
  const h = await p.$eval(".drawer__head", (e) => { const b = e.getBoundingClientRect(); return { x: b.x + 60, y: b.y + 20 }; });
  await p.dispatchEvent(".drawer__head", "pointerdown", { pointerType: "touch", clientX: h.x, clientY: h.y, pointerId: 3, isPrimary: true });
  await p.dispatchEvent(".drawer__head", "pointermove", { pointerType: "touch", clientX: h.x, clientY: h.y + 160, pointerId: 3 });
  await p.dispatchEvent(".drawer__head", "pointerup", { pointerType: "touch", clientX: h.x, clientY: h.y + 160, pointerId: 3 });
  await p.waitForSelector(".drawer", { state: "detached", timeout: 2000 });
  await p.context().close();
});

await caso("volta onde estava: tela, vista e seleção ao recarregar", async () => {
  const p = await pagina(1280, "#fluxo");
  await p.click('[data-vista="passos"]');
  await p.click('.tree__node[data-no="menu"]');
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector(".tree");
  assert.equal(await p.getAttribute('[data-vista="passos"]', "aria-pressed"), "true");
  assert.ok(await p.isVisible("#lateral-titulo >> text=menu"));
  await p.context().close();
});

await caso("sem erros no console", async () => { assert.deepEqual(erros, []); });

await navegador.close();
for (const [s, n] of resultados) console.log((s === "ok" ? "ok    " : "FALHOU") + "  " + n);
const falhas = resultados.filter(([s]) => s !== "ok").length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} passaram`);
process.exit(falhas ? 1 : 0);
