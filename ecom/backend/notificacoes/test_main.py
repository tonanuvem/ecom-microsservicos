"""Testes unitários do serviço de notificações"""
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

def test_status():
    resp = client.get("/status")
    assert resp.status_code == 200

def test_enviar_sem_token():
    resp = client.post("/v1/notificacoes", json={
        "tipo": "PEDIDO_CONFIRMADO", "destinatario_email": "x@x.com"
    })
    assert resp.status_code == 401

def test_listar_sem_token():
    resp = client.get("/v1/notificacoes")
    assert resp.status_code == 401

# ── Contrato de listagem do ra-data-simple-rest ──────────────────────────────

import json
import uuid

import pytest
from jose import jwt
from main import ALGORITHM, Notificacao, SECRET_KEY, SessionLocal

def cabecalho():
    token = jwt.encode({"sub": "zz-teste", "role": "ADMIN"}, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def fila():
    """Três notificações com destinatário prefixado."""
    marca = f"zz-lote-{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    criadas = [
        Notificacao(tipo="PEDIDO_CONFIRMADO",  destinatario_email=f"{marca}-a@test.com", status="ENVIADO"),
        Notificacao(tipo="PAGAMENTO_RECUSADO", destinatario_email=f"{marca}-b@test.com", status="FALHA"),
        Notificacao(tipo="PEDIDO_CONFIRMADO",  destinatario_email=f"{marca}-c@test.com", status="ENFILEIRADO"),
    ]
    for n in criadas:
        db.add(n)
    db.commit()
    ids = [n.id for n in criadas]
    yield marca, ids
    db.query(Notificacao).filter(Notificacao.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    db.close()

def listar(marca, **params):
    filtro = params.pop("filter", {})
    filtro.setdefault("destinatario_email", marca)
    query = {"filter": json.dumps(filtro)}
    query.update({k: json.dumps(v) if isinstance(v, list) else v for k, v in params.items()})
    return client.get("/v1/notificacoes", params=query, headers=cabecalho())

def test_listar_filtra_por_status(fila):
    marca, _ = fila
    resp = listar(marca, filter={"destinatario_email": marca, "status": "FALHA"})
    assert resp.status_code == 200
    assert [n["tipo"] for n in resp.json()] == ["PAGAMENTO_RECUSADO"]
    assert resp.headers["content-range"] == "notificacoes 0-0/1"

def test_listar_ordena_e_pagina(fila):
    marca, _ = fila
    resp = listar(marca, sort=["destinatario_email", "DESC"], range=[0, 1])
    assert [n["destinatario_email"] for n in resp.json()] == [f"{marca}-c@test.com", f"{marca}-b@test.com"]
    assert resp.headers["content-range"] == "notificacoes 0-1/3"

def test_filtro_por_lista_de_ids_atende_get_many(fila):
    _, ids = fila
    resp = client.get("/v1/notificacoes", params={"filter": json.dumps({"id": ids[:2]})},
                      headers=cabecalho())
    assert sorted(n["id"] for n in resp.json()) == sorted(ids[:2])


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
