#!/bin/bash
# start.sh — Inicia toda a solução via docker-compose e executa o seed de dados
# Uso: ./start.sh [--no-seed] [--build]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$SCRIPT_DIR/../infra/docker-compose/singlenode"
SEED_SCRIPT="$SCRIPT_DIR/seed.sh"

BUILD_FLAG=""
RUN_SEED=true

for arg in "$@"; do
  case $arg in
    --no-seed) RUN_SEED=false ;;
    --build)   BUILD_FLAG="--build" ;;
  esac
done

echo "=== Iniciando solução E-Commerce ==="
echo "Diretório: $COMPOSE_DIR"

# Detecta IP público para embutir no bundle do frontend (VITE_* são build-time)
PUBLIC_IP=$(curl -sf https://checkip.amazonaws.com 2>/dev/null || echo "localhost")

cd "$COMPOSE_DIR"
docker compose up -d $BUILD_FLAG

echo ""
echo "Containers iniciados. Aguardando serviços ficarem prontos..."
sleep 5

# Executa seed de dados
if [ "$RUN_SEED" = true ]; then
  echo ""
  bash "$SEED_SCRIPT"
fi

echo ""
echo "=== Solução em execução ==="
docker compose ps

# Exibe IP público e URLs do Swagger
PUBLIC_IP=$(curl -sf https://checkip.amazonaws.com 2>/dev/null || echo "localhost")
echo ""
echo "IP Público: $PUBLIC_IP"
echo ""
echo "Swagger UI dos microsserviços:"
echo "  Usuários:     http://$PUBLIC_IP:8001/docs"
echo "  Produtos:     http://$PUBLIC_IP:8002/docs"
echo "  Estoque:      http://$PUBLIC_IP:8003/docs"
echo "  Pedidos:      http://$PUBLIC_IP:8004/docs"
echo "  Pagamentos:   http://$PUBLIC_IP:8005/docs"
echo "  Notificações: http://$PUBLIC_IP:8006/docs"
echo ""
echo "Frontend:       http://$PUBLIC_IP:3000"
