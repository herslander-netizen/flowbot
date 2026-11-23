# FlowBot

Módulo do Nexus para montar e testar fluxos de atendimento em uma interface de conversa. É independente do Flow de agendamentos.

**Status:** o Modo Prospecção possui um primeiro PWA de demonstração, com funil, mapa, CSV e rascunhos sem envio. O editor de bots, o simulador conversacional e as integrações de produção ainda não estão implementados.

## Modo Prospecção — MVP executável

O projeto agora contém um aplicativo web estático, com dados fictícios de demonstração. Não usa IA, não envia WhatsApp ou e-mail e não coleta empresas automaticamente.

Para executar com Node.js 22 ou superior:

    npm run dev

Abra http://127.0.0.1:4173. Para testar:

    npm run check

Inclui importação e exportação CSV, pesquisa, mapa com Leaflet, deduplicação, notas, funil, bloqueio de contato e preparação de rascunhos (somente com fatos que tenham fonte). Dados importados vivem só na memória da aba; exporte antes de fechar. Não insira dados pessoais sensíveis.

Para o escopo, consulte docs/PROSPECCAO_MVP.md. Para o futuro backend, consulte db/migrations/001_prospeccao.sql e docs/PROSPECCAO_API_CONTRATO.md.

Esta implementação é isolada do serviço de execução https://github.com/herslander-netizen/flow-bot e do Flow SaaS.

## Primeiro piloto

1. Criar um fluxo com mensagens, perguntas, condições e transferência para uma pessoa.
2. Simular um pedido fictício de orçamento audiovisual. Coletar tipo de produção, cidade e data; deixar a equipe confirmar o preço.
3. Verificar as alternativas de resposta, a tomada de controle pela equipe e o histórico da versão testada.

O piloto não envia mensagens reais e não depende de WhatsApp, serviços pagos ou dados de clientes.

## Estrutura

- [Escopo e critérios de aceite](docs/mvp.md)
- [Exemplo de fluxo sintético](examples/orcamento-audiovisual.json) (referência de produto; ainda não executável)

Não publique segredos, sessões de dispositivos, conversas reais nem dados pessoais neste repositório.
