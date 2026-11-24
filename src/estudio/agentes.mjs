// Quem trabalha num bot do FlowBot. Dois grupos, com fontes diferentes:
// 1. Personagens do fluxo: a identidade visual dá um personagem a cada família de passo (catalogo.mjs).
//    Eles não são programas separados; representam o que o motor faz em cada passo.
// 2. Agentes da oficina: o pipeline de autoria descrito pelo motor (docs/AI_AUTHORING.md e PR #15/#18
//    do flow-bot). Código, Claude (opcional, desligado aqui) e pessoas.
// Nenhum agente aparece como ativo: não há motor conectado e não há histórico de execução.
import { TIPOS, PAPEIS } from "./catalogo.mjs";

const tiposDo = (papel) => Object.entries(TIPOS).filter(([, t]) => t.papel === papel).map(([id, t]) => ({ id, rotulo: t.rotulo }));

export const PERSONAGENS = [
  {
    id: "recepcionista", ...PAPEIS.recepcionista,
    responsabilidades: ["Recebe a primeira mensagem do cliente", "Envia textos com o nome do contato e fatos do negócio"],
    permissoes: ["Envia mensagens do fluxo publicado", "Não decide caminhos"],
    depende: [], entrega: ["qualificador"],
  },
  {
    id: "qualificador", ...PAPEIS.qualificador,
    responsabilidades: ["Mostra opções e espera a resposta com prazo", "Compara a resposta e escolhe o caminho", "Guarda respostas em variáveis da sessão"],
    permissoes: ["Lê e grava variáveis session.*", "Lê fatos reality.*, sem alterar"],
    depende: ["recepcionista"], entrega: ["passador", "guardiao", "flowbot"],
  },
  {
    id: "guardiao", ...PAPEIS.guardiao,
    responsabilidades: ["Cuida do silêncio do cliente e das opções inválidas", "Limita quantas vezes a conversa volta ao mesmo ponto"],
    permissoes: ["Só segue saídas de erro definidas no fluxo"],
    depende: ["qualificador"], entrega: ["passador", "flowbot"],
  },
  {
    id: "passador", ...PAPEIS.passador,
    responsabilidades: ["Passa a conversa para uma pessoa da equipe, com nota"],
    permissoes: ["Encerra a automação daquela conversa (handed_off)"],
    depende: ["qualificador", "guardiao"], entrega: [],
  },
  {
    id: "flowbot", ...PAPEIS.flowbot,
    responsabilidades: ["Variáveis, esperas de tempo e fim da conversa", "Webhooks, só depois da revisão de segurança"],
    permissoes: ["Webhook só em HTTPS e fora da rede privada (regra do motor)"],
    depende: ["qualificador"], entrega: [],
  },
].map((p) => ({ ...p, ferramentas: tiposDo(p.id) }));

// tipo: "codigo" | "ia" | "pessoa". Permissões conforme docs/AI_AUTHORING.md do motor.
export const AGENTES_DA_OFICINA = [
  { id: "intake", nome: "Intake", tipo: "codigo", funcao: "Limpa o pedido e confere os limites", responsabilidades: ["Briefing até 6.000 caracteres", "Até 2 pedidos por dia"], permissoes: ["Lê o briefing e o perfil do negócio"], depende: [] },
  { id: "arquiteto", nome: "Arquiteto", tipo: "ia", funcao: "Propõe o fluxo, os cenários e as lacunas", responsabilidades: ["Gera JSON declarativo no formato flow-bot/v0", "Lista o que falta decidir"], permissoes: ["Não executa código", "Não publica", "Não fala com clientes"], depende: ["intake"] },
  { id: "validador", nome: "Validador", tipo: "codigo", funcao: "Confere a estrutura no catálogo do motor", responsabilidades: ["Schema, saídas, alcance, ciclos"], permissoes: ["Só lê a proposta"], depende: ["arquiteto"] },
  { id: "guardiao-acoes", nome: "Guardião de ações", tipo: "codigo", funcao: "Barra ações externas sem permissão", responsabilidades: ["Webhooks e URLs livres", "Fatos reality.* inexistentes"], permissoes: ["Pode recusar a proposta"], depende: ["validador"] },
  { id: "simulador", nome: "Simulador", tipo: "codigo", funcao: "Roda os cenários sem canal", responsabilidades: ["Cenários da proposta", "Cenários independentes do operador"], permissoes: ["Não envia mensagens"], depende: ["guardiao-acoes"] },
  { id: "revisor", nome: "Revisor", tipo: "pessoa", funcao: "Lê, simula e aprova", responsabilidades: ["Corrige textos e caminhos duvidosos", "Aprova o hash da proposta"], permissoes: ["Aprovar (ainda não gravado no motor)"], depende: ["simulador"] },
  { id: "publicador", nome: "Publicador", tipo: "pessoa", funcao: "Publica em operação separada", responsabilidades: ["Congela a versão e registra quem aprovou"], permissoes: ["Publicar (desligado nesta fase)"], depende: ["revisor"] },
];

export const ESTADO_DO_AGENTE = {
  codigo: { estado: "desconectado", texto: "Motor não conectado" },
  ia: { estado: "desconectado", texto: "Desligado" },
  pessoa: { estado: "vazio", texto: "Pessoa da equipe" },
  personagem: { estado: "demonstracao", texto: "Só no rascunho de demonstração" },
};
export const NOME_DO_TIPO = { codigo: "Código do motor", ia: "Claude (opcional)", pessoa: "Pessoa" };
