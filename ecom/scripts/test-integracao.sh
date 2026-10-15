#!/bin/bash
# test-integracao.sh — Executa os testes de integração Cucumber
# Os microsserviços devem estar rodando antes de executar este script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTES_DIR="$SCRIPT_DIR/../testes_integracao"

# Variáveis de ambiente para os endpoints (padrão: localhost)
export USUARIOS_URL=${USUARIOS_URL:-http://localhost:8001}
export PRODUTOS_URL=${PRODUTOS_URL:-http://localhost:8002}
export ESTOQUE_URL=${ESTOQUE_URL:-http://localhost:8003}
export PEDIDOS_URL=${PEDIDOS_URL:-http://localhost:8004}
export PAGAMENTOS_URL=${PAGAMENTOS_URL:-http://localhost:8005}
export NOTIFICACOES_URL=${NOTIFICACOES_URL:-http://localhost:8006}

echo "=== Testes de Integração — E-Commerce ==="
echo "Endpoints:"
echo "  Usuários:     $USUARIOS_URL"
echo "  Produtos:     $PRODUTOS_URL"
echo "  Estoque:      $ESTOQUE_URL"
echo "  Pedidos:      $PEDIDOS_URL"
echo "  Pagamentos:   $PAGAMENTOS_URL"
echo "  Notificações: $NOTIFICACOES_URL"
echo ""

cd "$TESTES_DIR"
mvn test -Dusarios.url="$USUARIOS_URL" \
         -Dprodutos.url="$PRODUTOS_URL" \
         -Destoque.url="$ESTOQUE_URL" \
         -Dpedidos.url="$PEDIDOS_URL" \
         -Dpagamentos.url="$PAGAMENTOS_URL" \
         -Dnotificacoes.url="$NOTIFICACOES_URL"
