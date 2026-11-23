# Contrato planejado — API de Prospecção v1

Esta é uma especificação para a próxima fase, ainda sem endpoints implementados.

## Segurança e autorização

- Tenant vem da autenticação verificada no servidor; não aceitar tenant_id enviado pelo navegador.
- Usar usuário PostgreSQL sem bypass de RLS; aplicar SET LOCAL app.tenant_id dentro da transação.
- Segmentar toda consulta, escrita, evento e evidência pelo mesmo tenant.
- Identificar cada usuário e escopo: prospects:read, prospects:write, drafts:write, compliance:write.
- Registrar ator, data, origem e alteração sem incluir segredos ou dados pessoais desnecessários em logs.

## Endpoints esperados

GET /api/v1/prospects
Lista paginada, com filtros de cidade, segmento e etapa.

POST /api/v1/prospects
Cadastro manual com dados estruturados e procedência obrigatória.

POST /api/v1/prospects/import
Importação de CSV com validação, deduplicação por tenant, limite de tamanho e relatório de erros.

PATCH /api/v1/prospects/:id
Alterações de etapa e notas com validação, permissão e trilha de auditoria.

POST /api/v1/prospects/:id/evidence
Fato verificável, fonte URL, data e política de retenção; não confundir opinião com dado comprovado.

POST /api/v1/prospects/:id/drafts
Criar/editar rascunho SEM envio. Necessita revisão humana para aprovação.

POST /api/v1/prospects/:id/suppress
Bloquear contatos e cancelar jobs agendados. A operação deve ser idempotente.

GET /api/v1/prospects/geo
Somente coordenadas autorizadas do tenant, com paginação ou bounding box; não extrair telefones.

## Envio deliberadamente ausente

Não existe endpoint /send neste contrato. Enviar demanda integração homologada, prova da permissão específica por canal, opt-out e supressão, horário comercial, limites e prevenção de duplicidade, trilha de auditoria e tomada humana segura no motor.

## Testes de aceite antes de produção

1. Usuário sem sessão ou sem escopo não lê nem escreve registros.
2. Tenant A nunca acessa ou modifica registro do tenant B, nem em falhas ou jobs.
3. Importar duas vezes o mesmo CSV não duplica empresas.
4. URL maliciosa, CSV irregular e payloads excessivos são rejeitados.
5. Opt-out impede todas as tentativas futuras do canal e atravessa sessões/processos.
6. Estado de campanha e rascunho não implicam consentimento ou autorização para enviar.
7. Requisição idempotente repetida não cria duas operações.
8. Nenhum dado de cliente é armazenado no navegador sem política de autenticação e armazenamento revisada.

A migração em db/migrations/001_prospeccao.sql é apenas um ponto de partida: revisar com testes de banco e políticas antes de executar.