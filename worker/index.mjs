/**
 * FlowBot Prospecção — API isolada para Cloudflare Workers.
 * O Worker NÃO possui service_role. Autorização final por RLS do Supabase.
 * Este módulo não implementa envios, enriquecimento ou scraping.
 */
import { validarEmpresa, ETAPAS } from "../src/prospecting.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ETAPAS_VALIDAS = new Set(ETAPAS.map((etapa) => etapa.id));
const CORPO_MAXIMO = 16_384;

function json(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...headers,
    },
  });
}

function origemPermitida(request, env) {
  const origem = request.headers.get("origin");
  if (!origem) return true; // A autenticação JWT continua obrigatória.
  const permitidas = String(env.ALLOWED_ORIGINS ?? "")
    .split(",").map((x) => x.trim()).filter(Boolean);
  return permitidas.includes(origem);
}

function cors(request) {
  const origem = request.headers.get("origin");
  return origem
    ? {
        "access-control-allow-origin": origem,
        "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-max-age": "600",
        vary: "Origin",
      }
    : {};
}

async function lerJsonLimitado(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("corpo_vazio");
  const partes = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > CORPO_MAXIMO) throw new Error("corpo_grande_demais");
      partes.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const parte of partes) {
    buffer.set(parte, offset);
    offset += parte.byteLength;
  }
  try {
    const obj = JSON.parse(new TextDecoder().decode(buffer));
    if (!obj || typeof obj !== "object" || Array.isArray(obj))
      throw new Error("json_invalido");
    return obj;
  } catch {
    throw new Error("json_invalido");
  }
}

function workspaceId(valor) {
  if (!UUID.test(String(valor ?? ""))) throw new Error("workspace_invalido");
  return String(valor);
}

function baseUrl(env) {
  const url = new URL(env.SUPABASE_URL);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) {
    throw new Error("supabase_config_invalida");
  }
  if (!env.SUPABASE_PUBLISHABLE_KEY) throw new Error("supabase_config_invalida");
  return url.origin;
}

async function consultarSupabase(env, token, path, options = {}) {
  const endpoint = baseUrl(env);
  const resposta = await fetch(endpoint + path, {
    method: options.method ?? "GET",
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      authorization: "Bearer " + token,
      "content-type": "application/json",
      accept: "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(12_000),
  });
  const raw = await resposta.text();
  let body;
  try { body = raw ? JSON.parse(raw) : null; }
  catch { body = { error: "resposta_invalida" }; }
  return { status: resposta.status, ok: resposta.ok, data: body };
}

async function verificarUsuario(env, request) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer ([A-Za-z0-9_\-\.]+)$/i);
  if (!match) return null;
  const token = match[1];
  // Auth verifica assinatura/expiração. Não confiar em claims vindos do cliente.
  const r = await consultarSupabase(env, token, "/auth/v1/user");
  if (!r.ok || !r.data?.id || !UUID.test(r.data.id)) return null;
  return token;
}

function parametros(uri, ws) {
  const p = new URLSearchParams(uri.search);
  const tabela = new URLSearchParams();
  tabela.set("workspace_id", "eq." + ws);
  tabela.set("select",
    "id,workspace_id,name,city,uf,category,cnpj,website,latitude,longitude,stage,suppressed,source_type,notes,created_at,updated_at");
  tabela.set("order", "created_at.desc");
  tabela.set("limit", String(Math.min(Math.max(Number(p.get("limit")) || 50, 1), 100)));
  const etapa = p.get("stage");
  if (etapa && ETAPAS_VALIDAS.has(etapa)) tabela.set("stage", "eq." + etapa);
  return tabela.toString();
}

function corpoProspect(payload) {
  const item = validarEmpresa(payload);
  return {
    name: item.nome,
    city: item.cidade || null,
    uf: item.uf || null,
    category: item.categoria || null,
    cnpj: item.cnpj || null,
    website: item.site || null,
    latitude: item.latitude,
    longitude: item.longitude,
    stage: item.etapa,
    source_type: item.origem === "csv_fornecido_pelo_usuario" ? "csv" : "manual",
    notes: item.nota,
    suppressed: false, // O cliente não pode declarar opt-in ou remover bloqueios.
  };
}

