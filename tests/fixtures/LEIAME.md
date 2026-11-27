# Saídas reais da ponte offline do motor

Geradas em 24/11/2026 com `node packages/server/bin/studio-offline.mjs entrada.json` do
`herslander-netizen/flow-bot`, PR #18 (commit `4dcb619`), compilado localmente sem alterar o motor.
A entrada foi montada por `montarEntradaDaPonte` (`src/estudio/dados.mjs`) com os dados fictícios de
`src/estudio/demonstracao.mjs`.

| Arquivo | Entrada | Código de saída |
| --- | --- | --- |
| `saida-ponte-offline.json` | proposta da oficina, base v1, 5 cenários, perfil | 0 (cenários passaram) |
| `saida-ponte-cenario-falhou.json` | v1 como rascunho com os mesmos 5 cenários | 2 (cenário "Cliente pergunta horários" falhou) |
| `saida-ponte-fluxo-invalido.json` | proposta sem a saída "sem resposta" da espera | 1 (`fluxo_invalido`) |

Os dados são fictícios. O resultado não prova revisão nem autoriza publicação.
