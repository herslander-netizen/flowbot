# FlowBot — API Prospecção v1 / Cloudflare Workers + Supabase

**Implementação parcial em branch de backend. Não implantada nem integrada ao PWA.**
Em Cloudflare, o arquivo de entrada é \`worker/index.mjs\`. O modelo RLS está em
\`db/migrations/001_prospeccao.sql\`, ainda **não aplicado** em projeto Supabase.

## Arquitetura

1. A interface usa Supabase Auth para obter um access token de usuário autenticado.
2. \`src/prospeccao-api-client.mjs\` injeta o token por solicitação, sem guardá-lo em localStorage.
3. O Worker recebe o Bearer JWT e consulta \`/auth/v1/user\` para validá-lo.
4. O Worker usa a chave **publicável** do Supabase para chamar o PostgREST, com o Bearer do usuário.
5. A decisão final de autorização é tomada pelas políticas RLS com \`auth.uid()\` e \`flowbot_workspace_members\`.

O \`workspaceId\` é um seletor de espaço, **não é prova de acesso**. Um usuário pode modificar esse parâmetro, mas as políticas RLS devem recusar empresas das quais ele não participa. É proibido configurar \`service_role\` no frontend ou nas chamadas de usuário do Worker.

**Atenção:** para começar, um administrador precisa cadastrar um workspace e associar o primeiro usuário na tabela de memberships, usando credencial privada e processo administrativo seguro. Usuários comuns não podem criar ou atribuir memberships.

## Rotas implementadas

- \`GET /api/v1/workspaces\` — lista workspaces autorizados.
- \`GET /api/v1/prospects?workspaceId=<uuid>&limit=50&stage=lead\` — lista prospects da empresa autenticada.
- \`POST /api/v1/prospects\` — \`{"workspaceId":"uuid","prospect":{"nome":"Empresa Exemplo","cidade":"Aracaju","uf":"SE"}}\`.
- \`PATCH /api/v1/prospects/:id\` — etapa, notas ou \`suppressed:true\` no workspace solicitado.

A resposta contém \`{"data": ...}\` ou \`{"erro": "..."}\`. Nenhuma rota envia mensagens, captura contatos, faz scraping ou concede consentimento. O bloqueio de contato é irreversível pela API atual. O SQL também inclui proteção para impedir que uma atualização direta via PostgREST retire \`suppressed=true\`.

## Configuração futura do Worker

Variáveis/segredos via Cloudflare (não em repositório):

- \`SUPABASE_URL\`: URL HTTPS do projeto **flowbot** (\`*.supabase.co\`).
- \`SUPABASE_PUBLISHABLE_KEY\`: chave **publicável** do projeto, nunca secret/service_role.
- \`ALLOWED_ORIGINS\`: lista separada por vírgula das origens web autorizadas (inclua a origem do PWA de prévia e depois a de produção).

Configurar Workers Static Assets no deployment quando desejar servir frontend e API na mesma origem. Se não existir binding \`ASSETS\`, a API devolve 404 fora das rotas \`/api/\`. Não copiar scripts ou bindings TapFlow antigos para o novo projeto.

## Verificações antes de ativar

- Aplicar SQL somente no projeto Supabase FlowBot recém-criado, **não** em \`cortai-prod\`, \`cortai-preview\` ou Alvo OS.
- Confirmar RLS e escopos reais em Postgres: usuário A vê A; usuário B vê B; sem membership não enxerga dados.
- Testar escrita, isolamento, fallback 401/403 e bloqueio de contato contra um banco real.
- Executar advisors de segurança Supabase; revisar grants e Data API.
- Validar Auth, URL, permissões CORS e login/expiração da sessão no celular.
- Integrar PWA depois da implementação da identidade visual do Claude, sem sobrescrever a branch dele.
- Proteger a aplicação contra abuso de quotas, criar auditoria persistente e política de retenção antes de pilotos externos.

## Limitações intencionais

Testes de \`tests/backend.test.mjs\` são simulações de HTTP/REST; **não comprovam** isolamento em banco real. Não há ainda importação CSV por API, evidências, drafts persistentes, RBAC operacional completo nem auditoria durável de mudanças. A interface continua com dados em memória. A implantação depende da criação do Supabase dedicado e da configuração de credenciais.

**Não aplicar nem publicar em produção automaticamente.**
