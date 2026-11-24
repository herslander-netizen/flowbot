# Análise do Flow: o que aproveitar de UX/UI no FlowBot

Análise só de leitura do repositório `cortai-app` (o Flow). Nada foi alterado lá.

## 1. Resumo

O Flow tem um **contrato de design** curto e rígido. Ele tem também tokens de movimento bem definidos e componentes de base maduros: botão, confirmação, desfazer, esqueleto, folha inferior e chat. O que mais vale para o FlowBot são as **regras de comportamento**, não as cores: confirmação em diálogo, desfazer de 5 s, esqueleto no formato do conteúdo, alvo de toque de 48px e movimento sem quique. A identidade visual do Flow (ciano/rosa, Manrope, marca Cortaí) não deve ser copiada. O FlowBot mantém fundo escuro, laranja #FF6B2C, Lexend, Bricolage e Inter.

## 2. Aproveitar

| Padrão | Onde está no Flow | Por que serve ao FlowBot | Como adaptar |
|---|---|---|---|
| Contrato de design: só tokens, um botão primário por tela, nada de hex solto | `docs/contrato-de-design.md` | Evita deriva visual quando o editor crescer | Já está nas "Regras de implementação" do `README.md` desta pasta |
| Botão com `loading`/`success`; spinner só depois de 150 ms; ícone exige `aria-label` | `src/components/ui/button.tsx` | O teste do fluxo e o publicar são ações assíncronas | Principal de marca em `--accent` com texto `--on-accent`; altura mínima 48px |
| Confirmação que devolve promessa (`useConfirmar` sobre AlertDialog) | `src/components/ui/useConfirmar.tsx` | Publicar fluxo e apagar bloco precisam confirmar | Botão destrutivo em `--danger`; textos curtos no tom do FlowBot |
| Fazer e oferecer "Desfazer" por 5 s (`comDesfazer`) | `src/lib/avisos.ts` | Apagar ramo ou bloco sem perguntar antes | Mesmo tempo, 5000 ms; aviso em `--surface-raised` com ação em `--accent-text` |
| Avisos por função (`aviso.ok/erro/info`), nunca toast direto | `src/lib/avisos.ts` | Um tom só para as mensagens | "Pronto." / "Não deu certo. Tenta de novo?" servem como estão |
| Esqueleto no formato do conteúdo, com região única e "Tentar de novo" depois de 10 s | `src/components/layout/Esqueleto.tsx` (`RegiaoDeEsqueleto`) | Lista de fluxos e simulação carregando | Blocos em `--surface-sunken`; sem texto visível nem giro central |
| Estados vazio, erro e sem permissão como componentes únicos | `src/components/painel/Blocos.tsx` (`Vazio`, `Erro`, `SemPermissao`) | Editor sem fluxos, falha de rede | O vazio pode mostrar um agente com olhos em arco |
| Folha inferior com alça para arrastar, `max-h-[92dvh]` e respiro da área segura | `src/components/ui/sheet.tsx` | Detalhe do bloco no celular | Fundo `--surface` e raio de 24px no topo |
| Campos `field-label` / `field-control` / `field-hint` / `field-error` | `src/styles.css` (≈ linhas 1631–1685) | Formulários do editor (texto da mensagem, condição) | Borda em `--border-strong`, foco em `--focus-ring`, erro em `--danger` |
| Foco visível global e redução de movimento | `src/styles.css` (≈ 404–416) | Acessibilidade sem trabalho extra | `outline: 2px solid var(--focus-ring)`, afastamento de 3px |
| Cabeçalho de chat: voltar · avatar · nome · um status · menu | `src/components/chat/ChatShell.tsx` (`ChatHeader`) | É o mesmo cabeçalho do celular da simulação | Avatar = agente Recepcionista; status em `--text-faint` |
| Tela-base com cabeçalho fixo e largura máxima | `src/components/layout/Screen.tsx` | Telas de gestão do editor | 760px normal, 1180px larga |
| Media query em JS só por `useMediaQuery` | `src/hooks/use-mobile.tsx` | Um único limite de layout | Mesmo limite de 768px |

## 3. Adaptar com cuidado

