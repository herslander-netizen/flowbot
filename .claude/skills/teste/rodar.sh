#!/usr/bin/env bash
# Roda todos os testes do FlowBot: unitários e de navegador (Prospecção e Bot Studio).
# Sobe o servidor local se ele não estiver no ar e o desliga no fim.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
URL="${FLOWBOT_URL:-http://127.0.0.1:4173/}"
falhou=0

echo "== Unitários (npm run check)"
saida=$(npm run check --silent 2>&1) || falhou=1
echo "$saida" | grep -E "^# (pass|fail)|^not ok|Error"

servidor=""
if ! curl -s -o /dev/null "$URL"; then
  node scripts/serve.mjs >/dev/null 2>&1 & servidor=$!
  for _ in $(seq 1 20); do curl -s -o /dev/null "$URL" && break; sleep 0.25; done
fi

if node -e "require.resolve('playwright', { paths: [process.env.NODE_PATH || ''] })" 2>/dev/null \
   || NODE_PATH="$(npm root -g)" node -e "require('playwright')" 2>/dev/null; then
  export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
  for arquivo in tests/e2e/prospeccao.e2e.mjs tests/e2e/estudio.e2e.mjs; do
    echo "== Navegador: $arquivo"
    saida=$(FLOWBOT_URL="$URL" node "$arquivo" 2>&1) || falhou=1
    echo "$saida" | grep -E "FALHOU|passaram"
  done
else
  echo "== Navegador: Playwright não encontrado; testes de navegador não rodaram."
  falhou=1
fi

[ -n "$servidor" ] && kill "$servidor" 2>/dev/null
[ "$falhou" = 0 ] && echo "RESULTADO: tudo passou" || echo "RESULTADO: há falhas (veja acima)"
exit "$falhou"
