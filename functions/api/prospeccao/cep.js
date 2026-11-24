// Cloudflare Pages Function: servidor same-origin, desligado até binding D1 e gate explícito.
import { CepErro, consultarEmpresasCep, validarBuscaCep } from "../../../server/cep-lookup.mjs";

function reply(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

async function claim(db, name, delayMs) {
  const now = Date.now();
  const granted = await db.prepare(
    "UPDATE cep_search_gates SET next_at_ms = ? WHERE name = ? AND next_at_ms <= ? RETURNING name",
  ).bind(now + delayMs, name, now).first();
  return Boolean(granted);
}

async function claimGeocoding(db) {
  // D1 serializa a condição; a cota é global, não só por browser/instância.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await claim(db, "nominatim", 1250)) return;
    await new Promise((resolve) => setTimeout(resolve, 1300));
  }
  throw new CepErro("nominatim_limitado", 429, "Pesquisa geográfica ocupada. Tente novamente mais tarde.");
}

export async function onRequestGet({ request, env }) {
  // Sem servidor de autorização persistente ainda, esta rota fica desativada por padrão.
  if (env?.CEP_SEARCH_ENABLED !== "1" || !env?.CEP_SEARCH_DB)
    return reply(503, {
      erro: "cep_nao_configurado",
      mensagem: "A busca por CEP precisa ser configurada no servidor desta prévia.",
    });
  try {
    const db = env.CEP_SEARCH_DB;
    const input = validarBuscaCep(Object.fromEntries(new URL(request.url).searchParams));
    const key = input.cep + ":" + input.raio + ":" + input.segmento;
    const now = Date.now();
    const cached = await db.prepare(
      "SELECT payload FROM cep_search_cache WHERE cache_key = ? AND expires_at_ms > ?",
    ).bind(key, now).first();
    if (cached && typeof cached.payload === "string") {
      const data = JSON.parse(cached.payload);
      return reply(200, data);
    }
    // Pesquisa pública: um pedido não cacheado por 3 segundos, no máximo 50/dia.
    if (!(await claim(db, "search", 3000)))
      throw new CepErro("frequencia_limitada", 429, "Há outra consulta em andamento. Tente novamente em alguns segundos.");
    const day = new Date().toISOString().slice(0, 10);
    const counter = await db.prepare(
      "INSERT INTO cep_search_daily(day_utc, requests) VALUES (?, 1) " +
      "ON CONFLICT(day_utc) DO UPDATE SET requests = requests + 1 " +
      "WHERE requests < 50 RETURNING requests",
    ).bind(day).first();
    if (!counter)
      throw new CepErro("cota_diaria", 429, "Limite diário gratuito de buscas atingido.");
    const data = await consultarEmpresasCep(input, {
      fetchFn: fetch,
      beforeGeocode: () => claimGeocoding(db),
    });
    // Cache público: CEP e dados de estabelecimentos, sem contatos pessoais.
    await db.prepare(
      "INSERT INTO cep_search_cache(cache_key, expires_at_ms, payload) VALUES (?, ?, ?) " +
      "ON CONFLICT(cache_key) DO UPDATE SET expires_at_ms = excluded.expires_at_ms, payload = excluded.payload",
    ).bind(key, Date.now() + 10 * 60_000, JSON.stringify(data)).run();
    return reply(200, data);
  } catch (error) {
    if (error instanceof CepErro)
      return reply(error.status, { erro: error.codigo, mensagem: error.message });
    return reply(503, { erro: "servidor_indisponivel", mensagem: "Busca indisponível nesta instalação." });
  }
}