function respostaSupabase(r, headers) {
  // Erros de autorização não revelam detalhes internos/SQL a quem requisitou.
  if (r.status === 401) return json(401, { erro: "nao_autenticado" }, headers);
  if (r.status === 403) return json(403, { erro: "sem_permissao" }, headers);
  if (r.status === 409) return json(409, { erro: "empresa_duplicada_ou_conflito" }, headers);
  if (!r.ok) return json(502, { erro: "falha_ao_salvar" }, headers);
  return json(r.status === 204 ? 200 : r.status, { data: r.data }, headers);
}

export async function handleApi(request, env) {
  const headers = origemPermitida(request, env) ? cors(request) : {};
  if (!origemPermitida(request, env)) {
    return json(403, { erro: "origem_nao_permitida" }, headers);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return json(503, { erro: "backend_nao_configurado" }, headers);
  }
  try {
    const token = await verificarUsuario(env, request);
    if (!token) return json(401, { erro: "nao_autenticado" }, headers);

    const uri = new URL(request.url);
    const pathname = uri.pathname;

    if (pathname === "/api/v1/workspaces" && request.method === "GET") {
      const r = await consultarSupabase(env, token,
        "/rest/v1/flowbot_workspaces?select=id,name,created_at&order=created_at.desc&limit=50");
      return respostaSupabase(r, headers);
    }

    if (pathname === "/api/v1/prospects" && request.method === "GET") {
      const ws = workspaceId(uri.searchParams.get("workspaceId"));
      const r = await consultarSupabase(env, token,
        "/rest/v1/flowbot_prospects?" + parametros(uri, ws));
      return respostaSupabase(r, headers);
    }

    if (pathname === "/api/v1/prospects" && request.method === "POST") {
      const payload = await lerJsonLimitado(request);
      const ws = workspaceId(payload.workspaceId);
      if (!payload.prospect || typeof payload.prospect !== "object")
        return json(400, { erro: "prospect_invalido" }, headers);
      const body = { ...corpoProspect(payload.prospect), workspace_id: ws };
      const r = await consultarSupabase(env, token,
        "/rest/v1/flowbot_prospects?select=id,name,workspace_id,created_at",
        { method: "POST", body, prefer: "return=representation" });
      return respostaSupabase(r, headers);
    }

    const match = pathname.match(/^\/api\/v1\/prospects\/([0-9a-f-]{36})$/i);
    if (match && request.method === "PATCH") {
      if (!UUID.test(match[1])) return json(400, { erro: "id_invalido" }, headers);
      const payload = await lerJsonLimitado(request);
      const ws = workspaceId(payload.workspaceId);
      const body = {};
      if (payload.stage !== undefined) {
        if (!ETAPAS_VALIDAS.has(payload.stage))
          return json(400, { erro: "etapa_invalida" }, headers);
        body.stage = payload.stage;
      }
      if (payload.notes !== undefined) {
        if (typeof payload.notes !== "string" || payload.notes.length > 1000)
          return json(400, { erro: "notas_invalidas" }, headers);
        body.notes = payload.notes;
      }
      if (payload.suppressed === true) body.suppressed = true;
      if (payload.suppressed === false)
        return json(403, { erro: "bloqueio_irreversivel_nesta_versao" }, headers);
      if (!Object.keys(body).length) return json(400, { erro: "sem_alteracoes" }, headers);
      const query = new URLSearchParams({
        workspace_id: "eq." + ws,
        id: "eq." + match[1],
        select: "id,stage,notes,suppressed",
      });
      const r = await consultarSupabase(env, token,
        "/rest/v1/flowbot_prospects?" + query.toString(),
        { method: "PATCH", body, prefer: "return=representation" });
      if (r.ok && Array.isArray(r.data) && r.data.length === 0)
        return json(404, { erro: "nao_encontrado" }, headers);
      return respostaSupabase(r, headers);
    }

    return json(404, { erro: "rota_nao_encontrada" }, headers);
  } catch (erro) {
    if (erro.message === "corpo_grande_demais")
      return json(413, { erro: "corpo_grande_demais" }, headers);
    if (["workspace_invalido","json_invalido","corpo_vazio"].includes(erro.message))
      return json(400, { erro: erro.message }, headers);
    // Erros de entrada do domínio são públicos, nunca logs com tokens/dados.
    if (/^(CNPJ|Coordenadas|Informe o nome|Sites e fontes)/.test(erro.message))
      return json(400, { erro: "empresa_invalida" }, headers);
    return json(503, { erro: "servico_indisponivel" }, headers);
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/"))
      return handleApi(request, env);
    if (env.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return json(404, { erro: "pagina_nao_encontrada" });
  },
};
