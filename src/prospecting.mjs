// Camada de domínio sem dependências externas; nunca envia mensagens.
// As cores seguem os tokens --stage-* de assets/tokens.css (tema escuro).
export const ETAPAS = Object.freeze([
  { id: "pesquisado", nome: "Pesquisado", cor: "#8C8882" },
  { id: "lead", nome: "Lead", cor: "#60A5FA" },
  { id: "qualificado", nome: "Qualificado", cor: "#A78BFA" },
  { id: "proposta", nome: "Proposta", cor: "#FBBF24" },
  { id: "negociacao", nome: "Negociação", cor: "#F472B6" },
  { id: "ganho", nome: "Ganho", cor: "#34D399" },
  { id: "perdido", nome: "Perdido", cor: "#C07A74" },
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

const ETAPAS_AVANCADAS = ["qualificado", "proposta", "negociacao", "ganho"];

// Cada critério da pontuação, na mesma regra usada pela soma. A interface mostra esta lista.
export function explicarPontuacao(lead) {
  return [
    { id: "site", rotulo: "Site comercial com endereço válido", pontos: 20,
      atendido: Boolean(lead.site && /^https?:\/\//i.test(lead.site)) },
    { id: "cidade", rotulo: "Cidade informada", pontos: 10, atendido: Boolean(lead.cidade) },
    { id: "segmento", rotulo: "Segmento informado", pontos: 10, atendido: Boolean(lead.categoria) },
    { id: "evidencia", rotulo: "Fato público com URL de fonte", pontos: 35,
      atendido: Boolean(lead.fato && lead.fonteFato && /^https?:\/\//i.test(lead.fonteFato)) },
    { id: "etapa", rotulo: "Etapa a partir de Qualificado", pontos: 25,
      atendido: ETAPAS_AVANCADAS.includes(lead.etapa) },
  ];
}

export function pontuacao(lead) {
  const pontos = explicarPontuacao(lead).reduce((soma, c) => soma + (c.atendido ? c.pontos : 0), 0);
  return Math.min(100, pontos);
}

// Indicadores calculados só a partir dos registros recebidos; nada é estimado.
export function resumoFunil(leads) {
  const total = leads.length;
  const porEtapa = ETAPAS.map((etapa) => {
    const quantidade = leads.filter((l) => l.etapa === etapa.id).length;
    return { ...etapa, quantidade, percentual: total ? quantidade / total : 0 };
  });
  const conta = (id) => porEtapa.find((e) => e.id === id).quantidade;
  const encerrados = conta("ganho") + conta("perdido");
  return {
    total,
    porEtapa,
    emAndamento: ["lead", "qualificado", "proposta", "negociacao"].reduce((s, id) => s + conta(id), 0),
    ganhos: conta("ganho"),
    perdidos: conta("perdido"),
    taxaGanho: encerrados ? conta("ganho") / encerrados : null,
    naoContatar: leads.filter((l) => l.suprimido).length,
    comCoordenadas: leads.filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude)).length,
    demonstracao: leads.filter((l) => l.origem === "exemplo_ficticio").length,
  };
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
    suprimido: dados.suprimido === true,
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
  suprimido: ["suprimido"],
};

export function importarCsv(texto, existentes = []) {
  const [cabecalho, ...linhas] = lerCsv(texto);
  const posicoes = {};
  for (const [campo, nomes] of Object.entries(CAMPOS)) {
    posicoes[campo] = cabecalho.findIndex((valor) => nomes.includes(normalizar(valor)));
  }
  if (posicoes.nome === -1) throw new Error("CSV precisa da coluna 'empresa' ou 'nome'.");
  const chaves = new Map(existentes.map(lead => [chaveEmpresa(lead), lead]));
  const suprimirIds = new Set();
  const adicionados = []; const erros = []; let duplicados = 0;
  for (const [i, linha] of linhas.entries()) {
    const dados = {};
    for (const campo of Object.keys(CAMPOS)) {
      dados[campo] = posicoes[campo] === -1 ? "" : (linha[posicoes[campo]] ?? "");
    }
    try {
      const supressao = dados.suprimido.trim().toLowerCase();
      if (supressao !== "" && supressao !== "true" && supressao !== "false") {
        throw new Error("A coluna suprimido aceita apenas true, false ou vazio.");
      }
      const lead = validarEmpresa({ ...dados, suprimido: supressao === "true", origem: "csv_fornecido_pelo_usuario" });
      const chave = chaveEmpresa(lead);
      const anterior = chaves.get(chave);
      if (anterior) {
        if (lead.suprimido && !anterior.suprimido) suprimirIds.add(anterior.id);
        duplicados++; continue;
      }
      chaves.set(chave, lead); adicionados.push(lead);
    } catch (erro) {
      erros.push("Linha " + (i + 2) + ": " + erro.message);
    }
  }
  return { adicionados: adicionados.map(lead => suprimirIds.has(lead.id) ? { ...lead, suprimido: true } : lead),
    duplicados, erros, suprimirIds: [...suprimirIds] };
}

// Nunca afirma ter verificado informação que não tem URL de fonte.
export function podePrepararAbordagem(lead) {
  return lead != null && (lead.suprimido === false || lead.suprimido === undefined);
}

export function criarRascunho(lead, remetente = "nossa equipe") {
  if (!podePrepararAbordagem(lead)) throw new Error("Empresa marcada: não contatar.");
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