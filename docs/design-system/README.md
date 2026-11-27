# Design system do FlowBot

Base visual de todos os módulos: Prospecção (pronto), Bot Studio, Central de Atendimento, Agentes de IA, Operações e Administração.

**Para agentes de código (Codex, ChatGPT, Claude):** leia este arquivo inteiro antes de criar ou mudar qualquer tela. As regras da seção "Regras obrigatórias" valem sempre.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `assets/tokens.css` | Todas as variáveis: cores por tema, tipografia, espaço, forma, elevação, movimento, camadas, breakpoints. |
| `assets/base.css` | Reset, tipografia base, foco, utilitários (`.t-*`, `.sr-only`, `.skip-link`) e `prefers-reduced-motion`. |
| `assets/components.css` | Todos os componentes. Classes no padrão bloco `.card`, elemento `.card__head`, variação `.btn--primary`. |
| `src/ui/icones.mjs` | `icone(nome, classe)`: ícones de traço único, 24px, traço 1,75. |
| `src/ui/componentes.mjs` | `html()` (escape), `formatar`, `aviso()` (toast), `prenderFoco()`, tema e menus. |
| `design-system.html` | Galeria viva: abra com `npm run dev` em http://127.0.0.1:4173/design-system.html. |
| [`componentes.md`](componentes.md) | Cada componente: quando usar, HTML de exemplo, acessibilidade. |
| [`padroes-dos-modulos.md`](padroes-dos-modulos.md) | Layouts para os próximos módulos. |
| [`pesquisa-referencias.md`](pesquisa-referencias.md) | O que observamos em produtos de referência e o que adotamos. |
| `docs/identidade/` | Marca: logo, agentes, patentes, manual e a fonte dos tokens de cor (`tokens.json`, `contraste.json`). |

Ordem de carregamento numa página nova:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,700&family=JetBrains+Mono:wght@500&family=Lexend:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./assets/tokens.css">
<link rel="stylesheet" href="./assets/base.css">
<link rel="stylesheet" href="./assets/components.css">
<link rel="stylesheet" href="./assets/<seu-modulo>.css"> <!-- só layout do módulo -->
```

## Regras obrigatórias

1. **Só tokens.** Nenhuma cor, tamanho ou duração solta. Se faltar, crie o token em `tokens.css` primeiro e documente aqui.
2. **Só componentes existentes.** CSS de módulo (`assets/<modulo>.css`) cuida apenas de layout. Se um padrão aparecer em dois módulos, ele vira componente.
3. **Um botão principal (`.btn--primary`) por área visível.** O resto é `.btn--secondary`, `.btn` ou `.btn--ghost`.
4. **Escape sempre** o que vem do usuário ou de arquivo com `html()` antes de montar HTML.
5. **Não inventar dados.** Indicadores calculados dos registros; demonstração marcada como demonstração; vazio mostra estado vazio.
6. **Acessível por padrão:** rótulo em todo campo, `aria-label` em botão só de ícone, foco visível, Esc fecha sobreposições, foco volta para quem abriu.
7. **Celular primeiro:** validar em 360, 390, 430, 768 e 1280px, sem rolagem horizontal; alvos de toque com 44px ou mais; campos com 16px de fonte.
8. **Movimento curto:** 120/200/280 ms, só transform e opacidade; tudo para com `prefers-reduced-motion`. O quique com mola é só dos personagens e da landing.

## Fundamentos

### Cor

Três camadas (fonte: `docs/identidade/tokens/tokens.json`, contraste conferido em `contraste.json`):

- **Papéis** (use estes): `--bg`, `--surface`, `--surface-sunken`, `--surface-raised`, `--overlay`, `--text`, `--text-muted`, `--text-faint`, `--text-disabled`, `--border-subtle`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-text`, `--accent-subtle`, `--on-accent`, `--focus-ring`, `--success|warning|danger|info` com `-subtle` e `on-`, `--state-hover`, `--state-pressed`, `--highlight`, `--chat-bot|client|team`.
- **Etapas do funil:** `--stage-pesquisado`, `--stage-lead`, `--stage-qualificado`, `--stage-proposta`, `--stage-negociacao`, `--stage-ganho`, `--stage-perdido`. Mudam por tema e passam 4,5:1 sobre `--surface`.
- **Primitivos e personagens:** `--laranja-500`, `--neutro-900`, `--agent-*`, `--patente-*`. Personagem nunca vira botão, link ou estado.

Tema escuro é o padrão. O claro é `data-theme="light"` no `<html>` (`aplicarTema()` faz isso e guarda a escolha).

| Papel | Escuro | Claro |
| --- | --- | --- |
| Fundo | `#0B0B0B` | `#FAFAF8` |
| Cartão | `#141413` | `#FFFFFF` |
| Texto | `#F5F5F5` | `#0B0B0B` |
| Laranja (ação de marca) | `#FF6B2C` | `#C2410C` |
| Sucesso / Atenção / Erro / Info | `#34D399` / `#FBBF24` / `#F87171` / `#60A5FA` | `#047857` / `#92400E` / `#C62828` / `#1D4ED8` |

