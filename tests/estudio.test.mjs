import { test } from "node:test";
import assert from "node:assert/strict";
import { conferirFluxo, organizarFluxo, iniciarConversa, responder, esgotarPrazo, compararVersoes } from "../src/estudio/fluxo.mjs";
import { portasDoNo, nomeDaPorta, TIPOS } from "../src/estudio/catalogo.mjs";
import { versaoPublicada, propostaDaOficina, resultadoDeExemplo } from "../src/estudio/demonstracao.mjs";

test("fluxo de exemplo e proposta passam na conferência", () => {
  assert.deepEqual(conferirFluxo(versaoPublicada()), []);
  assert.deepEqual(conferirFluxo(propostaDaOficina()), []);
});

test("conferência aponta saída sem ligação, passo solto e opção longa", () => {
  const d = versaoPublicada();
  d.edges = d.edges.filter((e) => e.id !== "e5");
  d.nodes.push({ id: "solto", type: "message.text", config: { text: "oi" } });
  d.nodes.find((n) => n.id === "menu").config.options[0].label = "x".repeat(61);
  const codigos = conferirFluxo(d).map((p) => p.code + ":" + p.path);
  assert.ok(codigos.includes("missing_edge:espera"));
  assert.ok(codigos.includes("unreachable:solto"));
  assert.ok(codigos.includes("label_too_long:menu"));
});

test("portas dinâmicas do switch e nomes em português", () => {
  const rota = versaoPublicada().nodes.find((n) => n.id === "rota");
  assert.deepEqual(portasDoNo(rota).map((p) => p.nome), ["default", "case:1", "case:2", "case:3"]);
  assert.equal(nomeDaPorta("case:2"), "opção 2");
  assert.equal(nomeDaPorta("timeout"), "sem resposta");
  assert.equal(Object.keys(TIPOS).length, 16, "mesmos 16 tipos do catálogo do motor");
});

test("prévia reproduz os cenários do exemplo do motor", () => {
  const d = versaoPublicada();
  let s = iniciarConversa({ firstName: "Ana" });
  const r1 = responder(d, s, "oi");
  assert.equal(r1[0].texto, "Olá, Ana! Como podemos ajudar?");
  assert.equal(r1[1].opcoes.length, 3);
  assert.equal(s.status, "waiting_input");
  assert.equal(s.cursor, "espera");
  assert.equal(responder(d, s, "2")[0].texto, "Nossos serviços estão na página, com preços.");
  assert.equal(s.status, "completed");
  assert.equal(s.variaveis["session.escolha"], "2");

  s = iniciarConversa(); responder(d, s, "bom dia"); responder(d, s, "3");
  assert.equal(s.status, "handed_off");

  s = iniciarConversa(); responder(d, s, "oi");
  assert.match(responder(d, s, "banana").map((m) => m.texto).join(" "), /Não reconheci.*Escolha uma opção:/);
  responder(d, s, "laranja");
  assert.equal(s.status, "waiting_input");
  responder(d, s, "uva");
  assert.equal(s.status, "handed_off", "terceira resposta inválida vai para a equipe");

  s = iniciarConversa(); responder(d, s, "oi");
  assert.equal(esgotarPrazo(d, s)[0].texto, "Quando quiser, é só escrever de novo.");
  assert.equal(s.status, "completed");
});

test("diferença entre versão publicada e proposta", () => {
  const diff = compararVersoes(versaoPublicada(), propostaDaOficina());
  assert.deepEqual(diff.adicionados, ["horarios"]);
  assert.deepEqual(diff.removidos, []);
  assert.deepEqual(diff.alterados.map((a) => a.id).sort(), ["menu", "nao-entendi", "rota", "servicos"]);
  assert.ok(diff.ligacoes.some((l) => l.saida === "rota→case:4" && l.depois === "horarios"));
  assert.equal(compararVersoes(versaoPublicada(), versaoPublicada()).vazio, true);
});

test("colunas partem da entrada e todo passo tem lugar", () => {
  const d = propostaDaOficina();
  const o = organizarFluxo(d);
  assert.equal(o.coluna.get("inicio"), 0);
  assert.equal(o.ordem.length, d.nodes.length);
  assert.ok(o.coluna.get("rota") > o.coluna.get("espera"));
});

test("resultado de exemplo nunca vem aprovado nem publicado", () => {
  const r = resultadoDeExemplo();
  assert.equal(r.approved, false);
  assert.equal(r.published, false);
  assert.ok(r.gaps.length <= 20);
});
