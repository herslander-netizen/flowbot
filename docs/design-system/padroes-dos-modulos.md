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

## Bot Studio — editor de automações (prévia implementada)

Detalhes e o que é real em `../bot-studio.md`.

- **Telas:** Agentes, Fluxo, Oficina, Simulador e Versões, com abas no computador e barra inferior no celular.
- **Passos:** cada família de passo tem um personagem da identidade (Recepcionista abre, Qualificador pergunta e ramifica, Guardião segura o erro, Passador passa à equipe, FlowBot cuida do resto). A cor do personagem aparece só como filete e rosto pequeno, nunca como fundo de botão ou estado.
- **Ligações:** traço em `--border-strong`; caminho de erro tracejado em `--danger`; retorno com limite em arco pontilhado; ligações do passo selecionado em `--accent`.
- **Editor:** canvas com zoom e panorâmica e painel lateral (`.side-panel`) no computador; árvore de passos e folha inferior com Anterior/Próximo no celular.
- **Estados:** revisão com `.version-state`; integrações com `.op-state`; nada aparece como conectado ou aprovado sem ser.
- **Publicar:** quando existir, `.modal` de confirmação dizendo o que muda e para quem; hoje o botão aparece desligado com o motivo.

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
