# Modo Prospecção — PWA e primeiro marco técnico

Status em 23/11/2026: MVP local demonstrável. Ainda não é um SaaS multi-tenant nem está conectado ao motor de atendimento.

## O que funciona

- Mapa interativo de pontos reais de coordenadas (empresas de exemplo são fictícias).
- Cadastro manual de empresas, etapas do funil, filtros, busca, anotações e bloqueio de contato.
- Importação CSV (UTF-8, 500 empresas, limite 1 MB) com colunas:
  empresa;cidade;uf;segmento;cnpj;site;latitude;longitude;fato;fonte fato
- Deduplicação por CNPJ ou nome normalizado + cidade + UF.
- Rascunho determinístico com personalização por dados fornecidos e fatos só com URL de origem.
- Exportação CSV que neutraliza fórmulas de planilhas.
- Testes com Node.js 22; nenhum serviço pago necessário para a lógica.

## Interface (design system v1)

- Celular: barra inferior com Resumo, Mapa, Empresas e Adicionar; detalhes e cadastro em folha inferior.
- Computador: barra lateral com os módulos (os próximos aparecem como "Em breve"), resumo e funil lado a lado, mapa e lista juntos.
- Resumo calculado dos registros: total, em andamento, taxa de ganho (só quando há negócios encerrados) e não contatar. Tocar numa etapa do funil filtra.
- Mapa com legenda, agrupamento de pontos próximos, cartão da empresa selecionada e tema escuro. Empresas marcadas como não contatar têm anel vermelho.
- Detalhes em seções: etapa, pontuação com cada critério, identificação, localização ("Ver no mapa"), evidências, notas, não contatar, rascunho e histórico da sessão.
- Atalhos: `/` busca, Esc fecha painéis e seleções. Tema claro e escuro.

## Instruções locais

Execute "npm run dev" com Node.js 22 ou superior e abra http://127.0.0.1:4173.
Execute "npm run check" para validar sintaxe e testes de unidade e "npm run test:e2e" (com o servidor ligado e o Playwright instalado) para os testes de navegador.

O PWA não persiste registros: tudo fica na memória da aba. Após atualizar ou fechar, perde as alterações. Exporte o arquivo CSV antes de sair. Não use dados pessoais sensíveis ou dados reais de clientes nesta versão de demonstração.

O mapa usa Leaflet (biblioteca livre) e tiles públicos do OpenStreetMap com atribuição. A biblioteca Leaflet é carregada via CDN. Para clientes, avaliar licença e política do fornecedor de tiles e as obrigações de dados ODbL; não assumir que tiles públicos servem a SaaS de alto tráfego.

## Escopo NÃO implementado

A pesquisa automática de empresas, o enriquecimento por IA, a API de backend com autenticação, a persistência em PostgreSQL, o bloqueio de contatos por canal, o registro de consentimento, a central de atendimento e os envios reais continuam pendentes.

As telas não contêm qualquer integração com Evolution, WhatsApp ou e-mail. O modo de prospecção é separado do motor flow-bot e do Flow SaaS.

## Próximas fases

1. Aplicar a migração SQL apenas em ambiente de teste FlowBot isolado, criar credencial de aplicação sem BYPASSRLS e testar cross-tenant.
2. API autenticada, paginação, importação processada no backend com auditoria e limites.
3. Conectar PWA à API, remover dados somente em memória, implantar autenticação, backup e exclusão segura.
4. Descoberta de empresas via fontes autorizadas/contratadas com licença e procedência registradas; sem scraping de plataformas que o proíbem.
5. Rascunho com IA opcional e limites de custo, fatos rastreáveis, revisão humana.
6. Outbound somente após homologação do canal, prova de opt-in exigida pela plataforma, regras de horário, supressão, idempotência e handoff.

Critérios de não liberação: dados de tenant A acessíveis a B, mensagens após opt-out, personalização sem fonte, ação sem revisão, instabilidade não reconciliada ou ausência de política operacional de privacidade.

Referências de trabalho: https://github.com/herslander-netizen/flowbot (produto); https://github.com/herslander-netizen/flow-bot (motor); plano comercial na PR de confiabilidade do motor.