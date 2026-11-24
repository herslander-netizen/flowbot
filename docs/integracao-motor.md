# Integração do Bot Studio com o motor

Documento para quem vai ligar a interface ao motor (`herslander-netizen/flow-bot`). A interface já segue os
contratos das PRs #18, #19, #20 e #21 do motor, lidos em 24/11/2026 sem alterar o motor. **Nenhum endpoint foi
inventado:** o navegador não fala com a API privada; ele vai falar com um BFF autenticado que ainda não existe.

## Arquitetura

```
telas (telas.mjs) ── estado (estado.mjs) ── sincronia (sincronia.mjs) ── FONTE ── [BFF autenticado] ── API de autoria (PR #21)
                                                                       │
                                                                       └── hoje: criarFonteDeDemonstracao (fontes.mjs), só nesta aba
```

- `src/estudio/contrato.mjs`: as rotas e os códigos de erro da API de autoria (`BOT_STUDIO_API_D3.md`), além de `traduzirResposta(status, corpo)` e `cenariosAprovaveis()`.
- `src/estudio/fontes.mjs`: a fonte de demonstração e o roteiro de homologação. A fonte real entra aqui.
- `src/estudio/sincronia.mjs`: salvamento automático com revisão esperada e o tratamento de conflito, sessão, permissão e indisponível.
- `src/estudio/dados.mjs`: a ponte offline (PR #18), com a entrada e a saída de `studio-offline.mjs`, e a reexportação das fontes.
- `src/estudio/cenarios.mjs`: a conferência de cenários na prévia. Usa as mesmas regras de texto do motor; o resultado é testado contra saídas reais do motor.

## Interface da fonte

Toda fonte devolve o resultado de `traduzirResposta(status, corpo)`:
`{ ok: true, dados }` ou `{ ok: false, estado, codigo, mensagem, revisaoAtual?, problemas?, relatorios? }`.

| Método | Operação do motor | Permissão | `dados` quando ok |
| --- | --- | --- | --- |
| `obterRascunho(flowId, revision?)` | `GET /draft?revision=` | read | `{ revision, document, actor_id, created_at }` |
| `salvarRascunho(flowId, expectedRevision, document)` | `PUT /draft` | write | `{ ok, revision, changed }` |
| `historico(flowId, before?)` | `GET /history?before=` | read | `[{ revision, actor_id, created_at }]` (até 50) |
| `simular(flowId, { revision, scenarios, baseRevision? })` | `POST /simulate` | simulate | saída de `avaliarRascunhoStudio` |
| `aprovacaoAtual(flowId)` | `GET /approval` | read | `{ revision, reviewer_id, document_sha256, evidence_sha256, scenario_count, approved_at, approved, published }` |
| `aprovar(flowId, { revision, confirmation, scenarios })` | `POST /approval` | approve | `{ ok, revision, approved: true, published: false, reports }` |
| `carregarEspaco()` | — (BFF) | — | `{ negocio, bots, publicada, perfil, cenarios, briefing }` |
| `publicar()`, `pedirProposta()` | não existem no motor | — | sempre `{ ok: false, estado: "indisponivel" }` |

`carregarEspaco()` não está na API do motor: o BFF precisa montar esses dados (nome do negócio, bots, versão publicada, perfil confiável do espaço e cenários independentes do operador). **Contrato a definir com o motor**; a demonstração os traz de `demonstracao.mjs`.

## Estados da interface

| Resposta | `estado` | O que a tela faz |
| --- | --- | --- |
| 200 | ok | "Salvo · rN" no cabeçalho |
| 401 `unauthorized` | `sessao` | Para de salvar, mostra a faixa "Sessão expirada" e oferece baixar as alterações. Não há login fictício: entrar de novo é com o BFF |
| 403 `forbidden` | `permissao` | Mostra "Somente leitura", para de salvar e oferece baixar as alterações |
| 404 | `vazio` | Rascunho novo (revisão esperada 0) ou aprovação inexistente |
| 409 `revision_conflict` | `conflito` | Busca a revisão nova e compara (suas alterações, as da outra pessoa, passos em comum). A pessoa escolhe "Manter as minhas" ou "Usar a rN"; antes disso o rascunho local fica intacto e pode ser baixado |
| 409 `already_approved` | `conflito` | Avisa na aprovação |
| 413, 422 | `validacao` | Mostra os `problems` do motor, cada um levando ao passo |
| 0, 5xx | `indisponivel` | Mostra "Sem conexão" com "Tentar de novo"; as alterações ficam nesta aba |

Regras da sincronia, testadas em `tests/estudio.test.mjs`:

- Salva sozinho 1,2 s depois da última edição. Salva uma vez por vez, e o que mudar durante o salvamento entra no próximo.
- Conflito, sessão e permissão param o salvamento automático até a pessoa agir.
- Aprovação só vale para a revisão salva atual. Uma edição cria uma revisão nova e a tela mostra que a aprovação anterior não vale mais. No motor isso já é garantido por `current()` com hash.

## Como criar a fonte real

1. No BFF (fora deste repositório), autentique cada operador. Depois derive `workspaceId`, `environment` e `actorId` da sessão, nunca do navegador, e chame a API de autoria com a credencial de serviço guardada só no servidor.
2. Exponha ao navegador rotas do próprio BFF, que precisam ser definidas junto com o motor. Hoje não há nenhuma, e esta interface não supõe nomes.
3. Em `fontes.mjs`, crie `criarFonteReal({ chamar })`. Ela tem os mesmos métodos da tabela acima e passa `status` e corpo por `traduzirResposta`. Também não guarda token nenhum.
4. Em `app.mjs`, troque `criarFonteDeDemonstracao(...)` por essa fonte. Nenhuma tela muda.
5. Quando `simular` estiver disponível, o passo "baixar entrada / importar saída" (ponte offline) pode virar um botão. O formato de leitura é o mesmo de `lerSaidaDaPonte`.

## Roteiros de homologação

Abra `/estudio/?roteiro=<nome>`. Uma faixa anuncia o roteiro, e todas as respostas são simuladas.

| Roteiro | O que acontece |
| --- | --- |
| `conflito` | No primeiro salvamento, outra pessoa salva antes (r2 muda o passo `servicos`) |
| `permissao` | Salvar e aprovar respondem 403 |
| `sessao` | Salvar e aprovar respondem 401 |
| `indisponivel` | Nada responde |
| `lento` | Toda resposta demora 1,2 s |
| `extenso` | Fluxo com 59 passos |

## Pendências do lado do motor ou do BFF

1. BFF autenticado, com identidade e permissões por pessoa (gates do D3).
2. Rotas do BFF e os dados de `carregarEspaco()`: perfil confiável por espaço e cenários independentes do operador.
3. A simulação da API ainda não aceita perfil de realidade (D3). Fluxos que leem `reality.*` precisam disso antes de homologar.
4. Nome legível do autor: o motor devolve `actor_id`. O BFF deve traduzir para um nome, e a tela mostra o que vier.
5. Pedido de correção: o motor não guarda. Hoje é só uma marcação da tela.
6. Publicação autorizada, oficina com Claude e histórico de execução dos agentes: ainda não existem no motor.

## Riscos e possíveis conflitos

| Onde | Risco |
| --- | --- |
| PRs #8 e #12 deste repositório | Também mudam `src/app.mjs` e `assets/prospeccao.css`. Aqui a Prospecção muda pouco: shell, folha com arrastar, teclado e lembrar a aba |
| `assets/components.css` | Ganhou padrões novos (faixa, registro, trilho, busca). As PRs empilhadas antes desta precisam entrar na ordem #6 → #11 → #14 → esta |
| Motor PR #21 | Ainda em correção. Se as rotas ou os códigos mudarem, só `contrato.mjs` e os testes de contrato precisam acompanhar |
| `?roteiro=` | É um modo de homologação. Ao ligar a fonte real, ele deve continuar só para testes, sem aparecer na navegação |
