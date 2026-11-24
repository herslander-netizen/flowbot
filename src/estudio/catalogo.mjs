// Catálogo de nós do Bot Studio. Espelha o catálogo do motor (flow-bot, packages/contracts/src/catalog.ts,
// formato `flow-bot/v0`) só para desenhar a interface: tipos, portas e limites de texto. O motor continua
// sendo a única fonte do que existe e é ele quem valida de verdade.

export const VERSAO_DO_FORMATO = "flow-bot/v0";

// Personagem da identidade visual que representa cada família de passo (docs/identidade/agentes.md):
// Recepcionista abre a conversa, Qualificador pergunta e ramifica, Passador passa para a equipe,
// Guardião segura o erro. O resto (variáveis, tempo, webhooks) fica com o FlowBot.
export const PAPEIS = {
  recepcionista: { nome: "Recepcionista", trabalho: "Abre a conversa e fala com o cliente", cor: "var(--agent-recepcionista)" },
  qualificador: { nome: "Qualificador", trabalho: "Pergunta, espera a resposta e ramifica", cor: "var(--agent-qualificador)" },
  passador: { nome: "Passador", trabalho: "Passa a conversa para a equipe", cor: "var(--agent-passador)" },
  guardiao: { nome: "Guardião", trabalho: "Segura o erro: sem resposta, opção inválida, falha", cor: "var(--agent-guardiao)" },
  flowbot: { nome: "FlowBot", trabalho: "Variáveis, tempo, integrações e fim", cor: "var(--agent-flowbot)" },
};

const p = (nome, obrigatoria = true) => ({ nome, obrigatoria });

export const TIPOS = {
  "trigger.message_received": { rotulo: "Mensagem recebida", papel: "recepcionista", portas: [p("next")], gatilho: true },
  "trigger.keyword": { rotulo: "Palavra-chave", papel: "recepcionista", portas: [p("next")], gatilho: true },
  "message.text": { rotulo: "Texto", papel: "recepcionista", portas: [p("next")] },
  "message.quick_replies": { rotulo: "Opções de resposta", papel: "qualificador", portas: [p("next")] },
  "logic.condition": { rotulo: "Condição", papel: "qualificador", portas: [p("true"), p("false")] },
  "logic.switch": { rotulo: "Escolha", papel: "qualificador", portas: [p("default")], dinamicas: (c) => (c.cases ?? []).map((v) => p("case:" + v, false)) },
  "logic.match": { rotulo: "Correspondência", papel: "qualificador", portas: [p("matched"), p("no_match")] },
  "logic.random": { rotulo: "Sorteio", papel: "qualificador", portas: [], dinamicas: (c) => (c.weights ?? []).map((_, i) => p("branch:" + i)) },
  "logic.goto": { rotulo: "Voltar para", papel: "guardiao", portas: [p("exhausted")] },
  "state.wait_for_reply": { rotulo: "Esperar resposta", papel: "qualificador", portas: [p("reply"), p("timeout")], suspende: true },
  "data.capture": { rotulo: "Capturar dado", papel: "qualificador", portas: [p("valid"), p("invalid")] },
  "data.set_variable": { rotulo: "Definir variável", papel: "flowbot", portas: [p("next")] },
  "time.delay": { rotulo: "Aguardar", papel: "flowbot", portas: [p("next")], suspende: true },
  "action.webhook": { rotulo: "Webhook", papel: "flowbot", portas: [p("success"), p("failure")] },
  "action.handoff": { rotulo: "Passar para a equipe", papel: "passador", portas: [], terminal: true },
  "action.end": { rotulo: "Encerrar", papel: "flowbot", portas: [], terminal: true },
};

// Nomes das portas em português para a interface. O valor gravado continua o do motor.
const NOMES_DE_PORTA = {
  next: "depois", true: "sim", false: "não", default: "outra resposta", matched: "corresponde",
  no_match: "não corresponde", exhausted: "esgotou", reply: "respondeu", timeout: "sem resposta",
  valid: "válido", invalid: "inválido", success: "sucesso", failure: "falha",
};
export function nomeDaPorta(porta) {
  if (porta.startsWith("case:")) return "opção " + porta.slice(5);
  if (porta.startsWith("branch:")) return "ramo " + (Number(porta.slice(7)) + 1);
  return NOMES_DE_PORTA[porta] ?? porta;
}
// Portas que levam ao Guardião: o caminho do erro.
export const PORTAS_DE_ERRO = new Set(["default", "no_match", "exhausted", "timeout", "invalid", "failure", "false"]);

export function portasDoNo(no) {
  const tipo = TIPOS[no.type];
  if (!tipo) return [];
  return [...tipo.portas, ...(tipo.dinamicas?.(no.config ?? {}) ?? [])];
}

// Limites copiados do schema do motor (os que a interface deixa editar).
export const LIMITES = {
  texto: 4096,
  opcoes: { min: 1, max: 10 },
  rotuloDaOpcao: 60,
  valorDaOpcao: 40,
  briefing: 6000,
  cenarios: 12,
  passosPorCenario: 15,
  lacunas: 20,
};

// Resumo de uma linha do que o passo faz, para listas e cartões.
export function resumoDoNo(no) {
  const c = no.config ?? {};
  switch (no.type) {
    case "message.text": return c.text ?? "";
    case "message.quick_replies": return (c.prompt ?? "") + " " + (c.options ?? []).map((o) => "[" + o.value + "] " + o.label).join(" · ");
    case "state.wait_for_reply": return "Até " + duracao(c.timeoutSeconds) + (c.saveAs ? " · guarda em " + c.saveAs : "");
    case "logic.switch": return "Compara " + c.variable + " com " + (c.cases ?? []).join(", ");
    case "logic.condition": return c.variable + " " + c.operator + (c.value !== undefined ? " " + c.value : "");
    case "logic.goto": return "Volta para “" + c.target + "” até " + c.maxVisits + " vez(es)";
    case "action.handoff": return c.note ? "Nota para a equipe: " + c.note : "Sem nota";
    case "time.delay": return "Espera " + duracao(c.seconds);
    case "data.set_variable": return c.variable + " = " + c.value;
    case "data.capture": return "Guarda " + c.kind + " em " + c.variable;
    case "action.webhook": return c.method + " " + c.url;
    case "trigger.keyword": return "Quando a mensagem " + (c.match?.mode ?? "") + " " + (c.match?.values ?? []).join(", ");
    case "trigger.message_received": return "Qualquer mensagem do cliente";
    case "action.end": return "Conversa concluída";
    default: return "";
  }
}

export function duracao(segundos) {
  if (!Number.isFinite(segundos)) return "—";
  if (segundos < 60) return segundos + " s";
  if (segundos < 3600) return Math.round(segundos / 60) + " min";
  return Math.round(segundos / 3600) + " h";
}
