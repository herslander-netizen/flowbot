# Bot Studio — prévia visual

Endereço local: `/estudio/` (rode `npm run dev`). Telas: Agentes, Fluxo, Oficina, Simulador e Versões.
O motor (`herslander-netizen/flow-bot`) é só referência: nada aqui altera o motor, e a interface não se
conecta a ele, ao WhatsApp nem à oficina com Claude.

## O que é real e o que é demonstração

| Parte | Origem | Estado |
| --- | --- | --- |
| Tipos de passo, saídas e limites | `packages/contracts/src/catalog.ts` do motor (`flow-bot/v0`), em `src/estudio/catalogo.mjs` | Espelho para a interface; quem valida é o motor |
| Perfil de realidade e cenários | Formatos `PerfilDeRealidade` e `ArquivoDeCenarios` do motor | Dados fictícios em `src/estudio/demonstracao.mjs` |
| **Avaliação oficial** | Ponte offline do motor, PR #18 (`packages/server/bin/studio-offline.mjs`) | **Real**: a tela monta a entrada exata, o operador roda o motor e importa a saída |
| Bot, negócio, versões, histórico, proposta da oficina | `src/estudio/demonstracao.mjs` | Fictícios, marcados como "Demonstração" |
| Conferência na tela | `conferirFluxo` (`src/estudio/fluxo.mjs`) | Repete as regras estruturais para avisar cedo |
| Simulador da tela | `responder`/`esgotarPrazo` (`src/estudio/fluxo.mjs`) | Prévia no navegador; o oficial é o do motor |
| Aprovar | Estado da tela | Não existe no motor; qualquer edição desfaz |
| Salvar, publicar, pedir proposta | `criarFonteDeDemonstracao()` | Respondem "indisponível"; nunca simulam sucesso |

## Camada de dados

`src/estudio/dados.mjs` separa a interface da origem dos dados. As telas só falam com a **fonte**
(`carregarEspaco`, `resultadoDeExemplo`, `salvarRascunho`, `publicar`, `pedirProposta`). Hoje existe só a
fonte de demonstração. Quando o motor tiver o endpoint autenticado (gate 4 do `BOT_STUDIO_OFFLINE_D1.md`),
basta uma fonte nova com os mesmos métodos.

O contrato da ponte offline já está implementado e testado contra o motor de verdade:

- `montarEntradaDaPonte({ rascunho, base, cenarios, perfil })` monta `{ draft, base?, scenarios, perfil? }`. Ela recusa rascunho não `draft`, mais de 20 cenários × 20 passos e entrada acima de 1 MiB.
- `lerSaidaDaPonte(json)` aceita só o formato do motor:
  - `ok`;
  - `approved:false` e `published:false` (a saída nunca vem aprovada nem publicada);
  - `reports`, `scenariosPassed` e `diff` em JSON Pointer;
  - os códigos `entrada_invalida`, `perfil_invalido`, `fluxo_invalido`, `somente_rascunho`, `base_invalida`, `cenarios_invalidos` e `simulacao_falhou`.

  Qualquer outra coisa é recusada com o motivo.
