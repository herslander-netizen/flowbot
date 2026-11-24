# Componentes

Todos estão em `assets/components.css` e aparecem funcionando em `design-system.html`. Use as classes como estão; variações só pelos modificadores listados.

## Botão — `.btn`

| Classe | Quando |
| --- | --- |
| `.btn--primary` | A ação principal da área (uma só). Laranja. |
| `.btn--secondary` | Ações importantes que não são a principal. Só contorno. |
| `.btn` | Neutro, para ações de apoio. |
| `.btn--ghost` | Ações discretas, fechar, ícones em cabeçalho. |
| `.btn--danger` | Ação destrutiva, sempre com confirmação. |
| `.btn--sm` / `.btn--lg` / `.btn--block` / `.btn--icon` | Tamanho, largura total, só ícone. |

```html
<button class="btn btn--primary" type="button"><svg class="icon">…</svg>Adicionar empresa</button>
<button class="btn btn--ghost btn--icon" type="button" aria-label="Fechar">…</button>
<button class="btn btn--primary" aria-busy="true">Salvando</button>  <!-- carregando -->
```

Acessibilidade: texto é verbo com objeto ("Exportar CSV"). Botão só de ícone exige `aria-label`. `disabled` ou `aria-disabled="true"` para desativar.

## Campos — `.field`, `.input`, `.select`, `.textarea`

```html
<div class="field">
  <label class="field__label" for="nome">Nome da empresa<span class="req" aria-hidden="true">*</span></label>
  <input class="input" id="nome" aria-describedby="nome-erro" aria-invalid="true">
  <span class="field__error" id="nome-erro">Informe o nome.</span>
</div>
```

- Todo campo tem `<label>` ligado por `for`. Dica em `.field__hint`, erro em `.field__error` ligado por `aria-describedby`.
- Erro: `aria-invalid="true"` no campo; foco vai para o primeiro campo com erro.
- Fonte de 16px nos campos: o celular não aproxima a tela ao focar.
- Use `inputmode` (numeric, decimal, url) e `enterkeyhint` para o teclado certo no celular.
- `.input-group` coloca ícone à esquerda (busca) e atalho `<kbd>` à direita (o atalho some em telas de toque).
- Agrupe com `.fieldset` + `<legend class="section__title">` e `.form-grid` / `.form-grid--2`.

## Seleção — `.check`, `.switch`, `.segmented`, `.chip`

- `.check`: caixa de seleção com rótulo clicável.
- `.switch`: liga/desliga com efeito imediato (ex.: "Não contatar"). `.switch--accent` para o laranja; o padrão usa o vermelho de bloqueio.
- `.segmented`: alternar entre vistas (Mapa/Lista). Botões com `aria-pressed`.
- `.chips` + `.chip`: filtros rápidos roláveis no celular. `aria-pressed="true"` no ativo; contagem em `.chip__count`.

## Selo — `.badge`

Neutro, `--accent`, `--success`, `--warning`, `--danger`, `--info`. Para etapa do funil: `.badge--stage` com `style="--stage: var(--stage-lead)"` e um `.dot` dentro. O texto sempre diz o estado; a cor só reforça.

## Cartão e indicador — `.card`, `.kpi`

- `.card` com `.card__head` (título e meta) e `.card__body`. `.card--pad` para conteúdo simples.
- `.kpi` dentro de `.card`: `.kpi__label` (com ícone), `.kpi__value` (Bricolage, números tabulares) e `.kpi__hint`. Valor sem dado é "—" com a explicação no `.kpi__hint`, nunca zero inventado.
- `.meter` > `span` com `width` em % e `--meter` para a cor.

## Tabela — `.table`

Dentro de `.table-wrap` (rola na horizontal se precisar). Cabeçalho fixo ao rolar; números em `.num`; linha selecionada com `aria-selected="true"`; o nome que abre detalhes é um `<button class="row-link">`. No celular, troque a tabela por uma lista de cartões com as mesmas informações.

## Avisos — `.alert`, `aviso()`

- `.alert` (info), `--success`, `--warning`, `--danger`: mensagens fixas na página. Ícone + texto curto.
- `aviso(texto, { tipo, acao, duracao })` em `src/ui/componentes.mjs`: toast que some sozinho em 4,5 s, no máximo 3 na tela, anunciado para leitor de tela. `acao: { rotulo: "Desfazer", executar }` para desfazer.

