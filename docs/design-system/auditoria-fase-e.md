# Auditoria visual — Fase E (24/11/2026)

Método: o projeto rodando localmente, capturas de todos os módulos em 320, 360, 390, 430, 768, 1024,
1280 e 1440px, nos temas escuro e claro (144 imagens antes, mesmas dimensões depois). As comparações
ficam em `capturas/fase-e/`. Os testes e o contraste foram medidos no navegador emulado; o que falta conferir
em Android real está em `../bot-studio.md`.

## Problemas encontrados, por prioridade

| # | Prioridade | Onde | Problema | O que foi feito |
| --- | --- | --- | --- | --- |
| 1 | Alta | Simulador | Bolha curta do cliente com a hora sobreposta ao texto ("06:4 8") | Hora em linha própria, largura mínima na bolha |
| 2 | Alta | Bot Studio, todas as telas | Cabeçalho + aviso amarelo + abas ocupavam ~45% da altura antes do conteúdo | Cabeçalho do bot com estado em uma linha; aviso trocado por um marcador "Demonstração" que abre o que é real |
| 3 | Alta | Editor (computador) | Canvas sem zoom, sem panorâmica, sem enquadrar; nós cortados; ligações voltando para trás | Canvas com zoom, arrasto, pinça, F para enquadrar, colunas pelo caminho mais longo e arco de retorno |
| 4 | Alta | Editor | Não dava para criar, ligar nem excluir passos | Criar (por personagem), inserir depois, ligar saídas, excluir com desfazer |
| 5 | Alta | Navegação | Quatro módulos vazios com "Em breve" na Prospecção | Só módulos que existem; shell único (`montarShell`) |
| 6 | Média | Prospecção 320px | Rótulos dos indicadores quebrando em duas linhas; cabeçalho do funil espremido | Rótulos numa linha com reticências abaixo de 360px; cabeçalho do funil quebra com folga |
| 7 | Média | Agentes | Excesso de selos nos cartões de bot ("Fictício", "v1 publicada", "Rascunho", "Nunca publicado", "Rascunho vazio") | Bots como lista com uma linha de meta e um estado operacional |
| 8 | Média | Agentes | Sem responsabilidades, ferramentas, permissões, conexões ou histórico | Detalhe de cada agente com esses dados e histórico vazio honesto |
| 9 | Média | Fluxo no celular | Lista plana com "depois > ola" repetido; sem hierarquia | Árvore com ramos recuados e nome da saída; retornos como referência; folha com Anterior/Próximo |
| 10 | Média | Oficina | Resultado longe do pedido no celular; sem etapas | Etapas Pedido → Proposta → Revisão; dobras para lacunas, testes e problemas |
| 11 | Média | Simulador | Detalhes técnicos embaixo da conversa no celular; sem fluxo junto no computador | Celular: conversa em tela cheia + folha de detalhes. Computador: conversa e etapa/caminho/variáveis lado a lado |
| 12 | Média | Versões | "Rascunho" duplicado; estados sem diferença visual | `.version-state` com 5 estados distintos; ciclo com a origem de cada estado |
| 13 | Média | Contraste | Selo "Prévia" e hora da bolha abaixo de 4,5:1 | Texto de apoio (`--text-muted`) — todo texto visível passa AA |
| 14 | Baixa | Barra lateral | Caixa de aviso pesada no rodapé | Uma linha discreta (`.sidebar__note`) |
| 15 | Baixa | Topo no celular | Nome do módulo duplicado e menu "…" separado | Seletor de módulo único com as ações do módulo |
| 16 | Baixa | Movimento | Sem linguagem comum | Tokens e classes de movimento no design system |
| 17 | Baixa | Botão principal desativado | Parecia ativo (laranja a 50%) | Fundo rebaixado e texto apagado |

## Comparações (mesmas dimensões)

| Tela | Arquivo |
| --- | --- |
| Agentes, 320px | `capturas/fase-e/celular-agentes.png` |
| Fluxo, 390px | `capturas/fase-e/celular-fluxo.png` |
| Simulador, 390px | `capturas/fase-e/celular-simulador.png` |
| Versões, 390px | `capturas/fase-e/celular-versoes.png` |
| Oficina, 390px, tema claro | `capturas/fase-e/celular-oficina-claro.png` |
| Prospecção, 320px | `capturas/fase-e/celular-prospeccao.png` |
| Agentes, 1440px | `capturas/fase-e/computador-agentes.png` |
| Fluxo, 1440px | `capturas/fase-e/computador-fluxo.png` |
| Simulador, 1440px | `capturas/fase-e/computador-simulador.png` |
| Prospecção, 1440px | `capturas/fase-e/computador-prospeccao.png` |

## Preservação da Prospecção

Os 19 testes de navegador da Prospecção passam sem mudança de comportamento. Eles cobrem:

- as 5 larguras;
- indicadores, mapa e seleção, filtros e busca, ordenação;
- formulário e duplicidade, detalhes, rascunho e cópia, "não contatar";
- importação e exportação de CSV;
- teclado, tema claro, landing e galeria.

As mudanças na Prospecção são cirúrgicas, para reduzir conflito com as PRs abertas #8 e #12, que mexem no mesmo módulo:

- estrutura pelo shell;
- 320px;
- retorno ao toque.
