#!/bin/bash
# seed.sh — Insere dados realistas em todos os microsserviços via APIs REST

set -e

BASE_URL=${BASE_URL:-http://localhost}

aguardar_servico() {
  local url=$1 nome=$2
  echo "Aguardando $nome..."
  for i in $(seq 1 30); do
    if curl -sf "$url/status" > /dev/null 2>&1; then echo "  ✓ $nome pronto"; return 0; fi
    sleep 2
  done
  echo "  ✗ $nome não respondeu em 60s"; exit 1
}

aguardar_servico "$BASE_URL:8001" "usuarios"
aguardar_servico "$BASE_URL:8002" "produtos"
aguardar_servico "$BASE_URL:8003" "estoque"
aguardar_servico "$BASE_URL:8004" "pedidos"
aguardar_servico "$BASE_URL:8005" "pagamentos"
aguardar_servico "$BASE_URL:8006" "notificacoes"

echo ""
echo "=== Inserindo dados iniciais ==="

# ── Usuários ──────────────────────────────────────────────────────────────────
echo "Criando usuários..."
curl -sf -X POST "$BASE_URL:8001/v1/usuarios" -H "Content-Type: application/json" \
  -d '{"nome":"Administrador","email":"admin@ecom.com","senha":"Admin@123"}' > /dev/null 2>&1 || true

curl -sf -X POST "$BASE_URL:8001/v1/usuarios" -H "Content-Type: application/json" \
  -d '{"nome":"Ana Souza","email":"ana@ecom.com","senha":"Cliente@123"}' > /dev/null 2>&1 || true

curl -sf -X POST "$BASE_URL:8001/v1/usuarios" -H "Content-Type: application/json" \
  -d '{"nome":"Bruno Lima","email":"bruno@ecom.com","senha":"Cliente@123"}' > /dev/null 2>&1 || true

curl -sf -X POST "$BASE_URL:8001/v1/usuarios" -H "Content-Type: application/json" \
  -d '{"nome":"Carla Mendes","email":"carla@ecom.com","senha":"Cliente@123"}' > /dev/null 2>&1 || true

# Promover admin
docker exec singlenode-db-usuarios-1 psql -U ecom -d usuarios \
  -c "UPDATE usuarios SET role='ADMIN' WHERE email='admin@ecom.com';" > /dev/null 2>&1 || true

# Token admin
echo "Obtendo token admin..."
TOKEN=$(curl -sf -X POST "$BASE_URL:8001/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ecom.com","senha":"Admin@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

[ -z "$TOKEN" ] && echo "  ✗ Falha ao obter token." && exit 1
echo "  ✓ Token obtido"

AUTH="-H \"Authorization: Bearer $TOKEN\""

criar_produto() {
  local json=$1
  echo "$json" | curl -sf -X POST "$BASE_URL:8002/v1/produtos" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d @- | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null
}

# ── Produtos com imagens reais do Unsplash ────────────────────────────────────
echo "Criando produtos..."

P1=$(criar_produto '{
  "nome": "Notebook UltraSlim Pro 15",
  "descricao": "Intel Core i7, 16GB RAM, SSD 512GB, tela Full HD IPS antirreflexo",
  "preco": 5499.90,
  "imagem_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80"
}')

P2=$(criar_produto '{
  "nome": "Mouse Gamer RGB Precision",
  "descricao": "16000 DPI, 7 botões programáveis, iluminação RGB 16M cores",
  "preco": 249.90,
  "imagem_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80"
}')

P3=$(criar_produto '{
  "nome": "Teclado Mecânico TKL",
  "descricao": "Switches Cherry MX Red, layout TKL, retroiluminação RGB por tecla",
  "preco": 429.90,
  "imagem_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80"
}')

P4=$(criar_produto '{
  "nome": "Monitor 27\" 4K IPS 144Hz",
  "descricao": "Resolução 3840x2160, HDR400, 1ms, FreeSync Premium, USB-C 65W",
  "preco": 3299.90,
  "imagem_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&q=80"
}')

P5=$(criar_produto '{
  "nome": "Headset Gamer 7.1 Surround",
  "descricao": "Som surround virtual 7.1, microfone retrátil com cancelamento de ruído",
  "preco": 399.90,
  "imagem_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80"
}')

P6=$(criar_produto '{
  "nome": "Webcam Full HD 1080p",
  "descricao": "1080p 30fps, autofoco, microfone duplo integrado, compatível com Teams/Zoom",
  "preco": 299.90,
  "imagem_url": "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&q=80"
}')

P7=$(criar_produto '{
  "nome": "SSD NVMe 1TB Gen4",
  "descricao": "Leitura 7000 MB/s, gravação 6500 MB/s, interface PCIe 4.0 x4",
  "preco": 649.90,
  "imagem_url": "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80"
}')

P8=$(criar_produto '{
  "nome": "Cadeira Gamer ErgoMax",
  "descricao": "Apoio lombar ajustável, braços 4D, reclinável 180°, suporta até 150kg",
  "preco": 1899.90,
  "imagem_url": "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&q=80"
}')

echo "  Produtos criados: $P1 $P2 $P3 $P4 $P5 $P6 $P7 $P8"

# ── Estoque (variado: alguns baixos para o dashboard ficar interessante) ───────
echo "Inserindo estoque..."
set_estoque() {
  local pid=$1 qty=$2
  [ -z "$pid" ] && return
  curl -sf -X PUT "$BASE_URL:8003/v1/estoque/$pid" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"quantidade\":$qty}" > /dev/null
  echo "  ✓ $pid → $qty un."
}

set_estoque "$P1" 45
set_estoque "$P2" 120
set_estoque "$P3" 8     # baixo
set_estoque "$P4" 3     # crítico
set_estoque "$P5" 60
set_estoque "$P6" 0     # esgotado
set_estoque "$P7" 90
set_estoque "$P8" 5     # baixo

# ── Pedidos com itens referenciando produtos ──────────────────────────────────
echo "Criando pedidos..."

criar_pedido() {
  local itens_json=$1
  curl -sf -X POST "$BASE_URL:8004/v1/pedidos" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"itens\":$itens_json}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''), d.get('total',0))" 2>/dev/null
}

# Pedido 1: Notebook + Mouse + Teclado
read PED1_ID PED1_TOTAL <<< $(criar_pedido "[
  {\"produto_id\":\"$P1\",\"nome_produto\":\"Notebook UltraSlim Pro 15\",\"preco_unit\":5499.90,\"quantidade\":1},
  {\"produto_id\":\"$P2\",\"nome_produto\":\"Mouse Gamer RGB Precision\",\"preco_unit\":249.90,\"quantidade\":1},
  {\"produto_id\":\"$P3\",\"nome_produto\":\"Teclado Mecânico TKL\",\"preco_unit\":429.90,\"quantidade\":1}
]")
echo "  Pedido 1: $PED1_ID (R\$ $PED1_TOTAL)"

# Pedido 2: Monitor + Webcam
read PED2_ID PED2_TOTAL <<< $(criar_pedido "[
  {\"produto_id\":\"$P4\",\"nome_produto\":\"Monitor 27\\\" 4K IPS 144Hz\",\"preco_unit\":3299.90,\"quantidade\":1},
  {\"produto_id\":\"$P6\",\"nome_produto\":\"Webcam Full HD 1080p\",\"preco_unit\":299.90,\"quantidade\":1}
]")
echo "  Pedido 2: $PED2_ID (R\$ $PED2_TOTAL)"

# Pedido 3: Headset + SSD x2
read PED3_ID PED3_TOTAL <<< $(criar_pedido "[
  {\"produto_id\":\"$P5\",\"nome_produto\":\"Headset Gamer 7.1 Surround\",\"preco_unit\":399.90,\"quantidade\":1},
  {\"produto_id\":\"$P7\",\"nome_produto\":\"SSD NVMe 1TB Gen4\",\"preco_unit\":649.90,\"quantidade\":2}
]")
echo "  Pedido 3: $PED3_ID (R\$ $PED3_TOTAL)"

# Pedido 4: Cadeira
read PED4_ID PED4_TOTAL <<< $(criar_pedido "[
  {\"produto_id\":\"$P8\",\"nome_produto\":\"Cadeira Gamer ErgoMax\",\"preco_unit\":1899.90,\"quantidade\":1}
]")
echo "  Pedido 4: $PED4_ID (R\$ $PED4_TOTAL)"

# ── Pagamentos: confirmar pedidos 1 e 3, cancelar pedido 4 ───────────────────
echo "Processando pagamentos..."

pagar_e_confirmar() {
  local ped_id=$1 valor=$2
  [ -z "$ped_id" ] && return
  IDEM="pay-$ped_id"
  # Cria sessão
  curl -sf -X POST "$BASE_URL:8005/v1/pagamentos/sessao" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"pedido_id\":\"$ped_id\",\"valor\":$valor}" > /dev/null
  # Webhook de aprovação
  curl -sf -X POST "$BASE_URL:8005/v1/pagamentos/webhook" \
    -H "Content-Type: application/json" \
    -d "{\"idempotency_key\":\"$IDEM\",\"pedido_id\":\"$ped_id\",\"status\":\"APROVADO\",\"referencia_ext\":\"EXT-$(echo $ped_id | cut -c1-8)\"}" > /dev/null
  # Atualiza status do pedido
  curl -sf -X PATCH "$BASE_URL:8004/v1/pedidos/$ped_id/status" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"status":"CONFIRMADO"}' > /dev/null
  echo "  ✓ Pedido $ped_id CONFIRMADO"
}

pagar_e_confirmar "$PED1_ID" "$PED1_TOTAL"
pagar_e_confirmar "$PED3_ID" "$PED3_TOTAL"

# Pedido 2: pagamento recusado
if [ -n "$PED2_ID" ]; then
  curl -sf -X POST "$BASE_URL:8005/v1/pagamentos/sessao" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"pedido_id\":\"$PED2_ID\",\"valor\":$PED2_TOTAL}" > /dev/null
  curl -sf -X POST "$BASE_URL:8005/v1/pagamentos/webhook" \
    -H "Content-Type: application/json" \
    -d "{\"idempotency_key\":\"pay-$PED2_ID\",\"pedido_id\":\"$PED2_ID\",\"status\":\"RECUSADO\"}" > /dev/null
  echo "  ✗ Pedido $PED2_ID RECUSADO (pagamento)"
fi

# Pedido 4: cancelado
if [ -n "$PED4_ID" ]; then
  curl -sf -X DELETE "$BASE_URL:8004/v1/pedidos/$PED4_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "  ✗ Pedido $PED4_ID CANCELADO"
fi

echo ""
echo "=== Seed concluído com sucesso! ==="
echo ""
echo "Usuários:"
echo "  admin@ecom.com   / Admin@123   (ADMIN)"
echo "  ana@ecom.com     / Cliente@123 (CLIENTE)"
echo "  bruno@ecom.com   / Cliente@123 (CLIENTE)"
echo "  carla@ecom.com   / Cliente@123 (CLIENTE)"
echo ""
echo "Produtos criados: 8 produtos com imagens reais"
echo "Pedidos criados:  4 pedidos (2 confirmados, 1 recusado, 1 cancelado)"
echo "Estoque:          2 produtos críticos (<5), 1 esgotado, 1 baixo (<10)"
