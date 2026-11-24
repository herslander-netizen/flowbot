# Bot Studio — prévia visual

Endereço local: `/estudio/` (rode `npm run dev`). As telas seguem os contratos do motor
(`herslander-netizen/flow-bot`, consultado só para leitura), mas **nada se conecta** nesta fase.

## O que é real e o que é fictício

| Parte | Origem | Estado |
| --- | --- | --- |
| Tipos de passo, saídas e limites | `packages/contracts/src/catalog.ts` do motor (`flow-bot/v0`), copiados em `src/estudio/catalogo.mjs` | Espelho para a interface; quem valida é o motor |
| Fluxo publicado v1 | `examples/boas-vindas-menu.json` do motor | Exemplo, marcado como fictício |
| Proposta, briefing, fatos do negócio, histórico, bots | `src/estudio/demonstracao.mjs` | **Fictícios**, isolados nesse arquivo |
| Resultado da oficina | Forma de `ResultadoDaOficina` da PR #15 do motor (rascunho) | Exemplo fixo; a oficina com Claude **não é chamada** |
| Conferência do fluxo | `conferirFluxo` em `src/estudio/fluxo.mjs` | Repete as regras estruturais do motor para avisar cedo |
| Simulador | `responder` / `esgotarPrazo` em `src/estudio/fluxo.mjs` | Prévia no navegador; reproduz os 4 cenários do exemplo do motor (teste unitário) |
| Aprovação | Estado só da tela | **Não existe no motor**; nada é gravado |
| Publicar | Botão desligado | Fora desta fase |

## Telas

1. **Agentes**: bots (fictícios), o time do fluxo (os personagens da identidade e quantos passos cada um faz) e as conexões, todas marcadas como não conectadas.
2. **Fluxo**: mapa em colunas no computador (a partir de 1024px) e lista de passos no celular e no tablet. Tocar num passo abre a gaveta para editar textos e opções dentro dos limites do motor. A edição fica num rascunho local, e "Descartar" volta à v1.
3. **Oficina**: briefing (até 6.000 caracteres), fatos do negócio (`reality.*`), os participantes (Intake, Arquiteto/Claude desligado, Validador, Guardião de ações, Simulador, Revisor e Publicador humanos), o resultado (lacunas, problemas, testes, tokens e mudanças em relação à v1) e a aprovação manual com confirmação.
4. **Simulador**: conversa no jeito do WhatsApp, com as opções como botões clicáveis, silêncio até o prazo, troca entre rascunho e v1, e o estado (status, onde espera, variáveis, caminho).
5. **Versões**: ciclo Rascunho → Pronto/Precisa de revisão → Aprovado → Publicado, com a origem de cada estado, o histórico e a diferença por campo entre o rascunho e a v1.

## Diferenças entre a tela e o motor (a resolver na integração)

- O motor só tem `draft` e versões publicadas (`flow_versions`). "Pronto para revisão" vem da oficina, e "Aprovado" precisa de um estado novo no motor ou de um registro de revisão.
- A oficina não tem endpoint HTTP nem diff de versões. O diff da tela é calculado no navegador.
- Os botões interativos no WhatsApp são experimentais (PR #14, até 2 botões com volta para o menu numerado). O simulador mostra botões para todas as opções.
- O editor não cria passos nem ligações. Isso depende de gravar no motor com validação no servidor.
- Webhook, captura de dado e sorteio só rodam no simulador do motor. A prévia para e avisa.

## Testes

- `npm run check`: unitários de `tests/estudio.test.mjs` (catálogo, conferência, cenários do motor, diff e colunas).
- `npm run test:e2e`: `tests/e2e/estudio.e2e.mjs`. Cobre:
  - as 5 telas em 360, 390, 430, 768 e 1280px, sem rolagem horizontal e com alvos de 44px no celular;
  - edição com limite;
  - oficina com aprovação manual e publicar desligado;
  - simulador;
  - versões;
  - teclado;
  - tema;
  - console sem erros.

## Para conferir em Android real

- Teclado virtual no simulador: o campo de mensagem deve continuar visível ao abrir o teclado (testado só com viewport emulado).
- Rolagem do mapa do fluxo com um dedo dentro da página, sem travar a rolagem da página.
- Gaveta do passo com teclado aberto: campos de opção alcançáveis.
- Área segura com barra de gestos (o `env(safe-area-inset-bottom)` está aplicado na barra inferior e nos avisos).
