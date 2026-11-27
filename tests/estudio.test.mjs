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

// ── Fase F: contrato da API de autoria (PR #21), fontes, sincronização e cenários ──
import { traduzirResposta, cenariosAprovaveis } from "../src/estudio/contrato.mjs";
import { criarFonteDeDemonstracao } from "../src/estudio/fontes.mjs";
import { criarSincronia, analisarConflito } from "../src/estudio/sincronia.mjs";
import { conferirCenarios } from "../src/estudio/cenarios.mjs";
import { fluxoExtenso } from "../src/estudio/demonstracao.mjs";

test("tradução das respostas da API de autoria", () => {
  assert.equal(traduzirResposta(200, { ok: true, revision: 2, changed: true }).ok, true);
  assert.equal(traduzirResposta(401, { error: "unauthorized" }).estado, "sessao");
  assert.equal(traduzirResposta(403, { error: "forbidden" }).estado, "permissao");
  const c = traduzirResposta(409, { ok: false, error: "revision_conflict", currentRevision: 7 });
  assert.equal(c.estado, "conflito"); assert.equal(c.revisaoAtual, 7);
  assert.equal(traduzirResposta(422, { ok: false, error: "independent_tests_failed", reports: [] }).estado, "validacao");
  assert.equal(traduzirResposta(0, null).estado, "indisponivel");
  assert.equal(traduzirResposta(500, { error: "internal_error" }).estado, "indisponivel");
  assert.equal(cenariosAprovaveis(cenariosDeExemplo), true);
  assert.equal(cenariosAprovaveis({ scenarios: [{ name: "x", steps: [{ say: "oi" }] }] }), false, "sem verificação não aprova");
});

test("prévia de cenários reproduz os relatórios reais do motor", () => {
  const motor = JSON.parse(fixture("saida-ponte-offline.json"));
  const previa = conferirCenarios(propostaDaOficina(), cenariosDeExemplo);
  assert.deepEqual(previa.reports.map((r) => r.passos.map((p) => p.saidas)), motor.reports.map((r) => r.passos.map((p) => p.saidas)));
  const falhou = JSON.parse(fixture("saida-ponte-cenario-falhou.json"));
  const v1 = versaoPublicada(); v1.flow.status = "draft";
  assert.deepEqual(conferirCenarios(v1, cenariosDeExemplo).reports.map((r) => r.ok), falhou.reports.map((r) => r.ok));
});

const relogioManual = () => { let fila = []; return { setTimeout: (f) => { fila.push(f); return fila.length; }, clearTimeout: () => { fila = []; }, rodar: async () => { const f = fila; fila = []; for (const x of f) await x(); } }; };

test("fonte de demonstração: revisão esperada, histórico e aprovação presa à revisão", async () => {
  const fonte = criarFonteDeDemonstracao();
  const r1 = await fonte.obterRascunho();
  assert.equal(r1.dados.revision, 1);
  const doc = structuredClone(r1.dados.document); doc.nodes.find((n) => n.id === "agendar").config.text = "Agende pelo link.";
  const ok = await fonte.salvarRascunho("boas-vindas-menu", 1, doc);
  assert.deepEqual([ok.ok, ok.dados.revision, ok.dados.changed], [true, 2, true]);
  const igual = await fonte.salvarRascunho("boas-vindas-menu", 2, doc);
  assert.equal(igual.dados.changed, false, "mesmo documento não cria revisão");
  const conflito = await fonte.salvarRascunho("boas-vindas-menu", 1, doc);
  assert.deepEqual([conflito.estado, conflito.revisaoAtual], ["conflito", 2]);
  assert.deepEqual((await fonte.historico()).dados.map((h) => h.revision), [2, 1]);
  assert.equal((await fonte.aprovar("x", { revision: 2, confirmation: false, scenarios: cenariosDeExemplo })).codigo, "approval_not_authorized");
  const reprovada = await fonte.aprovar("x", { revision: 2, confirmation: true, scenarios: cenariosDeExemplo });
  assert.equal(reprovada.codigo, "independent_tests_failed", "v1 não tem a opção 4: cenário de horários falha");
  const sem4 = { scenarios: cenariosDeExemplo.scenarios.slice(0, 4) };
  assert.equal((await fonte.aprovar("x", { revision: 2, confirmation: true, scenarios: sem4 })).ok, true);
  assert.equal((await fonte.aprovacaoAtual()).dados.revision, 2);
  doc.nodes.find((n) => n.id === "agendar").config.text = "Agende pelo link da página.";
  await fonte.salvarRascunho("boas-vindas-menu", 2, doc);
  assert.equal((await fonte.aprovacaoAtual()).estado, "vazio", "revisão nova não herda a aprovação");
});

test("sincronia: salva sozinho, junta edições e entra em conflito preservando o local", async () => {
  const relogio = relogioManual();
  const fonte = criarFonteDeDemonstracao({ roteiro: "conflito" });
  const sinc = criarSincronia({ fonte, flowId: "boas-vindas-menu", relogio });
  const doc = await sinc.carregar();
  const meu = structuredClone(doc); meu.nodes.find((n) => n.id === "servicos").config.text = "Meu texto";
  sinc.alterar(meu);
  assert.equal(sinc.estado.estado, "nao-salvo");
  await relogio.rodar();
  assert.equal(sinc.estado.estado, "conflito");
  assert.equal(sinc.estado.conflito.revisaoAtual, 2);
  assert.equal(sinc.estado.conflito.local, meu, "alterações locais preservadas");
  assert.deepEqual(sinc.estado.conflito.analise.sobrepostos, ["servicos"]);
  const final = await sinc.resolver("minhas");
  assert.equal(final, meu);
  assert.equal(sinc.estado.estado, "salvo");
  assert.equal(sinc.estado.base.revision, 3);
});

test("sincronia: sem permissão e sessão expirada param de salvar e mantêm o local", async () => {
  for (const [roteiro, esperado] of [["permissao", "permissao"], ["sessao", "sessao"], ["indisponivel", "indisponivel"]]) {
    const relogio = relogioManual();
    const fonte = criarFonteDeDemonstracao({ roteiro });
    const sinc = criarSincronia({ fonte, flowId: "boas-vindas-menu", relogio });
    if (roteiro !== "indisponivel") {
      const doc = await sinc.carregar();
      const meu = structuredClone(doc); meu.nodes[1].config.text = "x";
      sinc.alterar(meu); await relogio.rodar();
      assert.equal(sinc.estado.estado, esperado, roteiro);
      assert.equal(sinc.estado.local, meu);
    } else {
      assert.equal(await sinc.carregar(), null);
      assert.equal(sinc.estado.estado, "indisponivel");
    }
  }
});

test("fluxo extenso de 59 passos é válido e organizado", () => {
  const d = fluxoExtenso(60);
  assert.deepEqual(conferirFluxo(d), []);
  const o = organizarFluxo(d);
  assert.equal(o.ordem.length, d.nodes.length);
  assert.deepEqual(analisarConflito(d, d, d).sobrepostos, []);
});
