// Testes de navegador do Bot Studio (prévia). Mesmo esquema de prospeccao.e2e.mjs:
// servidor ligado (npm run dev) e Playwright com Chromium instalado fora do projeto.
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = new URL("estudio/", process.env.FLOWBOT_URL ?? "http://127.0.0.1:4173/").href;
const resultados = []; const erros = [];
async function caso(nome, fn) {
  try { await fn(); resultados.push(["ok", nome]); }
  catch (erro) { resultados.push(["FALHOU", nome + " — " + erro.message.split("\n")[0]]); }
}
const navegador = await chromium.launch();
async function pagina(largura, hash = "", altura = 900) {
  const movel = largura < 768;
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, ...(movel ? { isMobile: true, hasTouch: true } : {}) });
  const p = await contexto.newPage();
  p.on("pageerror", (e) => erros.push(largura + "px: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") erros.push(largura + "px console: " + m.text()); });
  await p.goto(BASE + hash, { waitUntil: "networkidle" });
  return p;
}

for (const largura of [360, 390, 430, 768, 1280]) {
  await caso(`${largura}px: cinco telas sem rolagem horizontal e com alvos de 44px`, async () => {
    const p = await pagina(largura, "", largura < 768 ? 800 : 900);
    for (const tela of ["agentes", "fluxo", "oficina", "simulador", "versoes"]) {
      await p.click(`${largura < 768 ? ".bottomnav__item" : ".tabs__item"}[data-tela="${tela}"]`);
      await p.waitForTimeout(150);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(sw <= largura, `scrollWidth ${sw} em ${tela}`);
      if (largura < 768) {
        const pequenos = await p.$$eval(".bottomnav__item, .btn:not(.btn--icon), .reply-btn", (els) => els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()));
        assert.deepEqual(pequenos, [], "alvos pequenos em " + tela);
      }
    }
    await p.context().close();
  });
}

const p = await pagina(1280);

await caso("selo de demonstração e nada conectado", async () => {
  assert.ok(await p.isVisible("text=Demonstração:"));
  assert.ok(await p.isVisible("text=Não conectado nesta prévia"));
  assert.equal(await p.locator(".agent-row").count(), 5);
});

await caso("fluxo: mapa com ligações, lista e conferência ok", async () => {
  await p.click('.tabs__item[data-tela="fluxo"]');
  await p.waitForSelector(".canvas .node");
  assert.equal(await p.locator(".canvas .node").count(), 12);
  assert.ok(await p.locator(".canvas__edges path").count() >= 14);
  assert.ok(await p.isVisible("text=Estrutura ok"));
  await p.click('[data-vista="lista"]');
  assert.equal(await p.locator(".step").count(), 12);
  await p.click('[data-vista="mapa"]');
});

await caso("editar opção avisa limite e marca o rascunho", async () => {
  await p.click('.canvas .node[data-no="menu"]');
  await p.waitForSelector(".drawer");
  await p.fill('[data-opcao="0"]', "x".repeat(60));
  assert.equal(await p.textContent('[data-contador-opcao="0"]'), "60/60");
  await p.fill('[data-opcao="0"]', "");
  assert.ok(await p.isVisible(".drawer >> text=A opção 1 está sem texto."));
  await p.fill('[data-opcao="0"]', "Marcar horário");
  await p.keyboard.press("Escape");
  await p.waitForSelector(".drawer", { state: "detached" });
  assert.ok(await p.isVisible("text=Rascunho com alterações locais"));
  await p.click('[data-acao="descartar"]');
  assert.equal(await p.isVisible("text=Rascunho com alterações locais"), false);
});

