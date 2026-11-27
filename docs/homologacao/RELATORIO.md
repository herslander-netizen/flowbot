# FlowBot — relatório de homologação visual (24/11/2026)

Branch candidata: `feat/flowbot-homologacao`. Ela reúne todo o trabalho de interface aberto no repositório em uma só base, para a revisão e a homologação. Nada foi mesclado na `main` e nada foi publicado. O motor (`flow-bot`), a Evolution Alvo, o Alvo OS, o Flow, o Alvo Hub, os bancos e a Oracle não foram alterados.

## 1. Auditoria das PRs e consolidação

| PR | Conteúdo | Situação na branch candidata |
| --- | --- | --- |
| #2 | Modo Prospecção (PWA, mapa, CSV, rascunhos) | Incluída (base da pilha) |
| #1 | Landing e identidade | Incluída (via #6) |
| #6 | Design system v1, Prospecção nova, landing | Incluída |
| #11 | Bot Studio visual | Incluída |
| #14 | Fase E | Incluída |
| #15 | Fase F (referência visual mais recente) | Incluída |
| #16 | Cliente autenticado do gateway D3 | **Base da branch.** `gateway-preview.mjs` e o teste dele estão intactos |
| #3, #4, #10 | Backend Supabase/RLS, Worker, origem e "Não contatar" na API | Incluídas por merge, sem conflito |
| #8, #9, #13 | "Não contatar" no novo design, teste no celular, coordenadas negativas no CSV | Incluídas. Conflitos em `app.mjs` (texto do aviso), `package.json` e CI resolvidos somando as duas partes |
| #5 | "Não contatar" no CSV e nos rascunhos (interface antiga) | Incluída. A lógica já estava portada pela #8; nenhum teste da #5 ficou de fora |
| #7 | Tela de conexão WhatsApp | Incluída. A navegação passou para o registro único de módulos |
| #12 | Busca de empresas por CEP (OSM) | Incluída. A importação do shell foi refeita depois do merge e a busca ficou alcançável no celular |

Os merges foram feitos sem reescrever histórico, para que cada PR continue rastreável.

**Componentes duplicados removidos ou unificados:**

- Navegação do WhatsApp: saiu o menu próprio e a tela entrou em `MODULOS`.
- Utilitários genéricos do Bot Studio (`.fold`, `.kv`, `.bullet-list`, `.empty-art`, `.drawer__sub`, `.icon--xs`, `code`) passaram para `components.css`.
- A cor `--fg-3` da landing passou a usar o mesmo valor de `--text-faint`.

**Funcionalidades em risco de se perder e conferidas por teste:**

