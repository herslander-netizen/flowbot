// DADOS FICTÍCIOS do Bot Studio. Tudo aqui é exemplo para ver a interface: nenhum negócio, conversa,
// versão ou resultado da oficina é real. A interface marca estas telas com o selo "Demonstração".
//
// O fluxo publicado é o exemplo `examples/boas-vindas-menu.json` do motor (flow-bot), no formato
// `flow-bot/v0`. O rascunho e o resultado da oficina seguem os contratos da PR #15 do motor (em rascunho):
// EntradaDaOficina { briefing, perfil } e ResultadoDaOficina { status, flow, scenarios, gaps, problems,
// tests, usage, approved:false, published:false }.

export const NEGOCIO_FICTICIO = "Estúdio Exemplo";

const base = {
  schemaVersion: "flow-bot/v0",
  flow: { id: "boas-vindas-menu", name: "Boas-vindas e menu", timezone: "America/Sao_Paulo", status: "published", entryNodeId: "inicio" },
  limits: { maxStepsPerEvent: 50 },
  variables: [{ name: "session.escolha", type: "string" }],
  nodes: [
    { id: "inicio", type: "trigger.message_received", config: {} },
    { id: "ola", type: "message.text", config: { text: "Olá, {{contact.firstName}}! Como podemos ajudar?" } },
    { id: "menu", type: "message.quick_replies", config: { prompt: "Escolha uma opção:", options: [
      { value: "1", label: "Agendar" }, { value: "2", label: "Serviços" }, { value: "3", label: "Falar com alguém" }] } },
    { id: "espera", type: "state.wait_for_reply", config: { timeoutSeconds: 300, maxAttempts: 2, saveAs: "session.escolha" } },
    { id: "rota", type: "logic.switch", config: { variable: "session.escolha", cases: ["1", "2", "3"] } },
    { id: "agendar", type: "message.text", config: { text: "Para agendar, use o link da nossa página." } },
    { id: "servicos", type: "message.text", config: { text: "Nossos serviços estão na página, com preços." } },
    { id: "humano", type: "action.handoff", config: { note: "Pediu atendimento" } },
    { id: "nao-entendi", type: "message.text", config: { text: "Não reconheci essa opção. Digite 1, 2 ou 3." } },
    { id: "voltar", type: "logic.goto", config: { target: "menu", maxVisits: 2 } },
    { id: "fim", type: "action.end", config: {} },
    { id: "sem-resposta", type: "message.text", config: { text: "Quando quiser, é só escrever de novo." } },
  ],
  edges: [
    { id: "e1", from: "inicio", to: "ola", port: "next" },
    { id: "e2", from: "ola", to: "menu", port: "next" },
    { id: "e3", from: "menu", to: "espera", port: "next" },
    { id: "e4", from: "espera", to: "rota", port: "reply" },
    { id: "e5", from: "espera", to: "sem-resposta", port: "timeout" },
    { id: "e6", from: "rota", to: "agendar", port: "case:1" },
    { id: "e7", from: "rota", to: "servicos", port: "case:2" },
    { id: "e8", from: "rota", to: "humano", port: "case:3" },
    { id: "e9", from: "rota", to: "nao-entendi", port: "default" },
    { id: "e10", from: "nao-entendi", to: "voltar", port: "next" },
    { id: "e11", from: "voltar", to: "humano", port: "exhausted" },
    { id: "e12", from: "agendar", to: "fim", port: "next" },
    { id: "e13", from: "servicos", to: "fim", port: "next" },
    { id: "e14", from: "sem-resposta", to: "fim", port: "next" },
  ],
};

// Versão 1 publicada (fictícia).
export function versaoPublicada() { return structuredClone(base); }

// Proposta da oficina (fictícia): acrescenta horários e deixa o texto de serviços mais concreto.
export function propostaDaOficina() {
  const d = structuredClone(base);
  d.flow.status = "draft";
  const menu = d.nodes.find((n) => n.id === "menu");
  menu.config.options.splice(2, 0, { value: "4", label: "Horários" });
  d.nodes.find((n) => n.id === "rota").config.cases = ["1", "2", "3", "4"];
  d.nodes.find((n) => n.id === "servicos").config.text = "Fazemos corte, escova e coloração. Os preços estão na nossa página.";
  d.nodes.find((n) => n.id === "nao-entendi").config.text = "Não reconheci essa opção. Toque em um dos botões ou digite o número.";
  d.nodes.push({ id: "horarios", type: "message.text", config: { text: "Atendemos de segunda a sábado, das 9h às 19h." } });
  d.edges.push({ id: "e15", from: "rota", to: "horarios", port: "case:4" }, { id: "e16", from: "horarios", to: "fim", port: "next" });
  return d;
}

export const briefingDeExemplo =
  "Quero que o bot cumprimente o cliente pelo nome, ofereça agendar, ver serviços, saber os horários ou falar com alguém. " +
  "Se o cliente não responder em 5 minutos, encerrar com educação. Nunca confirmar horário sem a equipe.";

// Fatos do negócio que a oficina pode consultar (perfil de realidade, `reality.*`).
export const perfilDeExemplo = [
  { chave: "reality.servicos", valor: "Corte, escova, coloração" },
  { chave: "reality.horario", valor: "Segunda a sábado, 9h às 19h" },
  { chave: "reality.agendamento", valor: "Pelo link da página; a equipe confirma" },
];

export function resultadoDeExemplo() {
  return {
    status: "ready_for_review",
    flow: propostaDaOficina(),
    scenarios: [
      { name: "Cliente escolhe serviços", steps: 2 },
      { name: "Cliente pergunta horários", steps: 2 },
      { name: "Cliente pede atendimento humano", steps: 2 },
      { name: "Respostas inválidas acabam na equipe", steps: 4 },
      { name: "Cliente some e a conversa encerra no prazo", steps: 2 },
    ],
    gaps: [
      "Os preços não estão no perfil do negócio; o bot só aponta para a página.",
      "Não há regra para domingos e feriados.",
    ],
    problems: [],
    tests: [
      { name: "Cliente escolhe serviços", ok: true, failures: [] },
      { name: "Cliente pergunta horários", ok: true, failures: [] },
      { name: "Cliente pede atendimento humano", ok: true, failures: [] },
      { name: "Respostas inválidas acabam na equipe", ok: true, failures: [] },
      { name: "Cliente some e a conversa encerra no prazo", ok: true, failures: [] },
    ],
    independentTests: 4,
    checkedAgainstIndependentTests: true,
    usage: { inputTokens: 5120, outputTokens: 2380 },
    approved: false,
    published: false,
  };
}

// Histórico fictício. No motor só existem "rascunho" (flows.status = draft) e versões publicadas
// (flow_versions). "Pronto para revisão" e "Precisa de revisão" vêm do resultado da oficina;
// "Aprovado" ainda não existe no motor e aqui é só um passo da interface.
export const historicoDeExemplo = [
  { versao: 1, estado: "publicado", quando: "2026-11-02T14:10:00-03:00", autor: "Equipe", nota: "Primeira versão do menu" },
];

export const botsDeExemplo = [
  { id: "boas-vindas-menu", nome: "Boas-vindas e menu", canal: "WhatsApp (Evolution)", publicada: 1, rascunho: true },
  { id: "lembrete-retorno", nome: "Lembrete de retorno", canal: "WhatsApp (Evolution)", publicada: null, rascunho: true },
];
