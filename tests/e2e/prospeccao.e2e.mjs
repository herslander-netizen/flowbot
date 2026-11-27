// Testes de navegador do Modo Prospecção. Precisam do Playwright com Chromium instalado.
// Rode com o servidor ligado (npm run dev) e depois: npm run test:e2e
// Não fazem parte do CI porque o Playwright não é dependência do projeto.
import { createRequire } from "node:module";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.FLOWBOT_URL ?? "http://127.0.0.1:4173/";
const saida = process.env.FLOWBOT_SHOTS ?? null;
const resultados = [];

async function caso(nome, fn) {
  try { await fn(); resultados.push(["ok", nome]); }
  catch (erro) { resultados.push(["FALHOU", nome + " — " + erro.message.split("\n").slice(0, 4).join(" | ")]); }
}

const navegador = await chromium.launch();
const erros = [];
async function pagina(largura, altura = 900, extra = {}) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, acceptDownloads: true, ...extra });
  await contexto.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(BASE).origin });
  const p = await contexto.newPage();
  p.on("pageerror", (e) => erros.push(largura + "px: " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/tile\.openstreetmap/.test(m.text())) erros.push(largura + "px console: " + m.text()); });
  await p.goto(BASE, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  return p;
}

// ── Larguras: sem rolagem horizontal e com tudo alcançável ──
for (const largura of [360, 390, 430, 768, 1280]) {
  await caso(`layout ${largura}px sem rolagem horizontal`, async () => {
    const p = await pagina(largura, largura < 768 ? 800 : 900, largura < 768 ? { hasTouch: true, isMobile: true } : {});
    for (const aba of largura < 768 ? ["resumo", "mapa", "lista"] : [null]) {
      if (aba) { await p.click(`.bottomnav__item[data-aba="${aba}"]`); await p.waitForTimeout(500); }
      const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(larguraDoc <= largura, `scrollWidth ${larguraDoc} em ${aba ?? "tela"}`);
      if (saida) await p.screenshot({ path: join(saida, `${largura}-${aba ?? "tela"}.png`), fullPage: largura >= 768 });
    }
    // alvos de toque no celular
    if (largura < 768) {
      const pequenos = await p.$$eval(".bottomnav__item, .chip, .btn", (els) => els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).length);
      assert.equal(pequenos, 0, pequenos + " alvos com menos de 44px");
    }
    await p.context().close();
  });
}

const p = await pagina(1280);

await caso("indicadores batem com os dados (6 empresas fictícias)", async () => {
  const valores = await p.$$eval(".kpi__value", (els) => els.map((e) => e.textContent.trim()));
  assert.equal(valores[0], "6");
  assert.equal(valores[1], "4");
  const soma = await p.$$eval(".funnel__value", (els) => els.reduce((s, e) => s + Number(e.firstChild.textContent), 0));
  assert.equal(soma, 6);
  assert.ok(await p.isVisible("text=Demonstração:"));
});

await caso("mapa carrega com estilo e marcadores", async () => {
  await p.waitForSelector(".leaflet-tile-loaded", { timeout: 10000 });
  const posicao = await p.$eval(".leaflet-pane", (e) => getComputedStyle(e).position);
  assert.equal(posicao, "absolute", "CSS do Leaflet não carregou");
  const marcadores = await p.$$eval(".leaflet-marker-icon", (els) => els.length);
  assert.ok(marcadores >= 1);
  assert.ok(await p.isVisible(".map-legend"));
});

await caso("selecionar ponto no mapa mostra o cartão e abre detalhes", async () => {
  await p.click(".leaflet-marker-icon:has(.pin)");
  await p.waitForSelector(".map-select");
  await p.click('.map-select [data-acao="abrir"]');
  await p.waitForSelector(".drawer");
  await p.keyboard.press("Escape");
  await p.waitForSelector(".drawer", { state: "detached" });
});

await caso("filtro por etapa (chip e funil) e busca", async () => {
  await p.click('.chip[data-filtro="ganho"]');
  assert.equal(await p.$$eval(".leaflet-marker-icon", (m) => m.length), 1, "mapa mostra só a empresa ganha");
  await p.click('[data-vista="lista"]');
  assert.equal(await p.$$eval(".table tbody tr", (r) => r.length), 1);
  await p.click('.funnel__row[data-filtro="ganho"]');
  assert.equal(await p.$$eval(".table tbody tr", (r) => r.length), 6, "tocar de novo no funil limpa o filtro");
  await p.fill("#search", "aracaju");
  assert.equal(await p.$$eval(".table tbody tr", (r) => r.length), 4);
  await p.fill("#search", "zzz");
  assert.ok(await p.isVisible("text=Nenhuma empresa com esses filtros"));
  await p.click('[data-acao="limpar-filtros"]');
  assert.equal(await p.$$eval(".table tbody tr", (r) => r.length), 6);
});

await caso("ordenação por nome", async () => {
  await p.selectOption("#ordem", "nome");
  const nomes = await p.$$eval(".table tbody .row-link", (e) => e.map((x) => x.textContent));
  assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")));
});

