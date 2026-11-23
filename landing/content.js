// ─── TEXTOS E DADOS DA DEMO ───────────────────────────────────────────────
// Edite este arquivo para mudar todo o conteúdo da landing sem tocar no HTML.

export const site = {
  nome: "FlowBot",
  tagline: "Monte e simule atendimentos antes de publicar.",
  descricao: "Desenhe fluxos de conversa, teste todos os caminhos e só leve para o cliente quando estiver pronto. Módulo do Nexus.",
  cta: "Explorar o FlowBot",
  nexus: "Nexus",
};

export const nav = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Demo", href: "#demo" },
  { label: "Para quem", href: "#para-quem" },
  { label: "Dúvidas", href: "#duvidas" },
];

export const passos = [
  {
    num: "01",
    titulo: "Monte o fluxo",
    texto: "Adicione mensagens, perguntas, condições e transferências arrastando blocos. Sem código.",
  },
  {
    num: "02",
    titulo: "Simule a conversa",
    texto: "Responda como cliente e veja por qual caminho o fluxo segue. Teste todos os ramos antes de publicar.",
  },
  {
    num: "03",
    titulo: "Transfira para a equipe",
    texto: "Quando o bot coletou o que precisava, a conversa vai para uma pessoa real. Sem estimativas automáticas de preço.",
  },
];

export const diferenciais = [
  {
    icone: "🔀",
    titulo: "Caminhos condicionais",
    texto: "Uma resposta diferente leva para uma sequência diferente. O fluxo segue a lógica que você definiu.",
  },
  {
    icone: "👤",
    titulo: "Tomada de controle",
    texto: "A equipe entra na conversa com um clique. O bot para imediatamente e não volta sem ordem.",
  },
  {
    icone: "📋",
    titulo: "Versão imutável",
    texto: "Cada simulação roda sobre uma versão travada do fluxo. Edições em rascunho não afetam o que está em teste.",
  },
  {
    icone: "🔒",
    titulo: "Sem dados reais",
    texto: "O piloto não conecta WhatsApp, não chama modelos e não envia contatos para terceiros.",
  },
];

export const paraQuem = [
  {
    papel: "Produtor audiovisual",
    uso: "Coleta tipo de vídeo, cidade e data antes de envolver a equipe de orçamento.",
  },
  {
    papel: "Clínica ou consultório",
    uso: "Triagem inicial, especialidade e convênio — transferência só quando o paciente está qualificado.",
  },
  {
    papel: "E-commerce B2B",
    uso: "Volume, prazo e região antes de acionar um vendedor. Sem perder lead por falta de resposta rápida.",
  },
  {
    papel: "Equipe de suporte",
    uso: "Categoriza o chamado e só escalona para especialista quando o autoatendimento não resolve.",
  },
];

export const faq = [
  {
    pergunta: "O FlowBot envia mensagens reais pelo WhatsApp?",
    resposta: "Não nesta fase. O piloto é uma simulação local — sem WhatsApp, sem custos de API e sem dados de clientes.",
  },
  {
    pergunta: "Preciso saber programar para montar um fluxo?",
    resposta: "Não. Você arrasta blocos e digita os textos. Condições são definidas por escolha, não por código.",
  },
  {
    pergunta: "O que acontece quando a equipe assume?",
    resposta: "O bot para de enviar mensagens automaticamente. A conversa fica disponível para a pessoa continuar manualmente.",
  },
  {
    pergunta: "Posso testar vários caminhos do mesmo fluxo?",
    resposta: "Sim. Reinicie a demo a qualquer momento e escolha respostas diferentes para explorar todos os ramos.",
  },
  {
    pergunta: "FlowBot é o mesmo que o Flow de agendamentos?",
    resposta: "Não. Flow é a plataforma de gestão para negócios de beleza. FlowBot é um módulo independente do Nexus para atendimento conversacional.",
  },
  {
    pergunta: "Quando o editor visual estará disponível?",
    resposta: "O editor ainda não está implementado — esta página apresenta o conceito e o piloto de simulação. Acompanhe as novidades.",
  },
];

// ─── FLUXO DA DEMO ────────────────────────────────────────────────────────
// Cada nó tem id, tipo e campos conforme docs/mvp.md.
// Edite textos e opcoes sem tocar no motor da demo em index.html.

export const fluxoDemo = {
  inicio: "boas-vindas",
  nos: {
    "boas-vindas": {
      tipo: "mensagem",
      texto: "Olá! Vou adiantar as informações para a equipe preparar o seu orçamento.",
      proximo: "tipo-video",
    },
    "tipo-video": {
      tipo: "pergunta",
      texto: "Que tipo de vídeo você precisa?",
      campo: "tipoDeProducao",
      opcoes: [
        { label: "Vídeo institucional", valor: "institucional", proximo: "cidade" },
        { label: "Cobertura de evento", valor: "evento", proximo: "cidade" },
        { label: "Clipe musical", valor: "clipe", proximo: "cidade" },
        { label: "Outro", valor: "outro", proximo: "tipo-livre" },
      ],
    },
    "tipo-livre": {
      tipo: "pergunta",
      texto: "Pode descrever brevemente o que você tem em mente?",
      campo: "tipoDescricao",
      opcoes: [
        { label: "Documentário curto", valor: "documentario", proximo: "cidade" },
        { label: "Conteúdo para redes", valor: "redes", proximo: "cidade" },
        { label: "Treinamento corporativo", valor: "treinamento", proximo: "cidade" },
      ],
    },
    "cidade": {
      tipo: "pergunta",
      texto: "Em qual cidade seria a gravação?",
      campo: "cidade",
      opcoes: [
        { label: "São Paulo", valor: "sao-paulo", proximo: "data" },
        { label: "Rio de Janeiro", valor: "rio", proximo: "data" },
        { label: "Belo Horizonte", valor: "bh", proximo: "data" },
        { label: "Outra cidade", valor: "outra", proximo: "data" },
      ],
    },
    "data": {
      tipo: "pergunta",
      texto: "Para qual mês você está planejando?",
      campo: "dataDesejada",
      opcoes: [
        { label: "Próximo mês", valor: "proximo-mes", proximo: "transferencia" },
        { label: "Em 2 a 3 meses", valor: "2-3-meses", proximo: "transferencia" },
        { label: "Ainda sem data", valor: "sem-data", proximo: "transferencia" },
      ],
    },
    "transferencia": {
      tipo: "transferencia",
      texto: "Tudo certo! A equipe vai analisar o pedido e confirmar o orçamento com você.",
      detalhe: "O bot parou. Uma pessoa da equipe dará continuidade.",
    },
  },
};
