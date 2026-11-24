import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("conexão mostra os dois métodos sem inventar estados, QR ou códigos", () => {
  const page = read("../whatsapp.html");
  assert.match(page, /<h1>Conexão WhatsApp<\/h1>/);
  assert.match(page, /<h3 id="wa-qr">QR Code<\/h3>/);
  assert.match(page, /<h3 id="wa-code">Código de pareamento<\/h3>/);
  assert.match(page, /Não verificado aqui/);
  assert.match(page, /Indisponível nesta prévia/);
  assert.match(page, /não use número de produção/i);
  assert.match(page, /sem gerar um QR ou iniciar o pareamento/);
  assert.match(page, /Consultar painel Evolution Alvo/);
  assert.doesNotMatch(page, /<(script|iframe|img|form|input|button)\b/i);
  assert.deepEqual([...page.matchAll(/href="(https?:[^"]+)"/g)].map(m => m[1]),
    ["https://evolution-alvo.regalbrink4.chatgpt.site"]);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
});

test("com navegação desktop e celular para a tela local", () => {
  const app = read("../src/app.mjs");
  assert.match(app, /class="nav-item" href="\.\/whatsapp\.html"/);
  assert.match(app, /class="menu__item" role="menuitem" href="\.\/whatsapp\.html"/);
});
