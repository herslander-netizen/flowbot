# Tokens de cor

O sistema de cor tem três camadas:

1. **Primitivos:** as escalas cruas (`--laranja-500`, `--neutro-900`). Não se usam direto na tela.
2. **Papéis:** o que a tela usa (`--text`, `--surface`, `--accent`, `--danger`). Cada papel tem um valor no tema escuro e outro no claro.
3. **Personagens:** cores fixas dos agentes e das boinas de patente. Não mudam com o tema e **nunca** são usadas em botão, link ou estado.

Arquivos: `tokens/tokens.css` (pronto para usar) e `tokens/tokens.json` (fonte).

## Primitivos

| Escala | Tons |
| --- | --- |
| `neutro` | 0 `#FFFFFF` · 50 `#FAFAF8` · 100 `#F0EFEB` · 200 `#E2E0DA` · 300 `#C9C6BF` · 400 `#A8A49D` · 500 `#8C8882` · 600 `#6B6862` · 700 `#4A4844` · 800 `#2A2927` · 850 `#1C1C1A` · 900 `#141413` · 950 `#0B0B0B` |
| `laranja` | 50 `#FFF3ED` · 100 `#FFE2D1` · 200 `#FFC3A1` · 300 `#FF9D68` · 400 `#FF8044` · 500 `#FF6B2C` · 600 `#E5521A` · 700 `#C2410C` · 800 `#9A3412` · 900 `#6B2410` |
| `verde` | 50 `#E7F6EF` · 300 `#6EE7B7` · 400 `#34D399` · 700 `#047857` · 900 `#04130D` |
| `ambar` | 50 `#FDF3E2` · 300 `#FCD34D` · 400 `#FBBF24` · 500 `#F59E0B` · 800 `#92400E` · 900 `#1A0F00` |
| `vermelho` | 50 `#FBEAEA` · 300 `#FCA5A5` · 400 `#F87171` · 700 `#C62828` · 900 `#1A0505` |
| `azul` | 50 `#EAF0FD` · 300 `#93C5FD` · 400 `#60A5FA` · 700 `#1D4ED8` · 900 `#06132A` |

## Papéis

| Token | Escuro | Claro | Uso |
| --- | --- | --- | --- |
| `bg` | `#0B0B0B` | `#FAFAF8` | Fundo da página. |
| `surface` | `#141413` | `#FFFFFF` | Cartões, painéis, celular da demo. |
| `surface-sunken` | `#1C1C1A` | `#F0EFEB` | Campos, linhas de bloco, bolha do bot, trilhos. |
| `surface-raised` | `#232321` | `#FFFFFF` | Menus, popovers e toasts acima de um cartão. |
| `overlay` | `rgba(0,0,0,.64)` | `rgba(11,11,11,.40)` | Fundo atrás de modal e folha inferior. |
| `text` | `#F5F5F5` | `#0B0B0B` | Texto principal e títulos. |
| `text-muted` | `#BCBAB4` | `#4A4844` | Texto de apoio e parágrafos de seção. |
| `text-faint` | `#8C8882` | `#6B6862` | Rótulos em mono, legendas, placeholders. |
| `text-disabled` | `#5C5955` | `#A8A49D` | Texto de controle desativado (não precisa de 4,5:1). |
| `text-inverse` | `#0B0B0B` | `#F5F5F5` | Texto sobre superfície invertida, como o botão claro. |
| `border-subtle` | `rgba(245,245,245,.08)` | `rgba(11,11,11,.08)` | Divisórias leves, base da navegação. |
| `border` | `rgba(245,245,245,.14)` | `rgba(11,11,11,.14)` | Borda padrão de cartão e lista. |
| `border-strong` | `rgba(245,245,245,.42)` | `rgba(11,11,11,.48)` | Borda de campo em foco e controles (3:1). |
| `accent` | `#FF6B2C` | `#C2410C` | Laranja FlowBot: ação de marca, foco, cursor, bolha do cliente. |
| `accent-hover` | `#FF8044` | `#9A3412` | Accent ao passar o mouse. |
| `accent-text` | `#FF8044` | `#C2410C` | Link e texto em laranja sobre bg, surface e sunken. |
| `accent-subtle` | `rgba(255,107,44,.14)` | `#FFF3ED` | Fundo de item selecionado, chip ativo. |
| `on-accent` | `#1A0A02` | `#FFFFFF` | Texto sobre accent cheio. |
| `focus-ring` | `#FF8044` | `#C2410C` | Anel de foco de 2px com 3px de afastamento. |
| `success` | `#34D399` | `#047857` | Equipe assumiu, transferência, etapa vencida. |
| `success-subtle` | `rgba(52,211,153,.14)` | `#E7F6EF` | Fundo de aviso de sucesso. |
| `on-success` | `#04130D` | `#FFFFFF` | Texto sobre success cheio. |
| `warning` | `#FBBF24` | `#92400E` | Atenção: ramo sem teste, limite chegando. |
| `warning-subtle` | `rgba(245,158,11,.14)` | `#FDF3E2` | Fundo de aviso de atenção. |
| `on-warning` | `#1A0F00` | `#FFFFFF` | Texto sobre warning cheio. |
| `danger` | `#F87171` | `#C62828` | Erro e validação. Vermelho mais claro que o do Guardião. |
| `danger-subtle` | `rgba(248,113,113,.14)` | `#FBEAEA` | Fundo de aviso de erro. |
| `on-danger` | `#1A0505` | `#FFFFFF` | Texto sobre danger cheio. |
| `info` | `#60A5FA` | `#1D4ED8` | Informação neutra, dica, novidade. |
| `info-subtle` | `rgba(96,165,250,.14)` | `#EAF0FD` | Fundo de aviso informativo. |
| `on-info` | `#06132A` | `#FFFFFF` | Texto sobre info cheio. |
| `state-hover` | `rgba(245,245,245,.06)` | `rgba(11,11,11,.05)` | Camada sobre item ao passar o mouse. |
| `state-pressed` | `rgba(245,245,245,.10)` | `rgba(11,11,11,.09)` | Camada sobre item pressionado. |
| `highlight` | `rgba(245,158,11,.30)` | `rgba(245,158,11,.28)` | Marca-texto de dado coletado na conversa. |
| `chat-bot` | `#1C1C1A` | `#F0EFEB` | Bolha do bot. |
| `chat-client` | `#FF6B2C` | `#C2410C` | Bolha do cliente (texto em on-accent). |
| `chat-team` | `rgba(52,211,153,.14)` | `#E7F6EF` | Bolha de quem é da equipe (texto em text). |

