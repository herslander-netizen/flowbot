// Camada de domínio sem dependências externas; nunca envia mensagens.
export const ETAPAS = Object.freeze([
  { id: "pesquisado", nome: "Pesquisado", cor: "#9299aa" },
  { id: "lead", nome: "Lead", cor: "#f4bd65" },
  { id: "qualificado", nome: "Qualificado", cor: "#a994ff" },
  { id: "proposta", nome: "Proposta", cor: "#82b6ff" },
  { id: "negociacao", nome: "Negociação", cor: "#f27e85" },
  { id: "ganho", nome: "Ganho", cor: "#51cfa0" },
  { id: "perdido", nome: "Perdido", cor: "#666b77" },
]);

export function normalizar(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function chaveEmpresa(lead) {
  const cnpj = String(lead.cnpj ?? "").replace(/\D/g, "");
  if (cnpj.length === 14) return "cnpj:" + cnpj;
  return "nome:" + normalizar(lead.nome) + "|" + normalizar(lead.cidade) +
    "|" + normalizar(lead.uf);
}

export function pontuacao(lead) {
  let pontos = 0;
  if (lead.site && /^https?:\/\//i.test(lead.site)) pontos += 20;
  if (lead.cidade) pontos += 10;
  if (lead.categoria) pontos += 10;
  if (lead.fato && lead.fonteFato && /^https?:\/\//i.test(lead.fonteFato)) pontos += 35;
  if (lead.etapa === "qualificado" || lead.etapa === "proposta" ||
    lead.etapa === "negociacao" || lead.etapa === "ganho") pontos += 25;
  return Math.min(100, pontos);
}

function criarId() {
  return globalThis.crypto?.randomUUID?.() ??
    "local-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function validarEmpresa(dados) {
  const nome = String(dados.nome ?? "").trim().slice(0, 140);
  if (nome.length < 2) throw new Error("Informe o nome da empresa (mínimo 2 caracteres).");
  const cnpj = String(dados.cnpj ?? "").replace(/\D/g, "");
  if (cnpj && cnpj.length !== 14) throw new Error("CNPJ deve ter 14 dígitos.");
  const latitude = dados.latitude === "" || dados.latitude == null ?
    null : Number(dados.latitude);
  const longitude = dados.longitude === "" || dados.longitude == null ?
    null : Number(dados.longitude);
  if ((latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
    (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180))) {
    throw new Error("Coordenadas fora do intervalo permitido.");
  }
  const site = String(dados.site ?? "").trim().slice(0, 300);
  const fonteFato = String(dados.fonteFato ?? "").trim().slice(0, 300);
  for (const url of [site, fonteFato]) {
    if (url && !/^https?:\/\/[^/\s]+/i.test(url))
      throw new Error("Sites e fontes precisam usar endereço HTTP(S) válido.");
  }
  return {
    id: dados.id || criarId(),
    nome,
    cidade: String(dados.cidade ?? "").trim().slice(0, 100),
    uf: String(dados.uf ?? "").trim().toUpperCase().slice(0, 2),
    categoria: String(dados.categoria ?? "").trim().slice(0, 80),
    cnpj,
    site,
    latitude,
    longitude,
    fato: String(dados.fato ?? "").trim().slice(0, 300),
    fonteFato,
    origem: String(dados.origem ?? "cadastro_manual").slice(0, 100),
    etapa: ETAPAS.some((etapa) => etapa.id === dados.etapa) ? dados.etapa : "pesquisado",
    suprimido: Boolean(dados.suprimido),
    optInWhatsapp: Boolean(dados.optInWhatsapp),
    nota: String(dados.nota ?? "").slice(0, 1000),
    criadoEm: dados.criadoEm || new Date().toISOString(),
  };
}

// Parser CSV conforme RFC 4180, com aspas e quebras de linha dentro de células.
// Não executa fórmulas e não lê endereços/telefones privados.
export function lerCsv(texto) {
  if (typeof texto !== "string" || texto.length > 1_000_000)
    throw new Error("Arquivo CSV inválido ou acima de 1 MB.");
  const conteudo = texto.replace(/^\uFEFF/, "");
  const primeiraLinha = conteudo.split(/\r?\n/, 1)[0] ?? "";
  const separador = (primeiraLinha.match(/;/g) ?? []).length >
    (primeiraLinha.match(/,/g) ?? []).length ? ";" : ",";
  const linhas = []; let linha = []; let campo = ""; let aspas = false;
  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (c === '"') {
      if (aspas && conteudo[i + 1] === '"') { campo += '"'; i++; }
      else aspas = !aspas;
    } else if (c === separador && !aspas) {
      linha.push(campo); campo = "";
    } else if ((c === "\n" || c === "\r") && !aspas) {
      if (c === "\r" && conteudo[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((valor) => valor.trim())) linhas.push(linha);
      linha = [];
    } else {
      campo += c;
    }
  }
  if (aspas) throw new Error("CSV possui aspas sem fechamento.");
  linha.push(campo);
  if (linha.some((valor) => valor.trim())) linhas.push(linha);
  if (linhas.length < 2) throw new Error("CSV precisa de cabeçalho e ao menos uma empresa.");
  if (linhas.length > 501) throw new Error("Importe até 500 empresas por arquivo.");
  return linhas;
}

const CAMPOS = {
  nome: ["empresa", "nome", "nome empresa", "razao social", "estabelecimento"],
  cidade: ["cidade", "municipio"],
  uf: ["uf", "estado"],
  categoria: ["categoria", "segmento", "ramo", "setor"],
  cnpj: ["cnpj"],
  site: ["site", "website", "url"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "lon"],
  fato: ["fato", "evidencia", "observacao publica"],
  fonteFato: ["fonte fato", "url fonte", "fonte evidencia"],
};

export function importarCsv(texto, existentes = []) {
  const [cabecalho, ...linhas] = lerCsv(texto);
  const posicoes = {};
  for (const [campo, nomes] of Object.entries(CAMPOS)) {
    posicoes[campo] = cabecalho.findIndex((valor) => nomes.includes(normalizar(valor)));
  }
  if (posicoes.nome === -1) throw new Error("CSV precisa da coluna 'empresa' ou 'nome'.");
  const chaves = new Set(existentes.map(chaveEmpresa));
  const adicionados = []; const erros = []; let duplicados = 0;
  for (const [i, linha] of linhas.entries()) {
    const dados = {};
    for (const campo of Object.keys(CAMPOS)) {
      dados[campo] = posicoes[campo] === -1 ? "" : (linha[posicoes[campo]] ?? "");
    }
    try {
      const lead = validarEmpresa({ ...dados, origem: "csv_fornecido_pelo_usuario" });
      const chave = chaveEmpresa(lead);
      if (chaves.has(chave)) { duplicados++; continue; }
      chaves.add(chave); adicionados.push(lead);
    } catch (erro) {
      erros.push("Linha " + (i + 2) + ": " + erro.message);
    }
  }
  return { adicionados, duplicados, erros };
}

// Nunca afirma ter verificado informação que não tem URL de fonte.
export function criarRascunho(lead, remetente = "nossa equipe") {
  const empresa = String(lead.nome ?? "").trim();
  if (!empresa) throw new Error("Lead sem empresa.");
  const equipe = String(remetente ?? "").trim().slice(0, 100) || "nossa equipe";
  let texto = "Olá! Sou da " + equipe + ". Vi o perfil comercial da " + empresa;
  if (lead.cidade) texto += " em " + lead.cidade;
  texto += ".";
  if (lead.fato?.trim() && /^https?:\/\//i.test(lead.fonteFato ?? "")) {
    texto += "\n\nUma informação publicada pela empresa chamou nossa atenção: " +
      lead.fato.trim() + "\nFonte para conferir: " + lead.fonteFato;
  }
  texto += "\n\nPosso apresentar uma ideia breve que talvez faça sentido para vocês?" +
    "\n\nSe preferir não receber novos contatos, é só nos avisar.";
  return texto;
}

function celulaCsv(valor) {
  let s = String(valor ?? "");
  // Evita fórmulas executáveis ao abrir a exportação no Excel/Sheets.
  if (/^\s*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function exportarCsv(leads) {
  const colunas = ["nome", "cidade", "uf", "categoria", "cnpj", "site", "latitude",
    "longitude", "etapa", "suprimido", "origem"];
  return "\uFEFF" + colunas.join(";") + "\r\n" + leads.map((lead) =>
    colunas.map((campo) => celulaCsv(lead[campo])).join(";")).join("\r\n");
}

export function dadosDeDemonstracao() {
  return [
    { nome: "Barbearia Horizonte", cidade: "Aracaju", uf: "SE", categoria: "Barbearia",
      latitude: -10.916, longitude: -37.061, etapa: "lead",
      origem: "exemplo_ficticio", nota: "Empresa fictícia para testar a interface." },
    { nome: "Studio Aurora", cidade: "Aracaju", uf: "SE", categoria: "Beleza",
      latitude: -10.937, longitude: -37.044, etapa: "qualificado",
      origem: "exemplo_ficticio" },
    { nome: "Ateliê Encanto", cidade: "Barra dos Coqueiros", uf: "SE",
      categoria: "Comércio", latitude: -10.902, longitude: -37.032,
      etapa: "pesquisado", origem: "exemplo_ficticio" },
    { nome: "Café Farol", cidade: "Aracaju", uf: "SE", categoria: "Alimentação",
      latitude: -10.962, longitude: -37.054, etapa: "proposta",
      origem: "exemplo_ficticio" },
    { nome: "Oficina Nova Era", cidade: "Aracaju", uf: "SE", categoria: "Automotivo",
      latitude: -10.906, longitude: -37.077, etapa: "negociacao",
      origem: "exemplo_ficticio" },
    { nome: "Casa Verde", cidade: "São Cristóvão", uf: "SE", categoria: "Varejo",
      latitude: -11.015, longitude: -37.207, etapa: "ganho",
      origem: "exemplo_ficticio" },
  ].map(validarEmpresa);
}