- `tests/fixtures/` guarda três saídas reais do motor (PR #18, commit `4dcb619`), geradas com a entrada desta interface:
  - cenários passaram;
  - um cenário falhou;
  - fluxo inválido.

### Como rodar a avaliação oficial

1. Bot Studio → Versões → Avaliação oficial → **entrada.json**.
2. No motor (`npm ci && npm run build` na PR #18): `node packages/server/bin/studio-offline.mjs entrada.json > saida.json`.
3. Importe **saida.json**. A tela mostra:
   - cada cenário com passos, saídas e falhas;
   - os problemas do motor, cada um levando ao passo;
   - o diff segundo o motor.

## Telas

1. **Agentes.**
   - Bots, com canal e estado "não conectado".
   - Personagens do fluxo: Recepcionista, Qualificador, Guardião, Passador e FlowBot, com passos e ferramentas de cada um.
   - Agentes da oficina, na ordem de trabalho (Intake → Arquiteto → Validador → Guardião de ações → Simulador → Revisor → Publicador).
   - O detalhe mostra função, estado, responsabilidades, ferramentas, permissões e conexões (navegáveis). O histórico de execução mostra o estado vazio, sem inventar execuções.
2. **Fluxo.**
   - **Computador:** canvas com arrastar para mover, Ctrl + roda ou pinça para zoom e F para enquadrar. A primeira vista começa pela entrada, com zoom legível. Ligações saem por porta. O caminho de erro é tracejado e o retorno ("voltar para") é um arco pontilhado com o limite de vezes. O passo selecionado destaca suas ligações. O painel lateral edita textos, opções, prazo e nota, liga saídas, insere passo depois e exclui.
   - **Celular:** árvore de passos (ramos com recuo e nome da saída, retornos como "vai para", saída faltando como alerta). A edição abre numa folha inferior com Anterior/Próximo. O botão "+ Passo" fica no alcance do polegar.
   - Criar passo: seletor por personagem. Gatilho, sorteio e webhook aparecem indisponíveis, com o motivo.
   - Desfazer: botão, Ctrl+Z e no aviso.
3. **Oficina.**
   - Etapas Pedido → Proposta → Revisão.
   - O pedido tem o briefing e os fatos do negócio (`reality.*`). "Pedir proposta" está indisponível.
   - A proposta de exemplo vem marcada "nenhum agente rodou".
   - A revisão humana tem 3 conferências antes de aprovar. "Pedir correção" está disponível. "Publicar" está desligado.
4. **Simulador.**
   - Conversa no estilo do WhatsApp, com respostas rápidas, sugestões para começar e "cliente some por N min".
   - Também mostra a etapa atual, o caminho e as variáveis, e permite trocar entre rascunho e v1.
   - "Repetir na outra versão" compara o resultado. Quando a prévia para, a falha aparece com link para o passo.
   - **No celular**, a conversa ocupa a tela e os detalhes abrem numa folha. **No computador**, conversa e detalhes ficam lado a lado.
5. **Versões.**
   - Ciclo Rascunho → Em revisão/Precisa de correção → Aprovado → Publicado, com a origem de cada estado (motor ou interface).
   - Diferença campo a campo com a v1.
   - Avaliação oficial.
   - Histórico cronológico desta aba mais a v1 fictícia.

## Pendências para a integração funcional

1. **Endpoint autenticado** de avaliação no motor (gate 4). Com ele, a fonte real chama `avaliarRascunhoStudio` e o passo manual de baixar e importar some.
2. **Persistência do rascunho** por espaço, com revisão otimista. A tela já tem os estados "não salvo", "salvando" e "conflito de versão" no design system, e a fonte precisa devolver a revisão atual.
3. **Registro de revisão** ligado ao hash do rascunho (gate 3). Hoje "Aprovado" é só da tela.
4. **Publicação separada e autorizada** (gate 6). O botão "Publicar" já existe desligado.
5. **Oficina com Claude** atrás do validador, com quota (gate 5). O botão "Pedir proposta" já existe desligado.
6. **Histórico de execução** dos agentes e conversas reais: exige telemetria do motor, que ainda não existe.
7. **Identidade do espaço** vinda da sessão, nunca do navegador (gate 2).
8. **Botões interativos** do WhatsApp: experimentais na PR #14 do motor (até 2). O simulador mostra todas as opções como botões.

## Testes

- `npm run check`: `tests/estudio.test.mjs` cobre:
  - catálogo e conferência;
  - os cenários do exemplo do motor;
  - diff e colunas;
  - inserir, ligar e excluir passos;
  - a árvore do celular;
  - repetir a conversa;
  - o contrato da ponte, incluindo as saídas reais do motor.
- `npm run test:e2e`:
  - `tests/e2e/estudio.e2e.mjs` cobre:
    - as 5 telas em 320, 360, 390, 430, 768, 1024, 1280 e 1440px, sem rolagem horizontal e com alvos de 44px no celular;
    - agentes, canvas, edição, folha do celular, oficina, simulador, versões com importação das saídas reais, teclado, tema e movimento reduzido.
  - `tests/e2e/contraste.e2e.mjs` mede o contraste WCAG AA de todo texto visível nos dois temas.

## Para conferir em Android real

A emulação do navegador não substitui um aparelho.

- Teclado virtual no simulador: o campo de mensagem e as respostas rápidas devem continuar visíveis.
- Folha inferior do passo com o teclado aberto: os campos de opção devem ficar alcançáveis e a rolagem não deve vazar para a página.
- Barra de gestos e área segura: `env(safe-area-inset-*)` está aplicado na barra inferior, no botão "+ Passo", nos avisos e na altura da conversa.
- Pinça e arrasto no canvas em tablet com 1024px ou mais.
- Desempenho do canvas com fluxos grandes (o teste usa 12 a 13 passos).
