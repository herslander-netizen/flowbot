# Navegação global

## Princípios

1. **Só aparece o que existe.** A navegação lista módulos com tela. Os próximos módulos ficam neste documento até existirem; não viram itens desativados nem selos "Em breve".
2. **Um lugar para trocar de módulo.** No computador é a barra lateral; no celular é o seletor no topo (nome do módulo + seta). O mesmo menu guarda as ações do módulo, o tema e o site, para não espalhar botões.
3. **Telas do módulo embaixo, no celular.** A barra inferior tem até 5 destinos e fica ao alcance do polegar. No tablet e no computador, as mesmas telas viram abas (`.tabs`).
4. **Uma ação principal por tela.** No computador ela fica no cabeçalho ou na barra da página; no celular pode virar `.fab`.

## Módulos

| Módulo | Grupo | Estado | Telas |
| --- | --- | --- | --- |
| Prospecção | Comercial | Em uso (dados na aba) | Resumo, Mapa, Empresas |
| Bot Studio | Automação | Prévia | Agentes, Fluxo, Oficina, Simulador, Versões |
| Atendimento | Atendimento | Ainda não existe | Conversas, Filas, Contato (ver `padroes-dos-modulos.md`) |
| Agentes de IA | Automação | Ainda não existe | — |
| Operações | Operação | Ainda não existe | Painel, Alertas |
| Administração | Conta | Ainda não existe | Espaço, Equipe, Planos |

Para ligar um módulo: acrescente a entrada em `MODULOS` (`src/ui/shell.mjs`) com `id`, `nome`, `grupo`, `icone`, `caminho` e, se for prévia, `selo: "Prévia"`. Nada mais muda nos outros módulos.

## Cabeçalho de página

- Computador: rótulo de contexto (`.t-label`), título, uma linha de estado (`.version-state`, `.op-state`) e, à direita, o marcador de demonstração quando houver dado fictício.
- Celular: o marcador de demonstração vem antes do título; nas telas de trabalho (simulador) o cabeçalho encolhe para dar espaço.

## Estados de integração

Toda tela que depende de um serviço mostra o estado dele com `estadoOperacional()`; seções inteiras sem dados usam `blocoDeEstado()`. Os estados são os de `ESTADOS` em `src/ui/componentes.mjs`.
