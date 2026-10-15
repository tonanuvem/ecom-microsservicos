"""Testes unitários do serviço de produtos"""
import json

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app, exigir_admin, Produto, SessionLocal

client = TestClient(app)

PREFIXO = "zz-teste-listagem"   # isola as linhas destes testes do banco de exemplo

def test_status():
    resp = client.get("/status")
    assert resp.status_code == 200

def test_listar_sem_auth():
    with patch("main.get_db") as mock_db:
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []
        mock_db.return_value = iter([db])
        resp = client.get("/v1/produtos")
    assert resp.status_code == 200

def test_criar_sem_token_retorna_401():
    resp = client.post("/v1/produtos", json={"nome": "X", "preco": 10.0})
    assert resp.status_code == 401

def test_buscar_inexistente():
    # Usa banco SQLite real de teste — UUID inexistente deve retornar 404
    from main import get_db
    resp = client.get("/v1/produtos/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404

@pytest.fixture
def catalogo():
    """Três produtos (dois ativos, um inativo) com nome prefixado."""
    db = SessionLocal()
    itens = [
        Produto(nome=f"{PREFIXO} alfa",   preco=10, descricao="um",   ativo=True),
        Produto(nome=f"{PREFIXO} bravo",  preco=30, descricao="dois", ativo=True),
        Produto(nome=f"{PREFIXO} charlie", preco=20, descricao="tres", ativo=False),
    ]
    for p in itens:
        db.add(p)
    db.commit()
    ids = [p.id for p in itens]
    yield ids
    db.query(Produto).filter(Produto.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    db.close()

def listar(**params):
    """GET /v1/produtos já restrito aos produtos do teste."""
    filtro = params.pop("filter", {})
    filtro.setdefault("nome", PREFIXO)
    query = {"filter": json.dumps(filtro)}
    query.update({k: json.dumps(v) if isinstance(v, list) else v for k, v in params.items()})
    return client.get("/v1/produtos", params=query)

def test_listar_oculta_inativos_por_padrao(catalogo):
    resp = listar()
    assert resp.status_code == 200
    nomes = [p["nome"] for p in resp.json()]
    assert sorted(nomes) == [f"{PREFIXO} alfa", f"{PREFIXO} bravo"]

def test_incluir_inativos_traz_catalogo_completo(catalogo):
    resp = listar(incluir_inativos="true")
    assert len(resp.json()) == 3
    assert any(p["ativo"] is False for p in resp.json())

def test_filtro_ativo_false_traz_apenas_desativados(catalogo):
    resp = listar(filter={"ativo": False})
    assert [p["nome"] for p in resp.json()] == [f"{PREFIXO} charlie"]

def test_listar_devolve_criado_em(catalogo):
    assert all(p["criado_em"] for p in listar().json())

def test_ordenacao_por_preco(catalogo):
    resp = listar(incluir_inativos="true", sort=["preco", "DESC"])
    assert [p["preco"] for p in resp.json()] == [30.0, 20.0, 10.0]

def test_range_pagina_e_informa_total_no_content_range(catalogo):
    resp = listar(incluir_inativos="true", sort=["preco", "ASC"], range=[1, 2])
    assert [p["preco"] for p in resp.json()] == [20.0, 30.0]
    assert resp.headers["content-range"] == "produtos 1-2/3"

def test_filtro_por_lista_de_ids_atende_get_many(catalogo):
    alvo = catalogo[:2]
    resp = client.get("/v1/produtos", params={"filter": json.dumps({"id": alvo})})
    assert sorted(p["id"] for p in resp.json()) == sorted(alvo)

def test_filtro_desconhecido_nao_zera_a_lista(catalogo):
    assert len(listar(filter={"campo_inexistente": "x"}).json()) == 2

def test_busca_textual_q_cobre_nome_e_descricao(catalogo):
    resp = listar(filter={"q": "bravo"})
    assert [p["nome"] for p in resp.json()] == [f"{PREFIXO} bravo"]


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