### Regras de uso

- **Texto** sempre em `--text`, `--text-muted` ou `--text-faint`. `--text-disabled` só em controle desativado.
- **Laranja como texto** é `--accent-text`, não `--accent`: no escuro, o laranja puro fica pesado em texto pequeno.
- **Estados** (`success`, `warning`, `danger`, `info`): use o tom cheio para ícone e texto, `*-subtle` para o fundo do aviso e `on-*` para texto sobre o tom cheio.
- **Erro x Guardião:** `--danger` é um vermelho mais claro que o do agente Guardião (`--agent-guardiao`). Erro é sempre pequeno (texto, ícone, borda de campo); o coração vermelho é personagem.
- **Seleção:** item selecionado = fundo `--accent-subtle` + texto `--text`. Hover e pressionado são camadas `--state-hover` e `--state-pressed` por cima da superfície.
- **Bordas de controle** (campo, caixa de seleção) usam `--border-strong`, que tem 3:1 com o fundo. Divisórias usam `--border` ou `--border-subtle`.
- **Conversa:** bolha do bot em `--chat-bot`, do cliente em `--chat-client` com texto `--on-accent`, da equipe em `--chat-team`. Dado coletado vai em `<mark>` com fundo `--highlight`.

## Personagens

| Token | Valor | Uso |
| --- | --- | --- |
| `agent-flowbot` | `#FF6B2C` | Asterisco: a marca. |
| `agent-recepcionista` | `#38BDF8` | Balão de chat. |
| `agent-qualificador` | `#FACC15` | Estrela. |
| `agent-passador` | `#34D399` | Avião de papel. |
| `agent-guardiao` | `#EF4444` | Coração. |
| `agent-novo` | `#A78BFA` | Raio, agentes criados pelo usuário. |

## Patentes (boinas)

| Token | Valor | Uso |
| --- | --- | --- |
| `patente-1` | `#F1EEE7` | Boina branca, nível 1. |
| `patente-2` | `#8E939C` | Boina cinza, nível 2. |
| `patente-3` | `#24408E` | Boina azul-marinho, nível 3. |
| `patente-4` | `#2F6B45` | Boina verde-musgo, nível 4. |
| `patente-5` | `#8C1F3D` | Boina vinho, nível 5. |
| `patente-6` | `#1C1C20` | Boina preta, nível 6: o topo. |

As cores das boinas foram escolhidas para contrastar com todos os agentes. Por isso não há boina ciano, verde, laranja, amarela ou vermelha.

## Contraste

Os 90 pares de texto e fundo dos dois temas passam no mínimo do WCAG AA: 4,5:1 para texto e 3:1 para borda de controle e anel de foco. A lista completa está em `tokens/contraste.json`. Alguns pares de referência, incluindo os mais justos:

| Tema | Par | Contraste | Mínimo |
| --- | --- | --- | --- |
| Escuro | `text-faint` sobre `bg` | 5,59:1 | 4,5:1 |
| Escuro | `text-faint` sobre `surface-sunken` | 4,84:1 | 4,5:1 |
| Escuro | `accent-text` sobre `bg` | 7,89:1 | 4,5:1 |
| Escuro | `accent-text` sobre `surface-sunken` | 6,85:1 | 4,5:1 |
| Escuro | `warning` sobre `bg` | 11,79:1 | 4,5:1 |
| Escuro | `warning` sobre `surface-sunken` | 10,22:1 | 4,5:1 |
| Escuro | `on-accent` sobre `accent` | 6,79:1 | 4,5:1 |
| Escuro | `border-strong` sobre `bg` | 3,82:1 | 3,0:1 |
| Claro | `text-faint` sobre `bg` | 5,31:1 | 4,5:1 |
| Claro | `text-faint` sobre `surface-sunken` | 4,83:1 | 4,5:1 |
| Claro | `accent-text` sobre `bg` | 4,96:1 | 4,5:1 |
| Claro | `accent-text` sobre `surface-sunken` | 4,5:1 | 4,5:1 |
| Claro | `warning` sobre `bg` | 6,78:1 | 4,5:1 |
| Claro | `warning` sobre `surface-sunken` | 6,16:1 | 4,5:1 |
| Claro | `on-accent` sobre `accent` | 5,18:1 | 4,5:1 |
| Claro | `border-strong` sobre `bg` | 3,43:1 | 3,0:1 |
