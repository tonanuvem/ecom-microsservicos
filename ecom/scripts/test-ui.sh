#!/bin/bash
# test-ui.sh — Executa os testes unitários do frontend e verifica build
# Uso: ./test-ui.sh [--build]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

echo "=== Testes Unitários do Frontend ==="
cd "$FRONTEND_DIR"

# Instala dependências se necessário
if [ ! -d "node_modules" ]; then
  echo "Instalando dependências..."
  npm ci --silent
fi

# Executa testes unitários com vitest
echo ""
echo "Executando testes unitários (vitest)..."
npm test

# Verifica se há localhost hardcoded no código-fonte (exceto .env e configs)
echo ""
echo "Verificando uso de localhost hardcoded no código-fonte..."
LOCALHOST_FOUND=$(grep -rn "localhost" src/ --include="*.jsx" --include="*.js" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "$LOCALHOST_FOUND" ]; then
  echo "⚠️  ATENÇÃO: localhost encontrado nos arquivos abaixo (deve usar variável de ambiente):"
  echo "$LOCALHOST_FOUND"
else
  echo "✅ Nenhum localhost hardcoded encontrado no código-fonte."
fi

# Build opcional para validar que compila sem erros
if [[ "$1" == "--build" ]]; then
  echo ""
  echo "Executando build de produção..."
  npm run build
  echo "✅ Build concluído com sucesso."
fi

echo ""
echo "=== Testes finalizados ==="
