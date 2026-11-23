import test from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "../worker/index.mjs";

const USUARIO = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_A = "22222222-2222-4222-8222-222222222222";
const WORKSPACE_B = "33333333-3333-4333-8333-333333333333";
const LEAD = "44444444-4444-4444-8444-444444444444";
const env = {
  SUPABASE_URL: "https://flowbot-exemplo.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example_only",
  ALLOWED_ORIGINS: "https://flowbot.example",
};
const headers = {
  authorization: "Bearer teste.jwt.token",
  origin: "https://flowbot.example",
};

async function comFetchFalso(handler, fn) {
  const anterior = globalThis.fetch;
  globalThis.fetch = handler;
  try { await fn(); }
  finally { globalThis.fetch = anterior; }
}
function auth(url) {
  if (String(url).endsWith("/auth/v1/user"))
    return new Response(JSON.stringify({ id: USUARIO }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  return null;
}
function request(path, method = "GET", body) {
  return new Request("https://flowbot.example" + path, {
    method, headers: {
      ...headers,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function resposta(res) { return { status: res.status, body: await res.json() }; }

test("nega origem CORS desconhecida sem encaminhar para Supabase", async () => {
  await comFetchFalso(() => { throw new Error("não deve chamar"); }, async () => {
    const res = await handleApi(new Request("https://flowbot.example/api/v1/workspaces", {
      headers: { ...headers, origin: "https://origem-inesperada.example" },
    }), env);
    assert.equal(res.status, 403);
  });
});

test("sem autenticação, API não acessa dados", async () => {
  await comFetchFalso(() => { throw new Error("não deve chamar"); }, async () => {
    const res = await handleApi(new Request("https://flowbot.example/api/v1/workspaces", {
      headers: { origin: headers.origin },
    }), env);
    assert.equal(res.status, 401);
  });
});

test("lista de empresas encaminha JWT verificado e filtro por workspace para RLS", async () => {
  const pedidos = [];
  await comFetchFalso(async (url, options) => {
    pedidos.push({ url: String(url), headers: options?.headers });
    const a = auth(url);
    return a ?? new Response(JSON.stringify([{ id: LEAD, workspace_id: WORKSPACE_A }]), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }, async () => {
    const x = await resposta(await handleApi(request(
      "/api/v1/prospects?workspaceId=" + WORKSPACE_A + "&limit=999&stage=lead",
    ), env));
    assert.equal(x.status, 200);
    assert.equal(x.body.data[0].workspace_id, WORKSPACE_A);
  });
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[1].url, /limit=100/);
  assert.equal(new URL(pedidos[1].url).searchParams.get("workspace_id"), "eq." + WORKSPACE_A);
  assert.equal(pedidos[1].headers.authorization, headers.authorization);
  assert.equal(pedidos[1].headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
  assert.equal(JSON.stringify(pedidos).includes("service_role"), false);
});

test("POST ignora workspace_id do lead e opt-in alegados pelo cliente", async () => {
  let gravado;
  await comFetchFalso(async (url, options) => {
    if (auth(url)) return auth(url);
    gravado = JSON.parse(options.body);
    return new Response(JSON.stringify([{ id: LEAD }]), { status: 201 });
  }, async () => {
    const x = await resposta(await handleApi(request("/api/v1/prospects", "POST", {
      workspaceId: WORKSPACE_A,
      prospect: {
        nome: "Studio Exemplo", cidade: "Aracaju", uf: "SE",
        workspace_id: WORKSPACE_B,
        optInWhatsapp: true,
        suprimido: true,
        origem: "exemplo_ficticio",
      },
    }), env));
    assert.equal(x.status, 201);
  });
  assert.equal(gravado.workspace_id, WORKSPACE_A);
  assert.equal(gravado.source_type, "manual");
  assert.equal(gravado.suppressed, false);
  assert.equal("optInWhatsapp" in gravado, false);
});

test("não permite retirar supressão", async () => {
  await comFetchFalso(async (url) => auth(url) ?? new Response("[]", { status: 200 }),
    async () => {
      const x = await resposta(await handleApi(request(
        "/api/v1/prospects/" + LEAD, "PATCH", {
          workspaceId: WORKSPACE_A, suppressed: false,
        },
      ), env));
      assert.equal(x.status, 403);
      assert.equal(x.body.erro, "bloqueio_irreversivel_nesta_versao");
    });
});

test("não permite operação outbound nem endpoints de disparo", async () => {
  await comFetchFalso(async (url) => auth(url) ?? new Response("[]", { status: 200 }),
    async () => {
      const x = await resposta(await handleApi(request("/api/v1/send", "POST", {
        workspaceId: WORKSPACE_A, telefone: "5582999990000",
      }), env));
      assert.equal(x.status, 404);
    });
});

test("tratamento de erro de RLS não revela existência de empresa de outro workspace", async () => {
  await comFetchFalso(async (url) => auth(url) ??
    new Response(JSON.stringify({ code: "42501", message: "RLS forbidden" }),
      { status: 403 }), async () => {
    const x = await resposta(await handleApi(request("/api/v1/prospects", "POST", {
      workspaceId: WORKSPACE_B, prospect: { nome: "Outra empresa" },
    }), env));
    assert.equal(x.status, 403);
    assert.deepEqual(x.body, { erro: "sem_permissao" });
  });
});

test("código aplica limites e falha fechada quando não configurado", async () => {
  const x = await resposta(await handleApi(new Request("https://flowbot.example/api/v1/prospects?workspaceId=ruim", {headers: {authorization: headers.authorization}}), {}));
  assert.equal(x.status, 503);
  await comFetchFalso(async (url) => auth(url) ?? new Response("[]", { status: 200 }),
    async () => {
      const y = await resposta(await handleApi(request("/api/v1/prospects?workspaceId=ruim"), env));
      assert.equal(y.status, 400);
    });
});

test("nenhum token, senha ou detalhes internos são retornados em falhas de rede", async () => {
  await comFetchFalso(async () => { throw new Error("segredo_sensivel_do_servidor"); },
    async () => {
      const res = await handleApi(request("/api/v1/workspaces"), env);
      assert.equal(res.status, 503);
      assert.equal((await res.text()).includes("segredo_sensivel"), false);
    });
});
