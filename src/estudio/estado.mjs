// Estado da tela do Bot Studio. Uma só fonte de verdade para todas as telas; nada aqui fala com rede.
import { conferirFluxo, compararVersoes, copiar } from "./fluxo.mjs";

export const TELAS = [
  { id: "agentes", nome: "Agentes", curto: "Agentes", icone: "agente" },
  { id: "fluxo", nome: "Fluxo", curto: "Fluxo", icone: "fluxo" },
  { id: "oficina", nome: "Oficina", curto: "Oficina", icone: "faisca" },
  { id: "simulador", nome: "Simulador", curto: "Simular", icone: "conversa" },
  { id: "versoes", nome: "Versões", curto: "Versões", icone: "relogio" },
];

// Estados de revisão do rascunho. Só "publicado" existe no motor; os outros são da interface.
export const REVISAO = {
  rascunho: { rotulo: "Rascunho", chip: "rascunho" },
  revisao: { rotulo: "Em revisão", chip: "revisao" },
  correcao: { rotulo: "Precisa de correção", chip: "correcao" },
  aprovado: { rotulo: "Aprovado nesta tela", chip: "aprovado" },
};

export const estado = {
  carregado: false,
  fonte: null,
  espaco: null,              // { negocio, bots, publicada, historico, perfil, cenarios, briefing }
  tela: "agentes",
  rascunho: null,
  revisao: "rascunho",
  checklist: { estrutura: false, lacunas: false, simulei: false },
  selecionado: null,         // passo selecionado no editor
  agente: null,              // agente aberto no detalhe
  vistaFluxo: "mapa",        // mapa | passos (computador)
  resultado: null,           // resultado da oficina (exemplo)
  avaliacao: null,           // saída importada da ponte offline do motor
  simVersao: "rascunho",
  contato: "Ana",
  conversa: null, mensagens: [], entradas: [],
  eventos: [],               // linha do tempo desta sessão
  desfazer: [],
  folha: null,               // folha (gaveta) aberta: { tipo, ... }
};

export const publicada = () => estado.espaco.publicada;
export const problemas = () => conferirFluxo(estado.rascunho);
export const alterado = () => !compararVersoes(publicada(), estado.rascunho).vazio;

export function comoRascunho(doc) { const d = copiar(doc); d.flow.status = "draft"; return d; }

export function registrarEvento(texto, tipo = "edicao") {
  estado.eventos.unshift({ texto, tipo, quando: new Date() });
  estado.eventos = estado.eventos.slice(0, 50);
}

// Troca o rascunho guardando o anterior para desfazer. Qualquer mudança invalida a revisão.
export function mudarRascunho(novo, descricao) {
  estado.desfazer.push(estado.rascunho);
  estado.desfazer = estado.desfazer.slice(-30);
  estado.rascunho = novo;
  const revisada = estado.revisao !== "rascunho";
  if (revisada) { estado.revisao = "rascunho"; estado.checklist = { estrutura: false, lacunas: false, simulei: false }; }
  registrarEvento(descricao);
  reiniciarConversa();
  return { revisaoInvalidada: revisada };
}
export function desfazerUltima() {
  const anterior = estado.desfazer.pop();
  if (!anterior) return false;
  estado.rascunho = anterior;
  registrarEvento("Alteração desfeita");
  reiniciarConversa();
  return true;
}
export function reiniciarConversa() { estado.conversa = null; estado.mensagens = []; estado.entradas = []; }
