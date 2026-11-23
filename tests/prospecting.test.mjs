import test from "node:test";
import assert from "node:assert/strict";

import {
  ETAPAS, validarEmpresa, importarCsv, lerCsv, criarRascunho, pontuacao,
  exportarCsv, chaveEmpresa, dadosDeDemonstracao, explicarPontuacao, resumoFunil
} from "../src/prospecting.mjs";

test("pipeline contém as etapas de negociação e ganho", () => {
  assert.ok(ETAPAS.some((x) => x.id === "ganho"));
  assert.ok(ETAPAS.some((x) => x.id === "negociacao"));
});

test("importa CSV com aspas, ponto-e-vírgula, BOM e português", () => {
  const csv = "\uFEFFempresa;cidade;uf;segmento;cnpj;fato;fonte fato\n" +
    '"Açougue ""Sol""";Aracaju;SE;Varejo;;"Atende no sábado";https://exemplo.com/fonte\n';
  const resultado = importarCsv(csv, []);
  assert.equal(resultado.adicionados.length, 1);
  assert.equal(resultado.adicionados[0].nome, 'Açougue "Sol"');
  assert.equal(resultado.adicionados[0].origem, "csv_fornecido_pelo_usuario");
  assert.equal(resultado.adicionados[0].optInWhatsapp, false);
  assert.equal(resultado.adicionados[0].etapa, "pesquisado");
});

test("deduplica por CNPJ sem cruzar cadastros distintos", () => {
  const exist = [validarEmpresa({ nome: "Empresa 1", cnpj: "12.345.678/0001-90", cidade: "Aracaju" })];
  const csv = "empresa;cidade;cnpj\n" +
    "Outro nome;Recife;12345678000190\n" +
    "Nova;Recife;\n";
  const resultado = importarCsv(csv, exist);
  assert.equal(resultado.duplicados, 1);
  assert.equal(resultado.adicionados.length, 1);
});

test("deduplica nome normalizado + cidade + UF e não mistura cidades", () => {
  const a = validarEmpresa({ nome: "Ateliê Café", cidade: "Aracaju", uf: "SE" });
  const b = validarEmpresa({ nome: "Atelie Cafe", cidade: "Aracaju", uf: "SE" });
  const c = validarEmpresa({ nome: "Atelie Cafe", cidade: "Recife", uf: "PE" });
  assert.equal(chaveEmpresa(a), chaveEmpresa(b));
  assert.notEqual(chaveEmpresa(a), chaveEmpresa(c));
});

test("recusa CSV acima do limite e coordenadas inválidas", () => {
  assert.throws(() => lerCsv("x".repeat(1_000_001)), /1 MB/);
  assert.throws(() => validarEmpresa({ nome: "Lead", latitude: 91 }), /Coordenadas/);
  assert.throws(() => validarEmpresa({ nome: "Lead", site: "javascript:alert(1)" }), /HTTP/);
  assert.throws(() => validarEmpresa({ nome: "Lead", cnpj: "123" }), /14 dígitos/);
});

test("rascunho não inventa fatos sem URL de evidência", () => {
  const lead = validarEmpresa({ nome: "Empresa Exemplo", cidade: "Aracaju",
    fato: "Nota 4,9", fonteFato: "" });
  assert.doesNotMatch(criarRascunho(lead, "Alvo Digital"), /4,9/);
  assert.match(criarRascunho(lead, "Alvo Digital"), /não receber novos contatos/i);
  const comFonte = validarEmpresa({ ...lead, fonteFato: "https://exemplo.org/avaliacoes" });
  assert.match(criarRascunho(comFonte), /Fonte para conferir/);
  assert.match(criarRascunho(comFonte), /4,9/);
});

test("exportação CSV neutraliza fórmula para planilhas", () => {
  const csv = exportarCsv([{ nome: "=HYPERLINK()", cidade: "+1" }]);
  assert.match(csv, /"'=HYPERLINK/);
  assert.match(csv, /"'\+1"/);
});

test("pontuação é determinística e cenário de demonstração é fictício", () => {
  const leads = dadosDeDemonstracao();
  assert.ok(leads.length > 3);
  assert.ok(leads.every((l) => l.origem === "exemplo_ficticio"));
  assert.ok(leads.every((l) => !l.optInWhatsapp));
  assert.ok(leads.every((l) => pontuacao(l) >= 0 && pontuacao(l) <= 100));
});
test("pontuação explicável soma exatamente os critérios atendidos", () => {
  const lead = validarEmpresa({ nome: "Loja", cidade: "Aracaju", site: "https://loja.com",
    fato: "Abre aos domingos", fonteFato: "https://loja.com/horarios", etapa: "proposta" });
  const criterios = explicarPontuacao(lead);
  const soma = criterios.filter((c) => c.atendido).reduce((s, c) => s + c.pontos, 0);
  assert.equal(soma, pontuacao(lead));
  assert.equal(criterios.find((c) => c.id === "segmento").atendido, false);
  for (const l of dadosDeDemonstracao()) {
    assert.equal(explicarPontuacao(l).filter((c) => c.atendido).reduce((s, c) => s + c.pontos, 0), pontuacao(l));
  }
});

test("resumo do funil conta só o que existe e não inventa taxa sem encerrados", () => {
  const vazio = resumoFunil([]);
  assert.equal(vazio.total, 0);
  assert.equal(vazio.taxaGanho, null);
  assert.ok(vazio.porEtapa.every((e) => e.quantidade === 0 && e.percentual === 0));
  const leads = [
    validarEmpresa({ nome: "Alfa", etapa: "ganho", latitude: -10, longitude: -37 }),
    validarEmpresa({ nome: "Beta", etapa: "perdido", suprimido: true }),
    validarEmpresa({ nome: "Gama", etapa: "lead" }),
    validarEmpresa({ nome: "Delta", etapa: "negociacao" }),
  ];
  const r = resumoFunil(leads);
  assert.equal(r.total, 4);
  assert.equal(r.emAndamento, 2);
  assert.equal(r.taxaGanho, 0.5);
  assert.equal(r.naoContatar, 1);
  assert.equal(r.comCoordenadas, 1);
  assert.equal(r.porEtapa.reduce((s, e) => s + e.quantidade, 0), 4);
});
