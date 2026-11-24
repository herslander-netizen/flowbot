---
name: teste
description: Roda todos os testes do FlowBot (unitários e de navegador da Prospecção e do Bot Studio) e resume o resultado. Use quando pedirem para testar, rodar os testes ou conferir se algo quebrou.
---

# Teste

1. Rode `.claude/skills/teste/rodar.sh` a partir de qualquer pasta do repositório. Ele:
   - roda `npm run check`, que faz a checagem de sintaxe e os testes unitários de `tests/*.test.mjs`;
   - sobe `node scripts/serve.mjs` se `http://127.0.0.1:4173/` não responder, e desliga o servidor no fim;
   - roda `tests/e2e/prospeccao.e2e.mjs` e `tests/e2e/estudio.e2e.mjs` com o Playwright instalado fora do projeto (`NODE_PATH=$(npm root -g)`).
2. Os testes de navegador são lentos, então rode com timeout de pelo menos 5 minutos.
3. Responda em português com:
   - quantos testes passaram em cada parte;
   - o nome exato de cada caso que falhou, com a mensagem;
   - se algo não rodou (por exemplo, Playwright ausente), diga isso, sem tratar como aprovado.
4. Não altere testes para fazê-los passar e não pule casos. Se um teste falhar, investigue a causa antes de propor correção.
5. O Playwright não é dependência do projeto. Não rode `npm install playwright` nem `playwright install` sem o dono pedir.
