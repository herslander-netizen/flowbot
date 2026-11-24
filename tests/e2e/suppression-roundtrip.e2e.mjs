// Start npm run dev; install Playwright + its Chromium, then run this file.
// Only synthetic fixtures and a loopback server. No map or provider calls.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { lerCsv } from "../../src/prospecting.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const base = new URL(process.env.FLOWBOT_URL ?? "http://127.0.0.1:4173/");
assert.ok(base.protocol === "http:" && base.hostname === "127.0.0.1" &&
  !base.username && !base.password, "Use only the local fixture server");
const browser = await chromium.launch({
  executablePath: process.env.FLOWBOT_CHROMIUM || undefined,
});
const nome = "Empresa Ficticia Teste Supressao";
const csv = (flag) => ({
  name: "fixture.csv", mimeType: "text/csv",
  buffer: Buffer.from(`empresa;suprimido;latitude;longitude\r\n${nome};${flag};-10.916;-37.061\r\n`),
});

async function mobile() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    acceptDownloads: true, serviceWorkers: "block",
  });
  await context.route("**/*", route =>
    new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  await page.goto(base.href, { waitUntil: "domcontentloaded" });
  await page.locator('.bottomnav [data-aba="lista"]').click();
  return { context, page };
}

const lead = (page) => page.locator(".lead-card").filter({ hasText: nome });
async function importCsv(page, data, report) {
  await page.locator("#csv-file").setInputFiles(data);
  await page.locator(".toast").getByText(report, { exact: false }).waitFor();
}

async function blocked(page) {
  const drawer = page.getByRole("dialog").filter({ has: page.locator("#detalhe-titulo") });
  await drawer.waitFor();
  const suppression = drawer.locator("#suppression");
  assert.equal(await suppression.isChecked(), true, "Não contatar stays checked");
  assert.equal(await suppression.isDisabled(), true, "No unaudited release control");
  assert.equal(await drawer.locator("#lead-draft").count(), 0, "No stale text field");
  for (const action of ["gerar", "copiar"]) {
    const button = drawer.locator(`[data-acao="${action}"]`);
    if (await button.count()) assert.equal(await button.isDisabled(), true, action + " must be disabled");
  }
}

try {
  const original = await mobile();
  await importCsv(original.page, csv("false"), "1 importada(s) · 0 duplicada(s)");
  await lead(original.page).click();
  const draftButton = original.page.locator('[data-acao="gerar"]');
  await draftButton.click();
  assert.match(await original.page.locator("#lead-draft").inputValue(), new RegExp(nome));
  await original.page.locator("#suppression").check();
  await blocked(original.page);
  await original.page.locator('#painel [data-acao="fechar"]').click();
  await original.page.getByRole("button", { name: "Mais ações" }).click();
  const [download] = await Promise.all([
    original.page.waitForEvent("download"),
    original.page.getByRole("menuitem", { name: "Exportar CSV" }).click(),
  ]);
  assert.equal(download.suggestedFilename(), "flowbot-prospeccao.csv");
  const exported = await readFile(await download.path());
  const [columns, ...rows] = lerCsv(exported.toString("utf8"));
  const exportedLeads = rows.filter(row => row[columns.indexOf("nome")] === nome);
  assert.equal(exportedLeads.length, 1, "Exactly one matching row in browser download");
  assert.deepEqual(["latitude", "longitude", "suprimido"].map(key => exportedLeads[0][columns.indexOf(key)]),
    ["-10.916", "-37.061", "true"], "Browser download preserves both numbers and suppression");
  await original.context.close();

  const restored = await mobile();
  assert.equal(await lead(restored.page).count(), 0, "Fresh mobile context has no fixture lead");
  await restored.page.locator("#csv-file").setInputFiles({
    name: download.suggestedFilename(), mimeType: "text/csv", buffer: exported,
  });
  await lead(restored.page).click();
  await blocked(restored.page);
  const location = restored.page.locator('section[aria-labelledby="s-local"]');
  assert.equal(await location.getByText("-10.916, -37.061", { exact: true }).count(), 1,
    "Both coordinates survive the real reimport");
  await restored.page.locator('#painel [data-acao="fechar"]').click();

  await importCsv(restored.page, csv("false"), "0 importada(s) · 1 duplicada(s)");
  assert.equal(await lead(restored.page).count(), 1, "CSV did not create an unblocked duplicate");
  await lead(restored.page).click();
  await blocked(restored.page);
  await restored.context.close();
  console.log("PASS: 390px, negative coordinates and suppression survive clean CSV reimport and duplicate false");
} finally {
  await browser.close();
}