### Tipografia

| Token | Uso |
| --- | --- |
| `--font-sans` Inter | Interface inteira. |
| `--font-display` Bricolage Grotesque 700 | Títulos de página e números grandes (KPI). |
| `--font-mono` JetBrains Mono 500 | Rótulos em maiúsculas (`.t-label`), códigos, atalhos. |
| `--font-wordmark` Lexend 400 | Só a palavra `flowbot` no logo. |

Escala: `--text-xs` 12 · `sm` 13 · `md` 14 (padrão de interface) · `base` 16 (campos) · `lg` 18 · `xl` 22 · `2xl` 28 · `3xl` 36. Cada tamanho tem `--leading-*` próprio. Números em tabelas e KPIs usam `font-variant-numeric: tabular-nums` (`.t-num`).

### Espaço, forma e elevação

- Espaço em base 4: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64.
- Raios: `--radius-xs` 6 · `sm` 9 · `md` 13 (campos) · `lg` 18 (cartões) · `xl` 24 (gavetas, modais) · `pill` (botões, chips).
- Sombras: `--shadow-1` (cartão), `--shadow-2` (controles flutuantes), `--shadow-3` (modal, gaveta, menu, toast).
- Controles: `--control-sm` 32 · `md` 40 · `lg` 48; `--touch-min` 44. Em tela de toque, botões e chips crescem sozinhos para 44px.

### Movimento

Uma linguagem só para todos os módulos (galeria: seção "Movimento").

| Token | Duração | Para quê |
| --- | --- | --- |
| `--duration-fast` | 120 ms | Toque, hover, cor, giro de seta |
| `--duration-base` | 200 ms | Troca de tela (`.view-enter`), dobra que abre (`.reveal`), menus |
| `--duration-slow` | 280 ms | Gaveta, folha inferior, painel lateral, toast |

Curvas: `--ease-out` (padrão), `--ease-emphasized` (entradas grandes), `--ease-spring` (só personagens, ícone ativo da barra inferior e marcadores do mapa).

Regras:
- Só `transform` e `opacity`. Nada de animar largura, altura, top ou left.
- Toque dá retorno na hora: `.btn`, `.pressable`, `.chip` e itens de menu encolhem para 0,97–0,98 enquanto pressionados.
- Algo novo apareceu (passo criado, por exemplo): `.pulse-once`, uma vez.
- Carregando ou salvando: o ponto do `.op-state` pisca devagar. Não há barra de progresso inventada.
- `prefers-reduced-motion: reduce` corta tudo para 1 ms em `base.css`. O teste `estudio.e2e.mjs` confere isso.

### Camadas e breakpoints

`--z-sticky` 20 · `nav` 40 · `overlay` 60 · `drawer` 70 · `menu` 80 · `toast` 90 · `tooltip` 100.

Breakpoints (use os números em `@media`): 360 (celular pequeno), 768 (tablet: tabela no lugar de cartões, gaveta lateral), 1024 (barra lateral fixa), 1280 (layout em duas colunas).

## Navegação

A estrutura é montada por `montarShell()` em `src/ui/shell.mjs`. Todo módulo usa a mesma função; a lista de módulos fica em `MODULOS`. Detalhes em `navegacao.md`.

- **Celular e tablet (< 1024px):** barra superior com logo e o **seletor de módulo** (nome do módulo atual + seta). O mesmo menu traz os outros módulos, as ações do módulo, o tema e o site. A barra inferior (`.bottomnav`) tem até 5 destinos do módulo, com respiro para a área segura.
- **Computador (≥ 1024px):** barra lateral (`.sidebar`) com os módulos agrupados (Comercial, Automação…). Abas de página (`.tabs`) para as telas do módulo.
- **Só aparece o que existe.** Nada de itens desativados com "Em breve". Um módulo em prévia leva a marca discreta `Prévia` (`.nav-item__tag`).
- Toda página tem `.skip-link` para pular ao conteúdo.

## Como criar um módulo novo

1. Crie `assets/<modulo>.css` só com layout (grid, larguras, ordem). Nada de cor ou tipografia nova.
2. Monte a tela com os componentes de `componentes.md`. Comece pelo estado vazio e pelo carregamento.
3. Regras de negócio ficam num arquivo de domínio sem DOM (como `src/prospecting.mjs`), com testes em `tests/`.
4. Valide em 320/360/390/430/768/1024/1280/1440, nos dois temas, só com teclado, com movimento reduzido e sem erros no console. Rode `tests/e2e/contraste.e2e.mjs` (WCAG AA).
5. Estados de integração usam `estadoOperacional()` e `blocoDeEstado()`, nunca texto solto. Dado fictício fica num arquivo separado e a tela diz "Demonstração".
6. Se criou algo reutilizável, mova para `components.css`, adicione à galeria e documente em `componentes.md`.