- **Molas sem quique** (`src/lib/motion.ts`): o Flow proíbe sobra no movimento. O FlowBot usa quique de propósito nos agentes e no título. Use as molas do Flow em **painéis, folhas e listas**, e o quique só nos personagens.
- **Sininho de avisos** (`src/lib/sino-avisos.ts`, `src/components/notificacoes/SinoDeAvisos.tsx`): a separação entre "visto" e "lido" e a regra de juntar rajadas num toque só (`deveTocar`, 900 ms) são boas. Mas o componente tem 466 linhas e muita regra do Flow: reaproveite só a lógica pura.
- **Convite de instalação do app** (`src/components/pwa/ConviteDeInstalacao.tsx`): espera 2,5 s, nunca bloqueia, respeita "Agora não" e espera o banner de cookies. Vale só quando o FlowBot virar app.
- **Escopo de tokens do chat** (`.chat-sistema` em `src/styles.css` ≈ 464): redefine os tokens do app dentro do chat, um bom jeito de dar outro tema à simulação. Copie a técnica, não os valores.
- **Avatar flutuante da IA** (`src/components/ia/FabCortai.tsx`): mostra o rótulo uma vez por sessão (4 s) e abre a folha sem navegar. Serve para um "testar agora" flutuante no editor, com o agente no lugar do ícone da IA.

## 4. Não aproveitar

- **Agenda, Modo Foco e comanda** (`src/components/barbeiro/agenda/AGENTS.md`, `src/components/comanda/AGENTS.md`): são regras de horário, gesto de troca de dia, ticket e Pix. Não existem no FlowBot.
- **Segmentos e `termos(segmento)`**: linguagem do universo de beleza. O FlowBot atende qualquer negócio.
- **Marca Cortaí**: paleta ciano/rosa (`--identity-*`), fonte Manrope, token `gold` (nome legado), fundo do chat `chat-fundo-cortai.png` e `IconeDaIA`. Tudo isso conflita com a identidade nova.
- **Cores de estado da agenda** (`--estado-*`, `--status-*`): são específicas do atendimento presencial.
- **Componentes shadcn sem uso** listados em `docs/mapa-do-codigo.md` (sidebar, carousel, chart, form, table): não trazer junto.

## 5. Tokens e valores para copiar

| Token | Valor no Flow | Origem |
|---|---|---|
| Duração rápida / base / lenta | 120 / 200 / 280 ms | `motion.ts` (`DURACAO`), `styles.css` (`--mov-*`) |
| Curva de saída | `cubic-bezier(0.2, 0, 0, 1)` | `motion.ts` (`SUAVE`), `--ease-saida` |
| Curva de entrada | `cubic-bezier(0.4, 0, 1, 1)` | `--ease-entrada` |
| Mola rápida (toque, chips) | stiffness 1400, damping 67.3 | `motion.ts` |
| Mola base (folhas, painéis) | stiffness 700, damping 47.6 | `motion.ts` |
| Mola lenta (tela inteira) | stiffness 300, damping 31.2 | `motion.ts` |
| Mola de cor e opacidade | stiffness 1600, damping 80 | `motion.ts` |
| Movimento reduzido | só esmaece, 150 ms | `motion.ts` (`transicaoReduzida`) |
| Entrada de página | opacidade 0→1, y 8→0 | `motion.ts` (`pagina`) |
| Cascata de lista | até 6 itens, 30 ms entre eles, y 6 | `motion.ts` (`cascata`) |
| Raios | sm 8 · md 12 · lg 14 px | `styles.css` (`@theme`) |
| Campo | altura 64px, texto 17px, raio 16/6 px | `styles.css` (≈ 1592–1598) |
| Rótulo / dica de campo | 14px 600 / 13px | `styles.css` |
| Alvo de toque mínimo | 48px | contrato, `button.tsx` |
| Texto mínimo | 12px | contrato |
| Barra inferior | 72px | `--tabbar-height` |
| Limite celular / computador | 768px | `use-mobile.tsx` |
| Larguras de tela | 760px / 1180px | `Screen.tsx` |
| Desfazer | 5000 ms | `avisos.ts` |
| Spinner do botão | aparece depois de 150 ms | `button.tsx` |
| Esqueleto demorado | aviso depois de 10 s | `Esqueleto.tsx` |
| Validação | sempre em 390px e 1280px | contrato |

Os raios do Flow (8/12/14) são menores que os do FlowBot (9/13/24). Mantenha os do FlowBot; o resto da tabela vale como está.
