import test from "node:test";
import assert from "node:assert/strict";

import {
  CepErro, validarBuscaCep, distanciaMetros, converterEmpresasOSM,
  consultarEmpresasCep, queryOverpass,
} from "../server/cep-lookup.mjs";
import { onRequestGet } from "../functions/api/prospeccao/cep.js";

function simularAPIs({ viacep = { logradouro: "Rua Teste", bairro: "Centro", localidade: "Aracaju", uf: "SE" },
  geocoding = [{ lat: "-10.900000", lon: "-37.050000" }], osm = null, status = 200 } = {}) {
  const requests = [];
  const elements = osm ?? [
    { type: "node", id: 123, lat: -10.9001, lon: -37.0501, tags: { name: "Mercado das Flores", shop: "supermarket", website: "https://exemplo.test" } },
    { type: "way", id: 456, center: { lat: -10.9002, lon: -37.0502 }, tags: { name: "Café Azul", amenity: "cafe" } },
    { type: "node", id: 123, lat: -10.9001, lon: -37.0501, tags: { name: "Mercado das Flores", shop: "supermarket" } },
    { type: "node", id: 789, lat: -11.1, lon: -37.1, tags: { name: "Longe do CEP", shop: "supermarket" } },
    { type: "node", id: 42, lat: -10.9001, lon: -37.0501, tags: { name: "Loja maliciosa", shop: "books", website: "javascript:alert(1)" } },
    { type: "node", id: 43, lat: -10.9001, lon: -37.0501, tags: { name: "Loja fechada", shop: "vacant" } },
  ];
  const fetchFn = async (url, options) => {
    requests.push({ url: String(url), method: options?.method });
    if (String(url).includes("viacep.com.br")) return new Response(JSON.stringify(viacep), { status: 200 });
    if (String(url).includes("nominatim.openstreetmap.org")) return new Response(JSON.stringify(geocoding), { status: 200 });
    if (String(url).includes("overpass-api.de")) return new Response(JSON.stringify({ elements }), { status });
    throw new Error("URL externa não esperada");
  };
  return { fetchFn, requests };
}

test("validação estrita impede raio excessivo, CEP inválido e segmentação arbitrária", () => {
  assert.deepEqual(validarBuscaCep({ cep: "49000-000", raio: "1000", segmento: "todos" }),
    { cep: "49000000", raio: 1000, segmento: "todos" });
  assert.throws(() => validarBuscaCep({ cep: "123" }), (e) => e instanceof CepErro && e.status === 400);
  assert.throws(() => validarBuscaCep({ cep: "49000000", raio: "100000" }), /Raio inválido/);
  assert.throws(() => validarBuscaCep({ cep: "49000000", segmento: "javascript:..." }), /Segmento inválido/);
});

test("a busca consulta ViaCEP, Nominatim e Overpass; não coleta telefone ou WhatsApp", async () => {
  const api = simularAPIs();
  let gate = 0;
  const res = await consultarEmpresasCep({ cep: "49000-000", raio: 500, segmento: "todos" },
    { fetchFn: api.fetchFn, beforeGeocode: async () => { gate++; } });
  assert.equal(gate, 1);
  assert.equal(api.requests.length, 3);
  assert.match(api.requests[0].url, /viacep\.com\.br/);
  assert.match(api.requests[1].url, /nominatim\.openstreetmap\.org/);
  assert.equal(api.requests[2].method, "POST");
  assert.equal(res.cep, "49000000");
  assert.equal(res.empresas.length, 3);
  assert.equal(res.empresas[0].fonte, "https://www.openstreetmap.org/node/123");
  assert.ok(res.empresas.every((e) => e.distanciaMetros <= 500));
  assert.ok(res.empresas.every((e) => !("phone" in e) && !("whatsapp" in e) && !("cnpj" in e)));
  assert.equal(res.empresas.find((e) => e.id === "node/42").site, "");
});

test("filtro geográfico aplica categoria e distância à lista, sem duplicatas", async () => {
  const api = simularAPIs();
  const res = await consultarEmpresasCep({ cep: "49000000", raio: 1000, segmento: "alimentacao" },
    { fetchFn: api.fetchFn });
  assert.deepEqual(res.empresas.map((x) => x.nome), ["Café Azul"]);
  assert.match(queryOverpass({ lat: -10.9, lon: -37.05 }, 1000), /around:1000/);
  assert.equal(distanciaMetros({ lat: -10.9, lon: -37.05 }, { lat: -10.9, lon: -37.05 }), 0);
  assert.equal(converterEmpresasOSM([], { lat: 0, lon: 0 }, { raio: 500, segmento: "todos", cidade: "X", uf: "SE" }).length, 0);
});

