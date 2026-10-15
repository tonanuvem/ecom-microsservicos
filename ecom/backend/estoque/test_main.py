"""Testes unitários do serviço de estoque"""
import json

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import Estoque, SessionLocal, app

client = TestClient(app)

PREFIXO = "zz-teste-sku"

def test_status():
    resp = client.get("/status")
    assert resp.status_code == 200

def test_disponibilidade():
    with patch("main.get_db") as mock_db:
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        mock_db.return_value = iter([db])
        resp = client.get("/v1/estoque/disponibilidade?produto_ids=pid-001")
    assert resp.status_code == 200
    assert "disponibilidade" in resp.json()

def test_reservar_sem_token():
    resp = client.post("/v1/estoque/reservas", json={"pedido_id": "p1", "produto_id": "pr1", "quantidade": 1})
    assert resp.status_code == 401

def test_atualizar_sem_token():
    resp = client.put("/v1/estoque/pid-001", json={"quantidade": 10})
    assert resp.status_code == 401

@pytest.fixture
def posicoes():
    """Três posições de estoque com produto_id prefixado."""
    db = SessionLocal()
    itens = [
        Estoque(produto_id=f"{PREFIXO}-a", quantidade=0),
        Estoque(produto_id=f"{PREFIXO}-b", quantidade=50),
        Estoque(produto_id=f"{PREFIXO}-c", quantidade=5),
    ]
    for e in itens:
        db.add(e)
    db.commit()
    ids = [e.id for e in itens]
    yield ids
    db.query(Estoque).filter(Estoque.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    db.close()

def listar(**params):
    """GET /v1/estoque já restrito às posições do teste."""
    filtro = params.pop("filter", {})
    filtro.setdefault("produto_id", PREFIXO)
    query = {"filter": json.dumps(filtro)}
    query.update({k: json.dumps(v) if isinstance(v, list) else v for k, v in params.items()})
    return client.get("/v1/estoque", params=query)

def test_listar_filtra_por_produto(posicoes):
    resp = listar(filter={"produto_id": f"{PREFIXO}-b"})
    assert resp.status_code == 200
    assert [i["quantidade"] for i in resp.json()] == [50]

def test_listar_ordena_por_quantidade(posicoes):
    resp = listar(sort=["quantidade", "DESC"])
    assert [i["quantidade"] for i in resp.json()] == [50, 5, 0]

def test_range_pagina_e_informa_total(posicoes):
    resp = listar(sort=["quantidade", "ASC"], range=[0, 1])
    assert [i["quantidade"] for i in resp.json()] == [0, 5]
    assert resp.headers["content-range"] == "estoque 0-1/3"

def test_filtro_por_lista_de_ids_atende_get_many(posicoes):
    alvo = posicoes[:2]
    resp = client.get("/v1/estoque", params={"filter": json.dumps({"id": alvo})})
    assert sorted(i["id"] for i in resp.json()) == sorted(alvo)

def test_sort_em_campo_inexistente_e_ignorado(posicoes):
    assert len(listar(sort=["campo_inexistente", "ASC"]).json()) == 3


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
