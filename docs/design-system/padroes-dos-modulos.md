# Padrões para os próximos módulos

Como os componentes existentes se combinam em cada módulo planejado. Nenhum destes módulos tem backend ainda: quando a tela existir antes dos dados, ela mostra estado vazio ou demonstração marcada como demonstração.

## Estrutura comum de página

```
.shell
├── .sidebar            (≥1024px) módulos agrupados
├── .topbar             (<1024px) logo + menu de mais ações
├── main.main
│   └── .page
│       ├── .page-head      rótulo · título · texto curto · ações (até 3, uma principal)
│       ├── .alert          contexto (demonstração, limites, avisos do módulo)
│       ├── resumo          .kpis + um gráfico/funil em .card
│       └── área de trabalho  busca (.input-group) · filtros (.chips) · vistas (.segmented)
└── .bottomnav          (<1024px) até 4 destinos do módulo
Detalhes e formulários → .drawer   ·   Confirmações → .modal   ·   Retorno → aviso()
```

No celular, cada destino da barra inferior mostra uma área por vez (como Resumo, Mapa e Empresas na Prospecção). Nada some: o que não cabe vai para o menu de mais ações.

## Prospecção (implementado)

Referência viva de todos os padrões: `src/app.mjs` e `assets/prospeccao.css`. Resumo com KPIs e funil clicável que filtra; mapa com legenda, agrupamento e cartão de seleção; lista em tabela (≥768px) ou cartões; detalhes em gaveta com seções.

## Bot Studio — editor de automações

- **Tela:** lista de fluxos (tabela/cartões, selos de status: Rascunho, Testado, Publicado) → editor.
- **Editor:** tela cheia com quadro de nós no centro, painel de propriedades em `.drawer` à direita e simulador do lado (computador) ou como aba (celular).
- **Nós:** `.card` pequeno com ícone do tipo, título e uma linha de resumo; cor de borda pelo tipo (mensagem, pergunta, condição, transferência) usando papéis de estado, nunca cor de personagem. Conexões com traço em `--border-strong`; selecionada em `--accent`.
- **Simulador:** bolhas `--chat-bot`, `--chat-client`, `--chat-team` (mesmas da landing). Botão "Equipe assume" sempre visível.
- **Publicar:** `.modal` de confirmação dizendo o que muda e para quem. Publicar é sempre o único `.btn--primary` da barra.
- **Celular:** o quadro de nós vira lista vertical de passos; editar um passo abre a folha inferior.

## Central de Atendimento — conversas e filas

- **Três colunas no computador:** filas e filtros (`.nav-group`) · lista de conversas · conversa aberta. No celular, uma coluna por vez com voltar no topo.
- **Item de conversa:** avatar, nome, última mensagem em uma linha, horário em `.t-label`, selos (Aguardando, Com a equipe, Bot) e contador de não lidas em `.badge--accent`.
- **Conversa:** cabeçalho com responsável e ação "Assumir" / "Devolver ao bot"; histórico em bolhas; campo de resposta fixo no rodapé, respeitando o teclado e a área segura.
- **Transferência para pessoa:** sempre explícita, com registro na linha do tempo da conversa.

## Agentes de IA

- **Lista:** cartões com o personagem (balão, estrela, avião, coração ou raio), nome, função, patente (cor da boina) e consumo do mês num `.meter`.
- **Configurar:** gaveta com seções Função, Conhecimento (fontes listadas com origem), Permissões (`.switch` por ação, perigosas em vermelho) e Limites de custo.
- **Consumo:** KPI com o valor real e o limite; sem dado, "—" e a explicação.

## Operações

- **Saúde:** KPIs de instâncias, filas e erros com selo de estado (`--success`, `--warning`, `--danger`) e texto sempre junto da cor.
- **Problemas:** tabela ordenada por gravidade, com quando começou e ação recomendada; detalhe em gaveta.
- **Custos:** tabela por cliente/instância com números tabulares; exportação em CSV.

## Administração SaaS

- Estabelecimentos, usuários, permissões, planos e cobrança em tabelas com busca e filtros.
- Alterar plano, remover acesso ou mudar permissão crítica: sempre `.modal` de confirmação com o efeito descrito.
- Dados sensíveis (cobrança, documentos) só aparecem para quem tem permissão; sem permissão, estado vazio explicando o motivo.