await caso("formulário: erro de nome, cadastro e duplicidade", async () => {
  await p.click('.page-head [data-acao="novo"]');
  await p.waitForSelector("#new-company");
  assert.equal(await p.evaluate(() => document.activeElement.id), "new-name", "foco inicial no nome");
  await p.click('[type="submit"][form="new-company"]');
  assert.equal(await p.getAttribute("#new-name", "aria-invalid"), "true");
  await p.fill("#new-name", "Padaria Teste");
  await p.fill("#new-city", "Aracaju"); await p.fill("#new-uf", "se");
  await p.fill("#new-lat", "-10.92"); await p.fill("#new-lng", "-37.05");
  await p.click('[type="submit"][form="new-company"]');
  await p.waitForSelector("#detalhe-titulo");
  assert.equal(await p.textContent("#detalhe-titulo"), "Padaria Teste");
  assert.equal(await p.$eval(".kpi__value", (e) => e.textContent), "7");
  await p.keyboard.press("Escape");
  await p.click('.page-head [data-acao="novo"]');
  await p.fill("#new-name", "padaria teste"); await p.fill("#new-city", "Aracaju"); await p.fill("#new-uf", "SE");
  await p.click('[type="submit"][form="new-company"]');
  assert.ok(await p.isVisible("text=já está cadastrada"));
  await p.keyboard.press("Escape");
});

await caso("detalhes: etapa, notas, bloqueio, rascunho e cópia", async () => {
  await p.click('.row-link:text("Studio Aurora")');
  await p.waitForSelector("#lead-stage");
  await p.selectOption("#lead-stage", "proposta");
  assert.ok(await p.isVisible(".timeline >> text=Qualificado → Proposta"));
  await p.fill("#lead-notes", "Ligar na segunda");
  await p.click('[data-acao="gerar"]');
  const texto = await p.inputValue("#lead-draft");
  assert.match(texto, /Studio Aurora/);
  assert.match(texto, /não receber novos contatos/);
  await p.click('[data-acao="copiar"]');
  assert.equal(await p.evaluate(() => navigator.clipboard.readText()), texto.trim());
  await p.check("#suppression");
  // Regra das PRs #5/#8: não contatar apaga o rascunho, bloqueia preparar e copiar, e não se desfaz.
  await p.waitForSelector("#lead-draft", { state: "detached" });
  assert.equal(await p.isDisabled('[data-acao="gerar"]'), true);
  assert.equal(await p.isDisabled('[data-acao="copiar"]'), true);
  assert.equal(await p.isDisabled("#suppression"), true, "não contatar não se desmarca");
  await p.keyboard.press("Escape");
  await p.click('.row-link:text("Studio Aurora")');
  assert.equal(await p.inputValue("#lead-notes"), "Ligar na segunda", "nota mantida");
  assert.equal(await p.isChecked("#suppression"), true);
  await p.keyboard.press("Escape");
});

await caso("importação CSV com duplicada e linha inválida", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "flowbot-"));
  const arquivo = join(pasta, "empresas.csv");
  await writeFile(arquivo, "﻿empresa;cidade;uf;segmento;latitude;longitude\n" +
    "Mercado Sol;Aracaju;SE;Varejo;-10.95;-37.07\nStudio Aurora;Aracaju;SE;Beleza;;\n;Aracaju;SE;;;\n");
  await p.setInputFiles("#csv-file", arquivo);
  await p.waitForSelector(".toast >> text=1 importada(s) · 1 duplicada(s) · 1 linha(s) inválida(s)");
  assert.equal(await p.$eval(".kpi__value", (e) => e.textContent), "8");
});

await caso("exportação CSV com todas as empresas e fórmulas neutralizadas", async () => {
  const [download] = await Promise.all([p.waitForEvent("download"), p.click('.page-head [aria-controls="menu-csv"]').then(() => p.click('#menu-csv [data-acao="exportar"]'))]);
  assert.equal(download.suggestedFilename(), "flowbot-prospeccao.csv");
  const caminho = await download.path();
  const conteudo = (await import("node:fs")).readFileSync(caminho, "utf8");
  assert.equal(conteudo.trim().split("\r\n").length, 9, "cabeçalho + 8 empresas");
  assert.match(conteudo, /Mercado Sol/);
});

await caso("teclado: / foca a busca, Tab percorre, foco preso na gaveta e volta ao fechar", async () => {
  await p.click("body", { position: { x: 5, y: 5 } });
  await p.keyboard.press("/");
  assert.equal(await p.evaluate(() => document.activeElement.id), "search");
  const botao = p.locator('.row-link').first();
  await botao.focus();
  await p.keyboard.press("Enter");
  await p.waitForSelector(".drawer");
  for (let i = 0; i < 40; i++) await p.keyboard.press("Tab");
  assert.ok(await p.evaluate(() => !!document.activeElement.closest(".drawer")), "foco saiu da gaveta");
  await p.keyboard.press("Escape");
  assert.ok(await p.evaluate(() => document.activeElement.classList.contains("row-link")), "foco voltou para a lista");
});

