// Estado da tela do Bot Studio. Uma só fonte de verdade para todas as telas; nada aqui fala com rede
// (a fonte e a sincronia cuidam disso).
import { conferirFluxo, compararVersoes, copiar } from "./fluxo.mjs";

export const TELAS = [
  { id: "agentes", nome: "Agentes", curto: "Agentes", icone: "agente" },
  { id: "fluxo", nome: "Fluxo", curto: "Fluxo", icone: "fluxo" },
  { id: "oficina", nome: "Oficina", curto: "Oficina", icone: "faisca" },
  { id: "simulador", nome: "Simulador", curto: "Simular", icone: "conversa" },
  { id: "versoes", nome: "Versões", curto: "Versões", icone: "relogio" },
];

// Estados de revisão humana. "aprovado" vem da fonte (aprovação presa à revisão salva);
// "revisao" e "correcao" são marcações desta tela, porque o motor não guarda pedido de correção.
export const REVISAO = {
  rascunho: { rotulo: "Rascunho", chip: "rascunho" },
  revisao: { rotulo: "Em revisão", chip: "revisao" },
  correcao: { rotulo: "Precisa de correção", chip: "correcao" },
  aprovado: { rotulo: "Aprovado", chip: "aprovado" },
};

export const estado = {
  carregado: false,
  fonte: null,
  sinc: null,                // criarSincronia(): base, estado de salvamento, conflito
  espaco: null,              // { negocio, bots, publicada, perfil, cenarios, briefing }
  tela: "agentes",
  rascunho: null,
  marcacao: "rascunho",      // rascunho | revisao | correcao (só nesta tela)
  aprovacao: null,           // aprovação atual vinda da fonte (ou null)
  ultimaAprovada: null,      // revisão da última aprovação conhecida, para mostrar invalidação
  aprovando: false,
  relatorioAprovacao: null,  // relatórios devolvidos quando a aprovação falha
  checklist: { estrutura: false, lacunas: false, simulei: false },
  selecionado: null,
  vistaFluxo: "mapa",
  busca: "",
  resultado: null,           // proposta da oficina (exemplo)
  execucaoLocal: null,       // cenários rodados na prévia do navegador
  oficinaAba: "pedido",      // celular: pedido | proposta | revisao
  avaliacao: null,           // saída importada da ponte offline do motor
  revisoes: null,            // histórico da fonte
  comparar: null,            // { a, b, diff } entre revisões
  simVersao: "rascunho",
  mostrarEtapas: false,
  contato: "Ana",
  conversa: null, mensagens: [], entradas: [], comparacao: null,
  eventos: [],
  desfazer: [], refazer: [],
  folha: null,
};

export const publicada = () => estado.espaco.publicada;
export const problemas = () => conferirFluxo(estado.rascunho);
export const alterado = () => !compararVersoes(publicada(), estado.rascunho).vazio;
export const revisaoAtual = () => estado.sinc?.estado.base?.revision ?? null;

// Estado de revisão que a tela mostra: aprovado só se a aprovação da fonte é desta revisão salva.
export function estadoDeRevisao() {
  const s = estado.sinc?.estado;
  if (estado.aprovacao && s?.estado === "salvo" && estado.aprovacao.revision === s.base?.revision) return "aprovado";
  return estado.marcacao;
}
export const aprovacaoInvalidada = () => estado.ultimaAprovada !== null && estadoDeRevisao() !== "aprovado" && revisaoAtual() !== estado.ultimaAprovada;

export function comoRascunho(doc) { const d = copiar(doc); d.flow.status = "draft"; return d; }

export function registrarEvento(texto, tipo = "edicao") {
  estado.eventos.unshift({ texto, tipo, quando: new Date() });
  estado.eventos = estado.eventos.slice(0, 50);
}

// Troca o rascunho guardando o anterior para desfazer. A sincronia salva sozinha depois.
export function mudarRascunho(novo, descricao) {
  estado.desfazer.push(estado.rascunho);
  estado.desfazer = estado.desfazer.slice(-50);
  estado.refazer = [];
  return aplicar(novo, descricao);
}
function aplicar(novo, descricao) {
  const tinhaAprovacao = estadoDeRevisao() === "aprovado" || estado.marcacao !== "rascunho";
  estado.rascunho = novo;
  if (estado.marcacao !== "rascunho") { estado.marcacao = "rascunho"; estado.checklist = { estrutura: false, lacunas: false, simulei: false }; }
  if (descricao) registrarEvento(descricao);
  reiniciarConversa();
  estado.sinc?.alterar(novo);
  return { revisaoInvalidada: tinhaAprovacao };
}
export function desfazerUltima() {
  const anterior = estado.desfazer.pop(); if (!anterior) return false;
  estado.refazer.push(estado.rascunho);
  aplicar(anterior, "Alteração desfeita");
  return true;
}
export function refazerUltima() {
  const proximo = estado.refazer.pop(); if (!proximo) return false;
  estado.desfazer.push(estado.rascunho);
  aplicar(proximo, "Alteração refeita");
  return true;
}
export function reiniciarConversa() { estado.conversa = null; estado.mensagens = []; estado.entradas = []; estado.comparacao = null; }

// Posição de navegação desta aba (tela, rolagem por tela, passo selecionado, vista) para voltar onde estava.
const CHAVE = "flowbot-estudio-posicao";
export function lembrarPosicao(rolagens) {
  try { sessionStorage.setItem(CHAVE, JSON.stringify({ selecionado: estado.selecionado, vistaFluxo: estado.vistaFluxo, simVersao: estado.simVersao, mostrarEtapas: estado.mostrarEtapas, oficinaAba: estado.oficinaAba, rolagens })); } catch { /* sem armazenamento */ }
}
export function lerPosicao() { try { return JSON.parse(sessionStorage.getItem(CHAVE) ?? "null"); } catch { return null; } }
