"""Testes unitários do serviço de pedidos"""
import json
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from jose import jwt
from main import ALGORITHM, SECRET_KEY, ItemPedido, Pedido, SessionLocal, app

client = TestClient(app)

CLIENTE = "zz-teste-cliente"

def token(role="ADMIN", sub="zz-teste-admin"):
    return jwt.encode({"sub": sub, "email": f"{sub}@ecom.com", "role": role},
                      SECRET_KEY, algorithm=ALGORITHM)

def cabecalho(role="ADMIN", sub="zz-teste-admin"):
    return {"Authorization": f"Bearer {token(role, sub)}"}

def test_status():
    resp = client.get("/status")
    assert resp.status_code == 200

def test_criar_sem_token():
    resp = client.post("/v1/pedidos", json={"itens": []})
    assert resp.status_code == 401

def test_listar_sem_token():
    resp = client.get("/v1/pedidos")
    assert resp.status_code == 401

def test_obter_inexistente():
    with patch("main.get_db") as mock_db:
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        mock_db.return_value = iter([db])
        resp = client.get("/v1/pedidos/00000000-0000-0000-0000-000000000000",
                          headers={"Authorization": "Bearer token-invalido"})
    assert resp.status_code == 401  # token inválido antes de buscar no banco

@pytest.fixture
def pedidos():
    """Três pedidos do mesmo cliente de teste, em status diferentes."""
    db = SessionLocal()
    criados = [
        Pedido(usuario_id=CLIENTE, status="PENDENTE",   total=100, criado_em=datetime(2024, 1, 1, 10)),
        Pedido(usuario_id=CLIENTE, status="CONFIRMADO", total=300, criado_em=datetime(2024, 1, 3, 10)),
        Pedido(usuario_id=CLIENTE, status="CANCELADO",  total=200, criado_em=datetime(2024, 1, 2, 10)),
    ]
    for p in criados:
        db.add(p)
    db.flush()
    db.add(ItemPedido(pedido_id=criados[1].id, produto_id="prod-1",
                      nome_produto="Monitor", preco_unit=150, quantidade=2))
    db.commit()
    ids = [p.id for p in criados]
    yield ids
    db.query(ItemPedido).filter(ItemPedido.pedido_id.in_(ids)).delete(synchronize_session=False)
    db.query(Pedido).filter(Pedido.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    db.close()

def listar(role="ADMIN", sub="zz-teste-admin", **params):
    """GET /v1/pedidos já restrito aos pedidos do cliente de teste."""
    filtro = params.pop("filter", {})
    filtro.setdefault("usuario_id", CLIENTE)
    query = {"filter": json.dumps(filtro)}
    query.update({k: json.dumps(v) if isinstance(v, list) else v for k, v in params.items()})
    return client.get("/v1/pedidos", params=query, headers=cabecalho(role, sub))

def test_listar_filtra_por_status(pedidos):
    resp = listar(filter={"usuario_id": CLIENTE, "status": "CONFIRMADO"})
    assert resp.status_code == 200
    assert [p["status"] for p in resp.json()] == ["CONFIRMADO"]
    assert resp.headers["content-range"] == "pedidos 0-0/1"

def test_listar_ordena_por_criado_em(pedidos):
    resp = listar(sort=["criado_em", "DESC"])
    assert [p["total"] for p in resp.json()] == [300.0, 200.0, 100.0]

def test_range_pagina_e_preserva_total(pedidos):
    resp = listar(sort=["total", "ASC"], range=[0, 1])
    assert [p["total"] for p in resp.json()] == [100.0, 200.0]
    assert resp.headers["content-range"] == "pedidos 0-1/3"

def test_cliente_nao_ve_pedidos_de_outro_usuario(pedidos):
    resp = client.get("/v1/pedidos", headers=cabecalho("CLIENTE", "zz-outro-cliente"))
    assert resp.status_code == 200
    assert all(p["usuario_id"] != CLIENTE for p in resp.json())

def test_itens_acompanham_o_pedido_na_listagem(pedidos):
    confirmado = listar(filter={"usuario_id": CLIENTE, "status": "CONFIRMADO"}).json()[0]
    assert confirmado["itens"] == [{"produto_id": "prod-1", "nome_produto": "Monitor",
                                   "preco_unit": 150.0, "quantidade": 2}]


def test_docs_resolve_o_spec_por_url_relativa():
    """O /docs atrás do proxy do frontend não pode buscar /openapi.json na raiz.

    A raiz do host é o SPA do admin, que responde index.html — o Swagger UI
    mostraria "does not specify a valid version field". O FastAPI emite o
    `openapi_url` absoluto e, depois, os `swagger_ui_parameters`; vale o último,
    então a chave relativa precisa vir depois na configuração.
    """
    html = client.get("/docs").text
    assert html.index('"url": "openapi.json"') > html.index("url: '/openapi.json'")
    assert client.get("/openapi.json").json()["openapi"].startswith("3.")

# ── Notificação de cancelamento (best-effort) ────────────────────────────────

def test_cancelar_publica_notificacao(monkeypatch, pedidos):
    publicadas = []
    monkeypatch.setattr("main.notificar_cliente_do_pedido",
                        lambda tipo, pedido_id, usuario_id=None, payload=None:
                        publicadas.append((tipo, pedido_id, usuario_id)) or True)
    alvo = pedidos[0]
    resp = client.delete(f"/v1/pedidos/{alvo}", headers=cabecalho())
    assert resp.status_code == 200
    assert publicadas == [("PEDIDO_CANCELADO", alvo, CLIENTE)]

def test_cancelamento_vale_mesmo_sem_notificacao(monkeypatch, pedidos):
    monkeypatch.setattr("main.notificar_cliente_do_pedido",
                        lambda *a, **kw: False)   # serviço de notificações fora
    alvo = pedidos[1]
    assert client.delete(f"/v1/pedidos/{alvo}", headers=cabecalho()).status_code == 200
    db = SessionLocal()
    assert db.query(Pedido).filter(Pedido.id == alvo).first().status == "CANCELADO"
    db.close()
