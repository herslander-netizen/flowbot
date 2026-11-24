# FlowBot — Prospecção por CEP (MVP isolado)

## O que faz
O usuário abre **Prospecção → Buscar por CEP**, escolhe um CEP, raio (500 m, 1, 3 ou 5 km) e segmento. O backend consulta:

1. **ViaCEP:** logradouro, bairro, cidade e UF (não retorna empresas).
2. **Nominatim/OpenStreetMap:** centro geográfico aproximado do logradouro; se falhar, tenta o município e **avisa** sobre menor precisão.
3. **Overpass/OpenStreetMap:** estabelecimentos com nome e tags comerciais próximos ao centro. Retorna até 60 empresas, já filtradas por segmento e distância.

Cada resultado informa nome, categoria, distância aproximada e **link direto para a fonte OpenStreetMap**. Clicando em **Adicionar**, o usuário cria manualmente um registro no funil, com origem `osm_cep_importacao_manual`, link da fonte em notas, etapa `pesquisado` e `optInWhatsapp=false`. Deduplicação segue a regra existente de nome + cidade + UF ou CNPJ. Nenhuma mensagem é enviada.

**Não é cadastro oficial de CNPJ, nem garantia de completude ou existência do negócio.** A localização e a precisão dependem dos registros públicos do OSM; nenhum telefone, contato pessoal, opt-in ou autorização comercial pode ser inferido.

## Homologação online isolada — 24/11/2026 UTC

Uma prévia foi carregada no Worker **flowbot-cep-homologacao** da conta Cloudflare dos pilotos. Não existe projeto Pages associado, porque a criação com conexão GitHub falhou com erro 8000011 da instalação Cloudflare–GitHub. Por isso, foi usado um Worker separado, com arquivos públicos fixados por SHA de commit da PR #12.

- Link de acesso privado fornecido ao operador. Não registrar o token no repositório.
- Cookie de autenticação HttpOnly temporário. A rota /health informa somente estado operacional.
- D1 independente flowbot-cep-preview, com três tabelas e migração aplicada e verificada.
- CEP_SEARCH_ENABLED=1 apenas nesse Worker de homologação protegido, não em produção nem Pages.
- Interface carregou no navegador remoto de largura 390 px com botão de busca por CEP.
- CI da PR com testes de unidade aprovados. Ainda não houve teste bem-sucedido com empresas reais: Nominatim e Overpass recusaram chamadas externas. Fallback por BrasilAPI v2 e Overpass Private.coffee foi testado com respostas simuladas; nova verificação externa ficou inconclusiva devido ao bloqueio da ferramenta de teste.
- A instalação é homologação técnica parcial, não prova de que as buscas reais estejam operacionais. Android físico e persistência no CRM ainda não foram validados.

Para liberar o uso, são necessários: fonte de negócios que funcione no edge, autenticação por tenant, controle de quota por usuário e testes reais. Não aumentar tentativas nem mudar instâncias para contornar bloqueios HTTP 403/429.
## Ambiente de desenvolvimento

O servidor de desenvolvimento Node.js disponibiliza a API same-origin `GET /api/prospeccao/cep?cep=49000000&raio=1000&segmento=todos`. Ele não precisa de chaves:

```sh
npm run dev
# em outro terminal
npm run check
```

Abra `http://127.0.0.1:4173`. O Node escuta apenas no loopback da máquina local. O backend usa cache em memória de dez minutos e limita chamadas ao Nominatim à cadência de uma a cada 1,2 segundo. Não usar essa rota Node como backend público sem autenticação, observabilidade e limites persistentes.

## Cloudflare Pages Functions (preparado, NÃO ativado)

A Function `functions/api/prospeccao/cep.js` mantém o mesmo contrato de API em Pages. Ela fica **desabilitada por padrão** e retorna HTTP 503 caso falte `CEP_SEARCH_ENABLED=1` ou o D1 `CEP_SEARCH_DB`.

Antes de habilitar em prévia isolada:

1. Criar D1 exclusivo para busca geográfica do FlowBot, sem usar os bancos de Flow/Alvo OS.
2. Aplicar **manualmente** `db/migrations/002_cep_search_d1.sql` ao D1 correto.
3. Configurar o binding D1 `CEP_SEARCH_DB` no projeto Cloudflare Pages.
4. Configurar `CEP_SEARCH_ENABLED=1` **somente em ambiente de homologação**, após analisar as regras da fonte e limitar quem pode acessar.
5. Testar CEP válido, inválido, localização imprecisa, falha/429 do Overpass, limite de chamadas, importação e duplicidades em Android e desktop.
6. Para uso comercial com vários usuários, adicionar autenticação/autorização de tenant no backend antes de liberar o endpoint ao público. O MVP não implementa login nem RLS.

O D1 registra apenas chave CEP/raio/segmento, resposta pública, tempo de validade, contador diário e janela global de consultas. Não armazena número de telefone ou mensagens. Limites conservadores: um novo pedido não-cacheado a cada 3 segundos, 50 por dia, e até uma chamada Nominatim a cada 1,25 segundo, aplicados com operações atômicas no D1. Cache de buscas por dez minutos. A capacidade é compartilhada por todos na mesma instalação: não serve para coleta em massa.

**Não publicar ou fazer merge desta branch automaticamente.** A PR depende do Design System v1 da #6 e não altera a Evolution Alvo nem o motor `flow-bot`.

## Fontes e regras

- ViaCEP — https://viacep.com.br/
- BrasilAPI CEP V2 — https://brasilapi.com.br/docs (coordenadas aproximadas, quando disponíveis)
- Overpass comunitário — https://overpass.private.coffee/api/ (fallback transitório, nunca para HTTP 403/429)
- Nominatim Usage Policy — https://operations.osmfoundation.org/policies/nominatim/ (máximo 1 consulta/s global, identificação da aplicação e cache; não usar como autocomplete)
- Overpass API — https://dev.overpass-api.de/overpass-doc/en/preface/commons.html (pode retornar 429; evitar requisições pesadas)
- OpenStreetMap copyright — https://www.openstreetmap.org/copyright

O mapa já credita © OpenStreetMap. A lista inclui o link individual de cada registro. Dados incompletos, associados ao CEP da área e não ao CEP exato de cada empresa. Nunca fazer disparos em massa nem contatar negócios apenas por encontrá-los publicamente.

## Limitações deste primeiro MVP

- Importações persistem **somente em memória nesta aba**; use a exportação CSV existente para salvar. A infraestrutura Postgres/RLS da Prospecção segue sem implantação.
- A prévia estática do Claude Artifact **não oferece a rota /api**: nesse contexto a UI informa indisponibilidade e não finge ter encontrado resultados.
- Não consulta CNPJ público, telefones, Google Maps, avaliações, horário comercial ou WhatsApp.
- O teste de navegadores no Android real e a ativação de Pages Functions continuam pendentes.
