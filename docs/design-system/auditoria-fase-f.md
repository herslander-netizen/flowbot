# Auditoria visual — Fase F (24/11/2026)

**Método.** Rodei o projeto localmente. Capturei todos os módulos em 320, 360, 390, 430, 768, 1024, 1280 e 1440px, nos temas escuro e claro, antes e depois e nas mesmas dimensões (144 + 144 imagens). Usei a tela como uma pessoa usaria: editei, criei conflito, perdi a permissão, aprovei, simulei e abri um fluxo de 59 passos. As comparações estão em `capturas/fase-f/`.

## Problemas encontrados e o que foi feito

| # | Prioridade | Onde | Problema | O que foi feito |
| --- | --- | --- | --- | --- |
| 1 | Alta | Bot Studio | Não havia salvamento, revisão nem conflito: a tela não estava pronta para o motor real | Fonte com os métodos da API de autoria (PR #21). Salvamento automático com revisão esperada. Estados de salvando, salvo, conflito, sessão expirada, sem permissão e sem conexão |
| 2 | Alta | Conflito | Inexistente | Faixa fixa com "Resolver" e folha com as suas alterações, as da outra pessoa e os passos em comum. Escolha entre "manter as minhas" e "usar a rN". O local nunca some: dá para baixar e desfazer |
| 3 | Alta | Aprovação | "Aprovado" era só da tela e não dependia de revisão | Aprovação presa à revisão salva, com cenários independentes, como no motor. Uma edição nova invalida a aprovação e a tela avisa |
| 4 | Alta | Simulador no celular | O telefone ficava dentro de um cartão, com cabeçalho e margens tomando a altura | Conversa de ponta a ponta. A barra inferior some quando o teclado abre, e os detalhes ficam numa folha |
| 5 | Alta | Editor | Sem busca, sem refazer, sem como achar um passo num fluxo grande | Busca (`/`) com resultados, refazer (Ctrl+Shift+Z), navegação entre avisos e minimapa a partir de 15 passos. Escolher pela busca aproxima e centraliza |
| 6 | Média | Árvore do celular | Um cartão por passo: muitas bordas e pouco texto por tela | Linhas planas numa superfície contínua, com o personagem e o guia de ramo. Toque longo abre as ações do passo |
| 7 | Média | Canvas | Passo selecionado sem contexto | Modo foco: o que não se liga ao passo fica em segundo plano. Botão direito abre o menu do passo, e Delete exclui |
| 8 | Média | Cabeçalho do Bot Studio | Quatro linhas antes do conteúdo no celular (marcador, crumb, título, selos) | Duas linhas: título com o negócio e uma linha com o estado da revisão e o salvamento. A marca "Demonstração" ficou compacta |
| 9 | Média | Oficina | Pedido, proposta e revisão empilhados no celular, e sugestão misturada com resultado | Etapas viram abas no celular. Registro de trabalho com quatro tipos (Sugestão, Execução, Resultado e Aprovação), cada um com a origem. "Rodar na prévia" executa de verdade, no navegador |
| 10 | Média | Versões | Ciclo em 4 cartões; histórico sem revisão nem autor | Trilho compacto do ciclo e lista de revisões com autor e hora. Comparação entre quaisquer duas revisões seguidas |
| 11 | Média | Simulador | Mensagens seguidas do bot pareciam soltas; detalhes técnicos sem lugar | Mensagens do bot agrupadas e o encaminhamento para a equipe aparece uma vez só. As etapas percorridas aparecem na conversa só se a pessoa ligar |
| 12 | Média | Agentes | Personagens sem estado e sem indicar se fazem parte do fluxo | Olhos "apagados" quando o personagem não tem passos. Disponibilidade e permissões com ícones. Estados de trabalho prontos para quando o motor relatar (nenhum aparece ativo) |
| 13 | Média | Folhas no celular | Fechar só pelo X | Arrastar a alça ou o cabeçalho para baixo fecha, no Bot Studio e na Prospecção |
| 14 | Média | Navegação | Recarregar voltava ao começo | A tela, a rolagem por tela, a vista do fluxo, o passo selecionado e a aba da Prospecção no celular ficam guardados na sessão |
| 15 | Baixa | Prévia × motor | A prévia escrevia "Olá, !" sem nome e não mostrava o encaminhamento | Mesmas regras de texto do motor (pontuação solta, listas, "(encaminhado para a equipe…)"), comparadas com saídas reais |
| 16 | Baixa | Contraste | Rótulo "Sugestão" a 2,72:1 no tema claro | Cor do texto misturada com o texto padrão. Todo texto visível passa AA |

## Comparações

`capturas/fase-f/` traz:

- `celular-*` e `computador-*`: antes e depois, lado a lado.
- `estado-*`: conflito (faixa e folha), sem permissão, aprovado, simulador com a equipe, fluxo extenso, busca, menu de contexto e passo no tema claro.

## Desempenho (CPU 6× mais lenta, navegador emulado)

| Cenário | DOMContentLoaded | Troca de tela | Tarefas longas |
| --- | --- | --- | --- |
| Bot Studio, 390px | 471 ms | 105 / 80 ms | 94, 65 ms |
| Fluxo de 59 passos, 1440px | 251 ms | 111 / 191 ms | 59, 190 ms (redesenho), nenhuma ao arrastar o canvas |
| Prospecção, 390px | 877 ms | — | nenhuma |

## O que ainda precisa de um Android real

Não houve aparelho físico nesta fase.

- Teclado virtual no simulador: `interactive-widget=resizes-content` + `visualViewport`.
- Arrastar a folha para fechar.
- Toque longo na árvore.
- Pinça no canvas em tablet.
- Área segura com barra de gestos.
