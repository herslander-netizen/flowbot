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

import { inserirPasso, removerPasso, ligar, arvoreDoFluxo, repetirConversa, TIPOS_CRIAVEIS } from "../src/estudio/edicao.mjs";
import { montarEntradaDaPonte, lerSaidaDaPonte } from "../src/estudio/dados.mjs";
import { cenariosDeExemplo, perfilDeExemplo } from "../src/estudio/demonstracao.mjs";

test("inserir passo no meio mantém o caminho e passa na conferência", () => {
  const { doc, id } = inserirPasso(versaoPublicada(), { tipo: "message.text", depoisDe: "ola", porta: "next" });
  assert.equal(id, "texto");
  assert.equal(doc.edges.find((e) => e.from === "ola").to, "texto");
  assert.equal(doc.edges.find((e) => e.from === "texto").to, "menu");
  assert.deepEqual(conferirFluxo(doc), []);
  assert.equal(versaoPublicada().nodes.length, 12, "original intacto");
});

test("todo tipo criável nasce com configuração aceita", () => {
  for (const tipo of TIPOS_CRIAVEIS) {
    const { doc, id } = inserirPasso(versaoPublicada(), { tipo });
    const avisos = conferirFluxo(doc).filter((p) => p.path === id && !["unreachable", "missing_edge"].includes(p.code));
    assert.deepEqual(avisos, [], tipo);
  }
  assert.throws(() => inserirPasso(versaoPublicada(), { tipo: "action.webhook" }), /segurança/);
});

test("excluir passo liga quem chegava ao destino e protege a entrada", () => {
  const { doc } = removerPasso(versaoPublicada(), "ola");
  assert.equal(doc.edges.find((e) => e.from === "inicio").to, "menu");
  assert.deepEqual(conferirFluxo(doc), []);
  assert.throws(() => removerPasso(versaoPublicada(), "inicio"), /entrada/);
  const sem = ligar(versaoPublicada(), "espera", "timeout", null);
  assert.ok(conferirFluxo(sem).some((p) => p.code === "missing_edge" && p.path === "espera"));
});

test("árvore do celular: ramos com nível e retorno como referência", () => {
  const a = arvoreDoFluxo(versaoPublicada());
  assert.equal(a[0].id, "inicio");
  const rota = a.find((i) => i.id === "rota");
  const filhos = a.filter((i) => i.nivel === rota.nivel + 1 && i.via?.startsWith("case:"));
  assert.equal(filhos.length, 3);
  assert.ok(a.some((i) => i.via === "retorno" && i.id === "menu" && i.referencia));
  assert.equal(a.filter((i) => !i.referencia && !i.faltando).length, 12, "cada passo aparece uma vez");
});

test("repetir a mesma conversa nas duas versões mostra a diferença", () => {
  const entradas = [{ tipo: "say", texto: "oi" }, { tipo: "say", texto: "4" }];
  assert.equal(repetirConversa(propostaDaOficina(), entradas).status, "completed");
  assert.equal(repetirConversa(versaoPublicada(), entradas).status, "waiting_input", "na v1 a opção 4 não existe");
});

test("entrada da ponte offline segue o contrato da PR #18", () => {
  const { entrada } = montarEntradaDaPonte({ rascunho: propostaDaOficina(), base: versaoPublicada(), cenarios: cenariosDeExemplo, perfil: perfilDeExemplo });
  assert.deepEqual(Object.keys(entrada).sort(), ["base", "draft", "perfil", "scenarios"]);
  assert.equal(entrada.draft.flow.status, "draft");
  assert.ok(Array.isArray(entrada.scenarios.scenarios));
  assert.ok(montarEntradaDaPonte({ rascunho: versaoPublicada(), cenarios: cenariosDeExemplo }).erro, "publicada não é rascunho");
});

test("saída da ponte: aceita só o formato do motor", () => {
  const ok = lerSaidaDaPonte(JSON.stringify({ ok: true, mode: "offline", approved: false, published: false, problems: [], diff: [{ path: "/nodes/2", before: null, after: 1 }], reports: [{ name: "A", ok: false, passos: [{ entrada: "oi", saidas: ["x"], status: "completed", motivo: "", falhas: ["status: esperado y"] }] }], scenariosPassed: false }));
  assert.equal(ok.valido, true);
  assert.equal(ok.relatorios[0].passos[0].falhas.length, 1);
  assert.equal(ok.diff[0].caminho, "/nodes/2");
  const erro = lerSaidaDaPonte({ ok: false, error: "fluxo_invalido", approved: false, published: false, problems: [{ code: "x", message: "y", path: "z" }] });
  assert.equal(erro.erro, "fluxo_invalido");
  assert.equal(lerSaidaDaPonte({ ok: true, approved: true, published: false, reports: [], scenariosPassed: true }).valido, false, "nunca aceita aprovado");
  assert.equal(lerSaidaDaPonte("{").valido, false);
  assert.equal(lerSaidaDaPonte({ ok: false, error: "inventado", approved: false, published: false }).valido, false);
});

// Saídas reais da ponte offline do motor (flow-bot PR #18, packages/server/bin/studio-offline.mjs),
// geradas a partir da entrada que esta interface monta. Ver tests/fixtures/LEIAME.md.
import { readFileSync } from "node:fs";
const fixture = (n) => readFileSync(new URL("./fixtures/" + n, import.meta.url), "utf8");

test("lê as saídas reais da ponte do motor", () => {
  const ok = lerSaidaDaPonte(fixture("saida-ponte-offline.json"));
  assert.equal(ok.valido, true); assert.equal(ok.cenariosOk, true); assert.equal(ok.relatorios.length, 5);
  const falhou = lerSaidaDaPonte(fixture("saida-ponte-cenario-falhou.json"));
  assert.equal(falhou.cenariosOk, false);
  assert.deepEqual(falhou.relatorios.filter((r) => !r.ok).map((r) => r.nome), ["Cliente pergunta horários"]);
  const invalido = lerSaidaDaPonte(fixture("saida-ponte-fluxo-invalido.json"));
  assert.equal(invalido.erro, "fluxo_invalido");
  assert.ok(invalido.problemas.some((p) => p.nodeId === "espera"));
});
