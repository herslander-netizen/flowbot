// Fontes: ViaCEP (endereço), Nominatim (coordenada aproximada), Overpass (OSM).
// Nunca consulta telefones ou envia mensagens.
export class CepErro extends Error {
  constructor(codigo, status, mensagem) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
  }
}
export function validarBuscaCep(params) {
  const cep = String(params.cep ?? "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) throw new CepErro("cep_invalido", 400, "Informe um CEP com 8 dígitos.");
  const raio = Number(params.raio ?? 1000);
  if (![500, 1000, 3000, 5000].includes(raio)) throw new CepErro("raio_invalido", 400, "Raio inválido.");
  const segmento = String(params.segmento ?? "todos");
  if (!["todos", "comercio", "alimentacao", "servicos", "beleza", "saude", "hospedagem"].includes(segmento))
    throw new CepErro("segmento_invalido", 400, "Segmento inválido.");
  return { cep, raio, segmento };
}
function origemDaFonte(url) {
  if (url.startsWith("https://nominatim.openstreetmap.org/")) return "nominatim";
  if (url.startsWith("https://overpass-api.de/")) return "overpass";
  if (url.startsWith("https://overpass.private.coffee/")) return "overpass_fallback";
  if (url.startsWith("https://viacep.com.br/")) return "viacep";
  if (url.startsWith("https://brasilapi.com.br/")) return "brasilapi";
  if (url.startsWith("https://opencep.com/")) return "opencep";
  return "desconhecida";
}
async function obterJSON(url, { fetchFn, method = "GET", body, timeout = 15000 }) {
  let response;
  try {
    const trustedCepSource = /^https:\/\/(?:viacep\.com\.br|brasilapi\.com\.br|opencep\.com)\//.test(url);
    response = await fetchFn(url, {
      method, redirect: trustedCepSource ? "follow" : "error", signal: AbortSignal.timeout(timeout),
      headers: {
        accept: "application/json",
        ...(!trustedCepSource ? {
          "user-agent": "FlowBot-Prospeccao/0.1 (https://github.com/herslander-netizen/flowbot)",
          referer: "https://github.com/herslander-netizen/flowbot",
        } : {}),
        ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
      ...(body ? { body } : {}),
    });
  } catch {
    throw new CepErro("fonte_indisponivel_" + origemDaFonte(url), 503, "Serviço público indisponível no momento.");
  }
  if (response.status === 429) throw new CepErro("fonte_limitada", 429, "Limite da fonte pública. Tente mais tarde.");
  if (!response.ok) throw new CepErro("fonte_indisponivel_" + origemDaFonte(url), 503, "Fonte pública indisponível no momento.");
  try { return await response.json(); }
  catch { throw new CepErro("resposta_invalida", 502, "Dados inválidos na fonte pública."); }
}
function coordenada(p) {
  if (p?.lat == null || p?.lon == null || p.lat === "" || p.lon === "") return null;
  const lat = Number(p.lat), lon = Number(p.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
export function distanciaMetros(a, b) {
  const dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
function classificar(tags) {
  const shop = String(tags.shop ?? ""), amenity = String(tags.amenity ?? "");
  const craft = String(tags.craft ?? ""), office = String(tags.office ?? "");
  const tourism = String(tags.tourism ?? "");
  if (["restaurant", "cafe", "fast_food", "bar", "pub", "food_court"].includes(amenity))
    return ["alimentacao", "Alimentação"];
  if (["hairdresser", "beauty", "cosmetics", "massage", "tattoo"].includes(shop) ||
    ["hairdresser", "beauty", "massage"].includes(craft)) return ["beleza", "Beleza"];
  if (["hospital", "clinic", "doctors", "dentist", "pharmacy", "veterinary"].includes(amenity) ||
    ["chemist", "medical_supply"].includes(shop)) return ["saude", "Saúde"];
  if (["hotel", "hostel", "guest_house", "motel"].includes(tourism)) return ["hospedagem", "Hospedagem"];
  if (shop && !["no", "vacant"].includes(shop)) return ["comercio", "Comércio"];
  if (office || craft || amenity) return ["servicos", "Serviços"];
  return null;
}
export function converterEmpresasOSM(items, centro, { raio, segmento, cidade, uf }) {
  if (!Array.isArray(items)) return [];
  const ids = new Set(), results = [];
  for (const x of items.slice(0, 400)) {
    if (!["node", "way", "relation"].includes(x?.type) ||
      !Number.isSafeInteger(x.id) || x.id <= 0) continue;
    const tags = x.tags ?? {};
    if (typeof tags.name !== "string" || tags.name.trim().length < 2 ||
      tags.name.length > 140 || tags.disused === "yes" || tags.abandoned === "yes" ||
      tags.shop === "vacant") continue;
    const pos = coordenada(x.type === "node" ? x : x.center);
    if (!pos) continue;
    const d = distanciaMetros(centro, pos);
    if (d > raio) continue;
    const classe = classificar(tags);
    if (!classe || (segmento !== "todos" && segmento !== classe[0])) continue;
    const id = x.type + "/" + x.id;
    if (ids.has(id)) continue;
    ids.add(id);
    const website = tags.website ?? tags["contact:website"];
    const site = typeof website === "string" && /^https?:\/\/[^/\s]+/i.test(website)
      ? website.slice(0, 300) : "";
    results.push({
      id, nome: tags.name.trim(), categoria: classe[1], cidade, uf,
      latitude: pos.lat, longitude: pos.lon, distanciaMetros: d, site,
      fonte: "https://www.openstreetmap.org/" + id,
    });
  }
  return results.sort((a, b) => a.distanciaMetros - b.distanciaMetros).slice(0, 60);
}
export function queryOverpass(centro, raio) {
  const a = centro.lat.toFixed(6), b = centro.lon.toFixed(6);
  const around = "(around:" + raio + "," + a + "," + b + ")";
  return "[out:json][timeout:20];(" +
    ["shop", "amenity", "craft", "office", "tourism"]
      .map((tag) => 'nwr["' + tag + '"]["name"]' + around + ";").join("") +
    ");out center 120;";
}
/** beforeGeocode deve aplicar cota Nominatim global de <= 1 solicitação/s. */
export async function consultarEmpresasCep(input, { fetchFn = fetch, beforeGeocode = async () => {} } = {}) {
  const { cep, raio, segmento } = validarBuscaCep(input);
  // Fontes alternativas reduzem falhas temporárias no edge sem aumentar
  // o escopo dos dados: somente endereço público de CEP, nunca contatos.
  const provedores = [
    { nome: "ViaCEP", url: "https://viacep.com.br/ws/" + cep + "/json/" },
    { nome: "BrasilAPI", url: "https://brasilapi.com.br/api/cep/v1/" + cep },
    { nome: "OpenCEP", url: "https://opencep.com/v1/" + cep },
  ];
  let endereco = null;
  for (const p of provedores) {
    try {
      const item = await obterJSON(p.url, { fetchFn, timeout: 7000 });
      if (item?.erro === true)
        throw new CepErro("cep_nao_encontrado", 404, "CEP não encontrado.");
      const normalizado = p.nome === "BrasilAPI" ? {
        logradouro: item?.street,
        bairro: item?.neighborhood,
        localidade: item?.city,
        uf: item?.state,
      } : item;
      if (normalizado?.localidade && normalizado?.uf) {
        endereco = normalizado;
        break;
      }
    } catch (error) {
      if (error instanceof CepErro && error.codigo === "cep_nao_encontrado") throw error;
      // Não repetir a mesma fonte: pode ter aplicado quota ou respondido parcialmente.
    }
  }
  if (!endereco)
    throw new CepErro("cep_fontes_indisponiveis", 503,
      "As fontes públicas de CEP não responderam. Tente mais tarde.");
  const cidade = String(endereco.localidade).slice(0, 100);
  const uf = String(endereco.uf).toUpperCase().slice(0, 2);
  const rua = String(endereco.logradouro ?? "").trim();
  const address = [rua, endereco.bairro, cidade, uf].filter(Boolean).join(", ");
  const options = [
    [rua, endereco.bairro, cidade, uf, "Brasil"].filter(Boolean).join(", "),
    ...(rua ? [[cidade, uf, "Brasil"].join(", ")] : []),
  ];
  let centro = null, precisao = "logradouro";
  let falhaGeocodificacao = null;
  for (let i = 0; i < options.length; i++) {
    try {
      await beforeGeocode();
      const params = new URLSearchParams({ q: options[i], format: "jsonv2", countrycodes: "br", limit: "1" });
      const geo = await obterJSON("https://nominatim.openstreetmap.org/search?" + params, { fetchFn, timeout: 10000 });
      centro = coordenada(geo?.[0]);
      if (centro) { if (i !== 0 || !rua) precisao = "municipio"; break; }
    } catch (error) {
      // Evitar insistir na mesma fonte indisponível; preferir uma segunda
      // fonte pública de coordenadas obtidas diretamente pelo CEP.
      falhaGeocodificacao = error;
      break;
    }
  }
  if (!centro) {
    try {
      const v2 = await obterJSON("https://brasilapi.com.br/api/cep/v2/" + cep, {
        fetchFn, timeout: 10000,
      });
      const raw = v2?.location?.coordinates;
      const candidate = coordenada({ lat: raw?.latitude, lon: raw?.longitude });
      if (candidate &&
          String(v2?.cep ?? "").replace(/\D/g, "") === cep &&
          String(v2?.state ?? "").toUpperCase() === uf &&
          candidate.lat >= -35 && candidate.lat <= 6 &&
          candidate.lon >= -75 && candidate.lon <= -30) {
        centro = candidate;
        precisao = "cep_aproximado";
      }
    } catch {
      // A falta de coordenadas não autoriza criar um centro fictício.
    }
  }
  if (!centro) {
    if (falhaGeocodificacao instanceof CepErro) throw falhaGeocodificacao;
    throw new CepErro("geocodificacao_inexistente", 422,
      "Nenhuma fonte conseguiu localizar esse CEP no mapa.");
  }
  const overpassBody = "data=" + encodeURIComponent(queryOverpass(centro, raio));
  let osm;
  try {
    osm = await obterJSON("https://overpass-api.de/api/interpreter", {
      fetchFn, method: "POST", body: overpassBody, timeout: 25000,
    });
  } catch (error) {
    // Apenas erros indisponíveis: não contornar HTTP 429 ou bloqueios de quota.
    if (!(error instanceof CepErro) || error.codigo !== "fonte_indisponivel_overpass")
      throw error;
    osm = await obterJSON("https://overpass.private.coffee/api/interpreter", {
      fetchFn, method: "POST", body: overpassBody, timeout: 25000,
    });
  }
  if (!osm || !Array.isArray(osm.elements))
    throw new CepErro("mapa_indisponivel", 502, "Dados do mapa inválidos.");
  return {
    cep, endereco: address, centro: { ...centro, precisao }, raio, segmento,
    empresas: converterEmpresasOSM(osm.elements, centro, { raio, segmento, cidade, uf }),
    observacao: precisao === "municipio"
      ? "Busca aproximada a partir do município, não do endereço exato do CEP."
      : precisao === "cep_aproximado"
        ? "Coordenadas aproximadas do CEP pela BrasilAPI; a posição pode diferir do endereço exato."
        : "Busca aproximada a partir do logradouro; não representa a localização exata de cada imóvel.",
    fonte: "OpenStreetMap / Overpass", consultadoEm: new Date().toISOString(),
  };
}