- "Não contatar" é irreversível, apaga o rascunho, bloqueia preparar e copiar e sobrevive à reimportação do CSV (#5/#8/#9).
- Coordenadas negativas no CSV continuam aceitas (#13).
- Busca por CEP com fonte OSM obrigatória e sem consultar a fonte com CEP inválido (#12).
- Tela do WhatsApp sem script e com um único link externo (#7).
- Contrato do gateway (#16).

## 2. Refinamentos desta etapa

- **Prospecção:**
  - Cabeçalho mais curto. As ações ficaram em "Adicionar empresa", "Buscar por CEP" e um menu "⋯" para importar e exportar CSV, no lugar de quatro botões.
  - Os indicadores viraram uma superfície só com filetes, em vez de quatro cartões.
  - O aviso de demonstração virou uma faixa de uma linha, mantendo as ressalvas legais da #8.
  - No celular, "Buscar por CEP" aparece no resumo e no menu do módulo.
- **Conexão WhatsApp:**
  - Ganhou a mesma barra do app, com o símbolo e a volta para a Prospecção.
  - Status em uma superfície, métodos lado a lado com filete, `op-state` no lugar de selos e faixa de aviso.
  - Continua estática, sem script e sem fontes externas, como a #7 exige.
- **Navegação:** a entrada "WhatsApp" fica no grupo "Integrações" e não quebra mais a linha.
- **Agentes:** nova seção "Agentes de outros produtos" (Alvo Hub, Hermes, OpenClaw, MausBot). Todos aparecem como "Não conectado", com contrato a definir e sem permissões; nada é simulado.
- **PWA:** o manifesto passou a se chamar "FlowBot" e ganhou atalhos para o Bot Studio e a Prospecção.
- **Landing:** o contraste dos textos de apoio e dos cartões de exemplo passa AA. A identidade não mudou.

## 3. Design system (fonte única)

| Assunto | Onde |
| --- | --- |
| Tokens (cor, tipo, espaço, borda, elevação, movimento, camadas, breakpoints) | `assets/tokens.css` |
| Componentes e padrões | `assets/components.css`. Inclui estados operacionais, faixas, registro de trabalho, trilho de ciclo, busca, folhas e utilitários |
| Comportamentos | `src/ui/componentes.mjs`: estados, folha com arrasto, teclado, foco, menus, avisos |
| Navegação | `src/ui/shell.mjs` (`MODULOS`) |
| Ícones | `src/ui/icones.mjs` |
| CSS por módulo, só layout | `prospeccao.css`, `estudio.css`, `cep-search.css`, `whatsapp.css` |
| Galeria e documentação | `design-system.html`, `docs/design-system/` |

## 4. Testes

### Executados (resultados reais desta branch)

| Teste | Resultado |
| --- | --- |
| `npm run check`: sintaxe e 70 testes unitários (domínio, CSV, CEP, backend/Worker, gateway, contrato D3, sincronia, cenários contra saídas reais do motor) | **70/70** |
| `tests/e2e/prospeccao.e2e.mjs` (larguras, mapa, filtros, cadastro, não contatar, CSV, teclado, tema, landing, galeria, folha com arrasto, CEP) | **22/22** |
| `tests/e2e/estudio.e2e.mjs`. Larguras: 320, 360, 390, 430, 768, 1024, 1280 e 1440px. Conflito, permissão, sessão, indisponível. Fluxo de 59 passos, gestos, teclado, movimento reduzido | **31/31** |
| `tests/e2e/suppression-roundtrip.e2e.mjs` (390px, "Não contatar" sobrevive ao CSV) | **Passou** |
| `tests/e2e/contraste.e2e.mjs`: WCAG AA de todo texto visível nos dois temas. Telas: Prospecção, Bot Studio, WhatsApp e landing (esta depois de rolar a página inteira) | **Passou** |
| Capturas em 8 larguras e 2 temas de todas as telas, antes e depois (164 + 164), sem rolagem horizontal e sem erro no console | **Passou** |
| Desempenho com a CPU 6× mais lenta | Bot Studio a 390px: DOMContentLoaded 225 ms, troca de tela de 62 a 68 ms. Fluxo de 59 passos a 1440px: 179 ms, troca de 90 a 203 ms, nenhuma tarefa longa ao arrastar o canvas. Prospecção a 390px: 544 ms, sem tarefas longas |

### Pendentes (não executados; não considerar aprovados)

- **Android real e PWA instalada:**
  - teclado virtual;
  - barra de gestos;
  - toque prolongado;
  - pinça no canvas;
  - densidades de tela reais.

  Tudo isso foi testado só com emulação do navegador.
- **Leitor de tela real** (TalkBack ou VoiceOver). Os testes cobrem foco, teclado, rótulos e contraste, mas não um leitor de tela.
- **Testes de backend contra Supabase e Cloudflare reais (#3/#4/#10).** Os testes unitários usam dubles; não houve banco nem Worker publicados.
- **Gateway D3 real:** não há ambiente HTTPS de homologação acessível daqui.

## 5. Capturas

Pasta `capturas/`:

- `todas-celular-390-escuro.png`, `todas-celular-390-claro.png`, `todas-celular-320-escuro.png` e `todas-computador-1440.png`: todas as telas.
- `celular-*` e `computador-*`: antes e depois desta etapa, nas mesmas dimensões.

As capturas das fases anteriores seguem em `docs/design-system/capturas/`.

## 6. Pendências exclusivamente funcionais

1. **Login e fonte real no Bot Studio.**
   - A PR #16 traz o cliente do gateway (sessão, rascunho, histórico, simulação, aprovação atual), mas a interface ainda usa a fonte de demonstração.
   - Falta, na ordem:
     1. detectar o gateway na mesma origem;
     2. mostrar o formulário de entrada (`POST /studio/session`: 401 `invalid_credentials`, 429 `rate_limited`);
     3. trocar a fonte.
   - Os dados de `carregarEspaco()` (negócio, bots, versão publicada, perfil e cenários independentes) não têm contrato no motor.
2. **Aprovação pela API.** No cliente da #16, `aprovar` responde 403 até existir a origem independente dos cenários (decisão do motor).
3. **Publicação, oficina com Claude e histórico de execução dos agentes:** não existem no motor.
4. **Agentes de outros produtos** (Alvo Hub, Hermes, OpenClaw, MausBot): não há contrato de integração.
5. **Conexão WhatsApp:** o pareamento por QR ou código depende da validação de segurança no servidor da Evolution Alvo. A tela só consulta o painel.
6. **Backend da Prospecção (#3):** falta aplicar as migrações num banco de homologação, publicar o Worker e ligar o cliente `prospeccao-api-client.mjs` à interface. Hoje os dados ficam na aba.
7. **Busca por CEP (#12):** depende da Function do Cloudflare Pages (`functions/api/prospeccao/cep.js`) publicada. Localmente só funciona com o servidor de desenvolvimento.
8. **Tema claro na página do WhatsApp:** a página não tem script, então não lê a preferência do app. Para segui-la, é preciso aceitar um script mínimo ou usar `prefers-color-scheme`.
9. **PWA offline:** não há service worker; a instalação funciona sem modo offline.

## 7. Riscos

- **Branch grande:** reúne 15 PRs. Se a escolha for mesclar uma a uma, a ordem precisa respeitar a pilha (#2 → #1 → #6 → #11 → #14 → #15 → #16) e depois as demais. Mesclar esta branch fecha todas de uma vez.
- **CI com Playwright (#9):** o workflow instala o Chromium do Playwright 1.57.0. Se a rede do CI bloquear o download, esse passo falha sem relação com o código.
- **Contrato da API de autoria:** se a PR #21 do motor mudar rotas ou códigos, só `contrato.mjs`, `gateway-preview.mjs` e os testes de contrato precisam acompanhar.
