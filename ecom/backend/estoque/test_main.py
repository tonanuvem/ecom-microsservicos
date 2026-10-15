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

# ── Escrita pela tela de Estoque (admin) ─────────────────────────────────────

from jose import jwt
from main import ALGORITHM, SECRET_KEY

def cabecalho():
    token = jwt.encode({"sub": "zz-teste", "role": "ADMIN"}, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}

def total_de_posicoes(db):
    return db.query(Estoque).count()

def test_editar_pelo_id_da_linha_nao_cria_posicao_fantasma(posicoes):
    """O react-admin manda o id da LINHA no PUT, não o produto_id.

    Procurar só por produto_id criava uma posição nova cujo produto_id era o id
    da linha editada — sem produto correspondente, a tela mostrava uma linha sem
    nome e a quantidade original ficava intacta.
    """
    db = SessionLocal()
    antes = total_de_posicoes(db)
    alvo = db.query(Estoque).filter(Estoque.id == posicoes[0]).first()
    produto_original = alvo.produto_id
    db.close()

    resp = client.put(f"/v1/estoque/{posicoes[0]}", json={"quantidade": 30}, headers=cabecalho())
    assert resp.status_code == 200
    assert resp.json() == {"id": posicoes[0], "produto_id": produto_original, "quantidade": 30}

    db = SessionLocal()
    assert total_de_posicoes(db) == antes          # nada de linha nova
    assert db.query(Estoque).filter(Estoque.id == posicoes[0]).first().quantidade == 30
    db.close()

def test_editar_pelo_produto_id_continua_valendo(posicoes):
    """É assim que o seed.sh e os outros serviços carregam estoque."""
    resp = client.put(f"/v1/estoque/{PREFIXO}-b", json={"quantidade": 77}, headers=cabecalho())
    assert resp.status_code == 200
    assert resp.json()["quantidade"] == 77
    assert resp.json()["produto_id"] == f"{PREFIXO}-b"

def test_put_em_produto_sem_posicao_cria(posicoes):
    novo = f"{PREFIXO}-novo"
    resp = client.put(f"/v1/estoque/{novo}", json={"quantidade": 12}, headers=cabecalho())
    assert resp.status_code == 200
    assert resp.json()["produto_id"] == novo and resp.json()["quantidade"] == 12
    db = SessionLocal()
    db.query(Estoque).filter(Estoque.produto_id == novo).delete(synchronize_session=False)
    db.commit(); db.close()

def test_criar_posicao_pela_tela(posicoes):
    novo = f"{PREFIXO}-create"
    resp = client.post("/v1/estoque", json={"produto_id": novo, "quantidade": 9}, headers=cabecalho())
    assert resp.status_code == 201
    assert resp.json()["produto_id"] == novo and resp.json()["id"]
    # Segunda vez: o produto já tem posição
    assert client.post("/v1/estoque", json={"produto_id": novo, "quantidade": 1},
                       headers=cabecalho()).status_code == 409
    db = SessionLocal()
    db.query(Estoque).filter(Estoque.produto_id == novo).delete(synchronize_session=False)
    db.commit(); db.close()

def test_criar_sem_token():
    assert client.post("/v1/estoque", json={"produto_id": "x", "quantidade": 1}).status_code == 401

def test_repontar_para_produto_ja_com_posicao_e_recusado(posicoes):
    resp = client.put(f"/v1/estoque/{posicoes[0]}",
                      json={"quantidade": 1, "produto_id": f"{PREFIXO}-b"}, headers=cabecalho())
    assert resp.status_code == 409
