-- Cloudflare D1 (Pages Functions): somente dados comerciais públicos e limites do serviço.
-- Aplicar apenas ao banco isolado do FlowBot, após configurar o binding CEP_SEARCH_DB.
CREATE TABLE IF NOT EXISTS cep_search_cache (
  cache_key TEXT PRIMARY KEY,
  expires_at_ms INTEGER NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cep_search_gates (
  name TEXT PRIMARY KEY,
  next_at_ms INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO cep_search_gates(name, next_at_ms) VALUES ('search', 0);
INSERT OR IGNORE INTO cep_search_gates(name, next_at_ms) VALUES ('nominatim', 0);
CREATE TABLE IF NOT EXISTS cep_search_daily (
  day_utc TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0 CHECK(requests >= 0)
);
CREATE INDEX IF NOT EXISTS cep_search_cache_expires ON cep_search_cache(expires_at_ms);
