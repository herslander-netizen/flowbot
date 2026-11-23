# FlowBot

Módulo do Nexus para montar e testar fluxos de atendimento em uma interface de conversa. É independente do Flow de agendamentos.

**Status:** estrutura inicial. O editor, o simulador e as integrações ainda não estão implementados.

## Primeiro piloto

1. Criar um fluxo com mensagens, perguntas, condições e transferência para uma pessoa.
2. Simular um pedido fictício de orçamento audiovisual. Coletar tipo de produção, cidade e data; deixar a equipe confirmar o preço.
3. Verificar as alternativas de resposta, a tomada de controle pela equipe e o histórico da versão testada.

O piloto não envia mensagens reais e não depende de WhatsApp, serviços pagos ou dados de clientes.

## Estrutura

- [Escopo e critérios de aceite](docs/mvp.md)
- [Exemplo de fluxo sintético](examples/orcamento-audiovisual.json) (referência de produto; ainda não executável)

Não publique segredos, sessões de dispositivos, conversas reais nem dados pessoais neste repositório.