## Vazio, esqueleto e carregamento

- `.empty` com `.empty__art` (ícone), `.empty__title`, `.empty__text` e `.empty__actions`. Sempre dizer o porquê e dar a próxima ação.
- `.skeleton` no formato do conteúdo que vai chegar; `.spinner` só em espaços pequenos, com `role="status"` e `aria-label`.

## Modal — `.modal`

Para confirmações e decisões curtas. Junto de `.overlay`. `role="dialog"`, `aria-modal="true"`, `aria-labelledby` no título. Use `prenderFoco(caixa)`; Esc e o fundo fecham; o foco volta para quem abriu.

## Gaveta — `.drawer`

Para detalhes e formulários longos. À direita (480px) no computador; folha inferior (até 92% da altura) no celular, com `.drawer__grab`. Estrutura: `.drawer__head` (rótulo, `.drawer__title`, fechar), `.drawer__body` (rola sozinho) e `.drawer__foot` opcional com respiro da área segura. Dentro, organize em `.section` com `.section__title` e `.dl` para pares campo/valor.

## Menu — `.menu`

Botão com `aria-haspopup="menu"`, `aria-expanded` e `aria-controls`; `alternarMenu()` e `fecharMenus()` cuidam do resto. Itens `.menu__item` (44px de altura) e `.menu__sep`.

## Dica — `data-tip`

`<button data-tip="Texto curto" aria-label="Texto curto">`. Aparece no hover e no foco; some em telas de toque. Não coloque informação essencial só na dica.

## Navegação — `montarShell()`, `.sidebar`, `.topbar__module`, `.bottomnav`, `.tabs`

Use `montarShell({ ativo, raiz, nota, acoes, conteudo, inferior })` (`src/ui/shell.mjs`). Item atual com `aria-current="page"`. Ações do módulo entram em `acoes` e aparecem no menu do seletor de módulo. Abas de página (`.tabs`) só no tablet e no computador; no celular a barra inferior faz o papel delas.

## Estado operacional — `estadoOperacional(estado, texto?)`, `.op-state`

Ponto + texto para dizer como uma integração está agora: `conectado`, `desconectado`, `demonstracao`, `carregando`, `salvando`, `nao-salvo`, `conflito`, `validacao`, `permissao`, `indisponivel`, `erro`, `vazio`. Não crie estados novos na tela; acrescente em `ESTADOS` (`src/ui/componentes.mjs`) e na galeria.

## Bloco de estado — `blocoDeEstado({ estado, titulo, texto, acao })`, `.state-block`

Para telas e seções inteiras sem dados, com erro, sem permissão ou com serviço indisponível. Título curto, um texto que diz o que fazer e no máximo uma ação. Erro, conflito e permissão viram `role="alert"`.

## Estado de versão — `.version-state[data-estado]`

`rascunho`, `revisao`, `correcao`, `aprovado` (contorno: ainda não definitivo) e `publicado` (preenchido). Sempre com texto.

## Painel lateral — `.side-panel`

Edição contextual ao lado do trabalho no computador, sem bloquear a tela. No celular o mesmo conteúdo abre numa folha inferior (`.drawer`).

## Ação do polegar — `.fab`

Uma ação principal flutuante no celular, acima da barra inferior e da área segura. Some a partir de 1024px, onde a ação vai para a barra da página.

## Dobra — `details.fold`

Seções que o usuário abre quando precisa (testes, lacunas, relatórios). O resumo tem 44px e mostra a contagem à direita.

## Ícones — `icone(nome)`

Traço único de 24px. Nomes disponíveis em `src/ui/icones.mjs` (painel, mapa, lista, alvo, mais, importar, exportar, seta, fechar, info, alerta, ok, check, menos, copiar, faisca, escudo, proibido, busca, reticencias, sol, lua, pino, link, relogio, nota, fluxo, conversa, agente, atividade, engrenagem, predio, site, enquadrar, abaixo, esquerda, lixeira, ramo, retorno, play, cadeado, camadas, ajustes, desfazer, arquivo, nuvemoff). Tamanhos: `.icon--xs` 14, `.icon` 18, `.icon--sm` 16, `.icon--lg` 22. Ícone ao lado de texto é decorativo (`aria-hidden` já vem).