test("fallback BrasilAPI preserva endereço e prospecção sem dados pessoais", async () => {
  const requests = [];
  const fetchFn = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("viacep.com.br")) throw new Error("ViaCEP inacessível no edge");
    if (String(url).includes("brasilapi.com.br")) {
      return new Response(JSON.stringify({
        cep: "01001000", street: "Praça da Sé", neighborhood: "Sé",
        city: "São Paulo", state: "SP",
      }), { status: 200 });
    }
    if (String(url).includes("nominatim.openstreetmap.org")) {
      return new Response(JSON.stringify([{ lat: "-23.55", lon: "-46.63" }]));
    }
    if (String(url).includes("overpass-api.de")) {
      return new Response(JSON.stringify({ elements: [{
        type: "node", id: 98123, lat: -23.5501, lon: -46.6301,
        tags: { name: "Loja Pública", shop: "convenience" },
      }] }));
    }
    throw new Error("Fonte inesperada");
  };
  const result = await consultarEmpresasCep({ cep: "01001000", raio: 500 },
    { fetchFn });
  assert.equal(result.empresas.length, 1);
  assert.match(result.endereco, /São Paulo/);
  assert.equal(result.empresas[0].fonte, "https://www.openstreetmap.org/node/98123");
  assert.ok(requests.some((r) => r.url.includes("brasilapi.com.br")));
  assert.equal(requests[0].options.redirect, "follow");
  assert.equal(requests[0].options.headers["user-agent"], undefined);
  assert.ok(requests.some((r) => r.url.includes("nominatim.openstreetmap.org") &&
    r.options.headers["user-agent"].includes("FlowBot")));
  assert.ok(result.empresas.every((item) => !("whatsapp" in item) && !("telefone" in item)));
});

test("fontes públicas indisponíveis devolvem erro explícito e não consultam geolocalização", async () => {
  const visited = [];
  const fetchFn = async (url) => {
    visited.push(String(url));
    throw new Error("provider down");
  };
  await assert.rejects(
    () => consultarEmpresasCep({ cep: "01001000" }, { fetchFn }),
    (e) => e instanceof CepErro && e.codigo === "cep_fontes_indisponiveis" && e.status === 503,
  );
  assert.equal(visited.length, 3);
  assert.ok(visited.every((url) => !url.includes("nominatim")));
});

test("CEP inexistente não aciona serviços geográficos", async () => {
  const api = simularAPIs({ viacep: { erro: true } });
  await assert.rejects(
    () => consultarEmpresasCep({ cep: "99999-999" }, { fetchFn: api.fetchFn }),
    (e) => e instanceof CepErro && e.status === 404 && e.codigo === "cep_nao_encontrado",
  );
  assert.equal(api.requests.length, 1);
});

test("sem geocodificação de logradouro, usa município e sinaliza imprecisão", async () => {
  let count = 0, gate = 0;
  const api = simularAPIs();
  const mock = async (url, options) => {
    if (String(url).includes("nominatim.openstreetmap.org")) {
      count++;
      return new Response(JSON.stringify(count === 1 ? [] : [{ lat: "-10.9", lon: "-37.05" }]));
    }
    return api.fetchFn(url, options);
  };
  const result = await consultarEmpresasCep({ cep: "49000000" },
    { fetchFn: mock, beforeGeocode: async () => { gate++; } });
  assert.equal(gate, 2);
  assert.equal(result.centro.precisao, "municipio");
  assert.match(result.observacao, /município/);
});

test("falha do Nominatim é distinta de ausência de empresas", async () => {
  const api = simularAPIs();
  const fetchFn = async (url, options) => {
    if (String(url).includes("nominatim.openstreetmap.org")) throw new Error("blocked");
    return api.fetchFn(url, options);
  };
  await assert.rejects(
    () => consultarEmpresasCep({ cep: "49000000" }, { fetchFn }),
    (error) => error instanceof CepErro && error.codigo === "fonte_indisponivel_nominatim",
  );
});

test("falha do Overpass não é registrada como zero empresas", async () => {
  const api = simularAPIs();
  const fetchFn = async (url, options) => {
    if (String(url).includes("overpass-api.de")) throw new Error("blocked");
    return api.fetchFn(url, options);
  };
  await assert.rejects(
    () => consultarEmpresasCep({ cep: "49000000" }, { fetchFn }),
    (error) => error instanceof CepErro && error.codigo === "fonte_indisponivel_overpass",
  );
});

test("limite 429 do Overpass se propaga e não aparece como resultado vazio", async () => {
  const api = simularAPIs({ status: 429 });
  await assert.rejects(
    () => consultarEmpresasCep({ cep: "49000000" }, { fetchFn: api.fetchFn }),
    (e) => e instanceof CepErro && e.codigo === "fonte_limitada" && e.status === 429,
  );
});

test("Cloudflare Pages recusa a busca sem D1 e liberação explícita", async () => {
  const req = new Request("https://app.example/api/prospeccao/cep?cep=49000000");
  const res = await onRequestGet({ request: req, env: {} });
  assert.equal(res.status, 503);
  assert.deepEqual((await res.json()).erro, "cep_nao_configurado");
});
