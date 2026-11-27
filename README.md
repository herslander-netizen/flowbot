# FlowBot

Módulo do Nexus para montar e testar fluxos de atendimento em uma interface de conversa. É independente do Flow de agendamentos.

**Status:** o Modo Prospecção possui um primeiro PWA de demonstração, com funil, mapa, CSV e rascunhos sem envio. O editor de bots, o simulador conversacional e as integrações de produção ainda não estão implementados.

## Modo Prospecção — MVP executável

O projeto agora contém um aplicativo web estático, com dados fictícios de demonstração. Não usa IA nem envia WhatsApp ou e-mail. A pesquisa de empresas por CEP só ocorre quando o usuário solicita e cada inclusão no funil é manual.

Para executar com Node.js 22 ou superior:

    npm run dev

Abra http://127.0.0.1:4173. Outras páginas: a landing em http://127.0.0.1:4173/landing/ e a galeria do design system em http://127.0.0.1:4173/design-system.html.

Para testar:

    npm run check       # sintaxe e testes de unidade (também roda no CI)
    npm run test:e2e    # testes de navegador; precisa do servidor ligado e do Playwright com Chromium

Inclui importação e exportação CSV, pesquisa, mapa com Leaflet, deduplicação, notas, funil, bloqueio de contato e preparação de rascunhos (somente com fatos que tenham fonte). Dados importados vivem só na memória da aba; exporte antes de fechar. Não insira dados pessoais sensíveis.

**Busca por CEP:** o painel consulta ViaCEP e OpenStreetMap por um proxy same-origin no servidor local. Filtre por segmento e raio; adicione cada empresa ao funil manualmente e confira sua fonte. O CEP fornece apenas uma área aproximada, não um cadastro oficial de empresas. Em Cloudflare Pages, a API está desligada até configurar D1 e habilitá-la explicitamente. Consulte [Busca de empresas por CEP](docs/BUSCA_EMPRESAS_CEP.md).

Para o escopo, consulte docs/PROSPECCAO_MVP.md. Para o futuro backend, consulte db/migrations/001_prospeccao.sql e docs/PROSPECCAO_API_CONTRATO.md.

Esta implementação é isolada do serviço de execução https://github.com/herslander-netizen/flow-bot e do Flow SaaS.

## Primeiro piloto

1. Criar um fluxo com mensagens, perguntas, condições e transferência para uma pessoa.
2. Simular um pedido fictício de orçamento audiovisual. Coletar tipo de produção, cidade e data; deixar a equipe confirmar o preço.
3. Verificar as alternativas de resposta, a tomada de controle pela equipe e o histórico da versão testada.

O piloto não envia mensagens reais e não depende de WhatsApp, serviços pagos ou dados de clientes.

## Identidade visual e design system

- Marca, logo, agentes e tokens de cor: [docs/identidade](docs/identidade/README.md)
- Design system (regras, componentes, padrões dos próximos módulos): [docs/design-system](docs/design-system/README.md)

## Estrutura

- [Escopo e critérios de aceite](docs/mvp.md)
- [Exemplo de fluxo sintético](examples/orcamento-audiovisual.json) (referência de produto; ainda não executável)

Não publique segredos, sessões de dispositivos, conversas reais nem dados pessoais neste repositório.