await caso("oficina: pedir proposta desligado, exemplo, revisão manual", async () => {
  await p.click('.tabs__item[data-tela="oficina"]');
  assert.equal(await p.isDisabled("text=Pedir proposta"), true);
  await p.click('[data-acao="exemplo-oficina"]');
  assert.ok(await p.isVisible("text=Pronto para revisão"));
  assert.equal(await p.isDisabled('[data-acao="aprovar"]'), true, "sem proposta no rascunho não aprova");
  await p.click('[data-acao="usar-proposta"]');
  assert.equal(await p.isDisabled('[data-acao="aprovar"]'), true, "precisa marcar a conferência");
  await p.check("#conferi");
  await p.click('[data-acao="aprovar"]');
  assert.ok(await p.isVisible("text=Aprovado nesta tela."));
  assert.equal(await p.isDisabled("text=Publicar v2"), true, "publicação desligada");
});

await caso("simulador: botões, variável e passagem para a equipe", async () => {
  await p.click('.tabs__item[data-tela="simulador"]');
  await p.fill("#mensagem", "oi");
  await p.press("#mensagem", "Enter");
  assert.ok(await p.isVisible(".bubble >> text=Olá, Ana! Como podemos ajudar?"));
  assert.equal(await p.locator(".reply-btn:not([disabled])").count(), 4, "proposta tem 4 opções");
  await p.click('.reply-btn:not([disabled]) >> text=Horários');
  assert.ok(await p.isVisible("text=Atendemos de segunda a sábado"));
  assert.ok(await p.isVisible(".dl >> text=session.escolha"));
  await p.click('[data-sim-versao="publicada"]');
  await p.fill("#mensagem", "oi"); await p.press("#mensagem", "Enter");
  assert.equal(await p.locator(".reply-btn:not([disabled])").count(), 3, "v1 tem 3 opções");
  await p.click('.reply-btn:not([disabled]) >> text=Falar com alguém');
  assert.ok(await p.isVisible("text=Passada para a equipe"));
  await p.click('[data-acao="reiniciar"]');
  await p.fill("#mensagem", "oi"); await p.press("#mensagem", "Enter");
  await p.click('[data-acao="silencio"]');
  assert.ok(await p.isVisible("text=Quando quiser, é só escrever de novo."));
});

await caso("versões: ciclo e diferença com a v1", async () => {
  await p.click('.tabs__item[data-tela="versoes"]');
  assert.equal(await p.getAttribute('[aria-current="step"]', "data-estado"), "atual");
  assert.match(await p.textContent('[aria-current="step"]'), /Aprovado/);
  assert.ok(await p.isVisible(".diff >> text=Novo · Texto"));
  assert.ok(await p.isVisible(".diff__old >> text=Nossos serviços estão na página, com preços."));
});

await caso("teclado: Enter abre o passo e Escape devolve o foco", async () => {
  await p.goto(BASE + "#fluxo", { waitUntil: "networkidle" });
  await p.click('[data-vista="lista"]');
  const no = p.locator('.step .node[data-no="ola"]');
  await no.focus(); await p.keyboard.press("Enter");
  await p.waitForSelector(".drawer");
  assert.equal(await p.evaluate(() => document.activeElement.id), "campo-texto");
  await p.keyboard.press("Escape");
  assert.equal(await p.evaluate(() => document.activeElement.dataset.no), "ola", "foco volta ao passo");
});

await caso("tema claro e link da Prospecção", async () => {
  await p.click('.sidebar [data-acao="tema"]');
  assert.equal(await p.getAttribute("html", "data-theme"), "light");
  await p.click('.sidebar [data-acao="tema"]');
  assert.equal(await p.getAttribute('.sidebar a[href="../"].nav-item', "href"), "../");
});

await caso("Prospecção leva ao Bot Studio", async () => {
  const q = await pagina(1280);
  await q.goto(new URL("../", BASE).href, { waitUntil: "networkidle" });
  await q.click('.sidebar a[href="./estudio/"]');
  await q.waitForSelector(".tabs");
  await q.context().close();
});

await caso("sem erros no console", async () => { assert.deepEqual(erros, []); });

await navegador.close();
for (const [s, n] of resultados) console.log((s === "ok" ? "ok    " : "FALHOU") + "  " + n);
const falhas = resultados.filter(([s]) => s !== "ok").length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} passaram`);
process.exit(falhas ? 1 : 0);
