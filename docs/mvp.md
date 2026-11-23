# Primeiro piloto

## Experiência
No celular: escolher um fluxo, editar a sequência como uma conversa, simular uma resposta e ver por que a próxima etapa foi selecionada. O painel separa edição e simulação e indica quando uma pessoa assumiu.

## Fluxo e limites
- Tipos iniciais: mensagem, pergunta, condição, transferência e encerramento.
- A execução referencia uma versão imutável do fluxo. Rascunhos rejeitam gravações com revisão antiga para não sobrescrever alterações.
- O primeiro piloto é determinístico e usa dados fictícios. Não conecta WhatsApp, não chama modelos, não envia contatos para terceiros e não publica em produção.
- Se houver persistência no servidor, isolar espaços de trabalho. Não armazenar conversas, sessões ou respostas autenticadas no cache offline.

## Critérios de aceite
- Simular tipo de produção, cidade e data; a equipe confirma o preço, não o bot.
- Escolher o caminho correto para uma entrada válida ou pedir correção sem registrar dados incompletos.
- Uma entrada duplicada não avança duas vezes e não cria duas transferências.
- Depois da transferência, o bot não continua automaticamente.
- Quando o Nexus estiver operacional, usar sua equipe para detalhar requisitos, implementar e revisar, em etapas separadas.

## Fora desta fase
Campanhas, múltiplos agentes durante o atendimento e envio real por WhatsApp. Não depende do Flow de agendamentos.