await caso("tema claro", async () => {
  await p.click('.sidebar [data-acao="tema"]');
  assert.equal(await p.getAttribute("html", "data-theme"), "light");
  if (saida) await p.screenshot({ path: join(saida, "1280-claro.png"), fullPage: true });
  await p.click('.sidebar [data-acao="tema"]');
});

await caso("landing abre e liga ao app", async () => {
  const l = await pagina(390, 844, { hasTouch: true, isMobile: true });
  await l.goto(new URL("landing/", BASE).href, { waitUntil: "networkidle" });
  await l.waitForTimeout(1500);
  assert.equal(await l.getAttribute(".nav .btn", "href"), "../");
  assert.ok(await l.evaluate(() => document.documentElement.scrollWidth <= 390));
  await l.context().close();
});

await caso("galeria do design system abre", async () => {
  const g = await pagina(1280);
  await g.goto(new URL("design-system.html", BASE).href, { waitUntil: "networkidle" });
  assert.ok(await g.isVisible("text=Design system"));
  await g.context().close();
});

await caso("celular: folha de detalhes fecha arrastando e a aba volta ao recarregar", async () => {
  const m = await pagina(390, 844, { hasTouch: true, isMobile: true });
  await m.click('.bottomnav__item[data-aba="lista"]');
  await m.locator("[data-acao=abrir]:visible").first().click();
  await m.waitForSelector(".drawer"); await m.waitForTimeout(350);
  const h = await m.$eval(".drawer__head", (e) => { const b = e.getBoundingClientRect(); return { x: b.x + 40, y: b.y + 16 }; });
  await m.dispatchEvent(".drawer__head", "pointerdown", { pointerType: "touch", clientX: h.x, clientY: h.y, pointerId: 5, isPrimary: true });
  await m.dispatchEvent(".drawer__head", "pointermove", { pointerType: "touch", clientX: h.x, clientY: h.y + 170, pointerId: 5 });
  await m.dispatchEvent(".drawer__head", "pointerup", { pointerType: "touch", clientX: h.x, clientY: h.y + 170, pointerId: 5 });
  await m.waitForSelector(".drawer", { state: "detached", timeout: 2000 });
  await m.reload({ waitUntil: "networkidle" });
  assert.equal(await m.getAttribute('.bottomnav__item[data-aba="lista"]', "aria-current"), "page");
  await m.context().close();
});

await caso("busca por CEP no Android e inclusão manual com fonte", async () => {
  const mobile = await pagina(390, 844, { hasTouch: true, isMobile: true });
  await mobile.route("**/api/prospeccao/cep?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        cep: "49000000",
        endereco: "Centro, Aracaju, SE",
        observacao: "Localização aproximada por município.",
        empresas: [{
          id: "node/771122",
          nome: "Mercearia da Rua",
          categoria: "Comércio",
          cidade: "Aracaju",
          uf: "SE",
          latitude: -10.92,
          longitude: -37.05,
          distanciaMetros: 120,
          site: "https://exemplo.test",
          fonte: "https://www.openstreetmap.org/node/771122",
        }],
      }),
    });
  });
  await mobile.click("#buscar-empresas-cep");
  assert.ok(await mobile.isVisible("#cep-title"));
  await mobile.fill("#cep-input", "49000-000");
  await mobile.selectOption("#cep-radius", "1000");
  await mobile.click(".cep-form__submit");
  await mobile.waitForSelector('[data-cep-import="node/771122"]');
  assert.ok(await mobile.isVisible("#cep-search-root >> text=OpenStreetMap"));
  await mobile.click('[data-cep-import="node/771122"]');
  await mobile.waitForSelector("text=Empresa adicionada ao funil");
  assert.equal(await mobile.$eval(".kpi__value", (e) => e.textContent), "7");
  const noOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth <= 390);
  assert.ok(noOverflow, "a busca criou rolagem horizontal no Android");
  await mobile.context().close();
});

await caso("CEP inválido não consulta fonte pública", async () => {
  const mobile = await pagina(360, 800, { hasTouch: true, isMobile: true });
  let chamados = 0;
  await mobile.route("**/api/prospeccao/cep?*", (route) => {
    chamados++;
    return route.fulfill({ status: 500, body: "{}" });
  });
  await mobile.click("#buscar-empresas-cep");
  await mobile.fill("#cep-input", "123");
  await mobile.click(".cep-form__submit");
  assert.ok(await mobile.isVisible("text=Informe um CEP com 8 números."));
  assert.equal(chamados, 0);
  await mobile.keyboard.press("Escape");
  assert.equal(await mobile.locator("#cep-title").count(), 0);
  await mobile.context().close();
});

await caso("sem erros no console", async () => { assert.deepEqual(erros, []); });

await navegador.close();
for (const [s, n] of resultados) console.log((s === "ok" ? "ok    " : "FALHOU") + "  " + n);
const falhas = resultados.filter(([s]) => s !== "ok").length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} passaram`);
process.exit(falhas ? 1 : 0);
