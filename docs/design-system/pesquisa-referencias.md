# Pesquisa de referências para o design system do FlowBot

Pesquisa feita em 23/11/2026 em páginas públicas oficiais. Onde a página não abriu, o ponto está marcado como **conhecimento geral**.

## 1. Resumo

- Os produtos de referência organizam o trabalho em **objetos com estados** (issue, negócio, conversa) e oferecem **várias visões dos mesmos dados**: tabela, quadro, calendário e mapa.
- Busca e **menu de comandos** pelo teclado são padrão no desktop. No celular, o produto é um "companheiro": caixa de entrada, ações rápidas e notificações, não o produto inteiro encolhido.
- A IA aparece como **rascunho revisado por uma pessoa**, com passagem clara para a equipe.
- O FlowBot adota essas estruturas com identidade própria: escuro, laranja e os agentes.

## 2. Referências

### Linear
- **Modelo de conceitos:** a unidade de trabalho passa por um *workflow* de status ordenados. Esses status agrupam a lista e viram as colunas do quadro. A *triagem* revisa o que chega antes de entrar no fluxo. (https://linear.app/docs/conceptual-model)
- **Visões salvas:** visões com filtros podem ser salvas, compartilhadas e favoritadas, e ficam acessíveis pela barra lateral. (https://linear.app/docs/custom-views)
- **Busca:** `/` abre a busca geral, Cmd/Ctrl F busca dentro da visão atual e há prefixos para filtrar por tipo. (https://linear.app/docs/search)
- **Celular:** o app foi feito para atividades "longe do teclado": caixa de entrada com toque para agir, deslizar para apagar e adiar, criação rápida e notificações em horário configurável. (https://linear.app/mobile)

### Attio
- A página inicial mostra o CRM como "agêntico": agentes que prospectam e respondem "quais negócios priorizar hoje" com o motivo junto. (https://attio.com)
- A página de registros não abriu. Densidade de tabela e páginas de registro ficam como **conhecimento geral**.

### Notion
- **Uma base, várias visões:** tabela, quadro, linha do tempo, calendário, lista, galeria e gráfico, cada uma com seus filtros e ordenações. (https://www.notion.com/help/views-filters-and-sorts)

### Raycast
- **Lançador por teclado:** prioriza a velocidade percebida em milissegundos e ações sem abrir o app. (https://www.raycast.com)
- O manual do menu de comandos não abriu. O detalhe de interação fica como **conhecimento geral**.

### Framer
- **Agente no canvas:** o agente de design trabalha dentro do canvas e cada mudança fica "visível, editável e sob seu controle". (https://www.framer.com)

### Intercom
- **Caixa de entrada compartilhada:** caixas por equipe, layout configurável, modo escuro, Cmd+K e um assistente que sugere respostas a partir do histórico, com controle sobre quais dados ele usa. (https://www.intercom.com/inbox)

### HubSpot
- **Pipelines:** a etapa mostra onde o registro está no processo, e cada objeto pode ter seu pipeline. O quadro mostra registros como cartões configuráveis. (https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines)

### Twenty CRM
- **Visões:** tabela, Kanban e calendário, com filtros, ordenação, campos visíveis e visões fixadas nos favoritos. (https://docs.twenty.com/user-guide/views-pipelines/overview)
- **Escopo:** importação e exportação por CSV, painéis, papéis e agentes de IA. (https://docs.twenty.com/user-guide/introduction)

### Chatwoot
- **Fila única** de canais, **agente de IA** que passa para a equipe "quando uma pessoa deve entrar", **rascunho** que a pessoa revisa e envia, e perfil com o contexto do cliente. (https://www.chatwoot.com)

### n8n
- **Canvas de nós:** começa por "Add first step" com um gatilho; "+" no conector abre o painel de nós com busca; gatilho e ação são explicitamente diferentes; controles aparecem no nó ao passar o mouse. (https://docs.n8n.io/workflows/components/nodes/)

### Zapier Agents
- A página carregou sem texto legível. Fica como **conhecimento geral**.

## 3. Padrões que o FlowBot adota

| Padrão | De onde veio | Como está no FlowBot |
| --- | --- | --- |
| Etapa como espinha do objeto | Linear, HubSpot | As 7 etapas são a mesma fonte para a cor no mapa, os chips, a lista e o funil. |
| Uma base, várias visões | Notion, Twenty | Mapa e Lista usam os mesmos filtros e a mesma busca; o quadro (Kanban) entra depois. |
| Filtros visíveis com contagem real | Linear, Twenty | Chips por etapa acima do conteúdo, e o funil também filtra ao toque. |
| Busca por teclado | Linear, Raycast, Intercom | `/` foca a busca, Esc fecha painéis e seleções. Menu de comandos quando houver vários módulos. |
| Detalhe sem perder o contexto | Linear, Twenty | Gaveta lateral no computador, folha inferior no celular, mapa e lista atrás. |
| IA como rascunho revisado | Chatwoot, Intercom, Framer | O rascunho é editável, cita fonte e nunca é enviado; a ação final é copiar. |
| Passagem clara para a equipe | Chatwoot | "Equipe assume" para o bot (simulação da landing, Central de Atendimento). |
| Celular como companheiro | Linear Mobile | Barra inferior com Resumo, Mapa, Empresas e Adicionar; folhas em vez de modais; nenhuma função removida. |
| Canvas de nós | n8n | Padrão previsto para o Bot Studio em `padroes-dos-modulos.md`. |
| Prioridade explicada | Attio | Pontuação mostra cada critério e quantos pontos vale. |
| Tema escuro e claro | Intercom | Escuro como padrão; claro pelos mesmos tokens. |

## 4. O que evitar

- **Copiar identidade.** Não reproduzir cores, logos, ilustrações, nomes ("Copilot", "Fin") nem layouts característicos de nenhuma referência, Fivebot incluído.
- **Painel genérico de administração.** Grades de números sem contexto, tabelas cinzas densas no celular, gráficos decorativos.
- **Números inventados.** Indicadores só com dados reais; exemplos fictícios sempre marcados.
- **Automação escondida.** Nada de envio automático nem "a IA resolveu" sem revisão.
- **Atalho como único caminho.** Todo atalho tem um botão visível equivalente.
- **Celular que corta funções.** Adaptar a disposição, não remover recursos.
- **Animação gratuita.** 120 a 280 ms, só transform e opacidade, respeitando `prefers-reduced-motion`.

**Fontes que não abriram:** attio.com/platform/records, manual.raycast.com/command-palette, artigo de ajuda da caixa de entrada da Intercom, knowledge.hubspot.com/records/use-board-view, chatwoot.com/features/omnichannel-inbox e zapier.com/agents.
