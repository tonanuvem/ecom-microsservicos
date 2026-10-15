"""Testes unitários do serviço de usuários"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app, hash_senha, verificar_senha, criar_token

client = TestClient(app)

def test_hash_e_verificar_senha():
    # Senha curta para evitar limite de 72 bytes do bcrypt
    h = hash_senha("Abc@123")
    assert verificar_senha("Abc@123", h)
    assert not verificar_senha("errada", h)

def test_criar_token_contem_sub():
    token = criar_token({"sub": "uuid-123", "role": "CLIENTE"})
    assert token is not None

def test_status():
    resp = client.get("/status")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

def test_cadastro_email_duplicado():
    # Cadastra uma vez no SQLite de teste
    client.post("/v1/usuarios", json={"nome": "A", "email": "dup@test.com", "senha": "Abc@123"})
    # Segunda tentativa deve retornar 409
    resp = client.post("/v1/usuarios", json={"nome": "B", "email": "dup@test.com", "senha": "Abc@123"})
    assert resp.status_code == 409

def test_login_invalido():
    resp = client.post("/v1/auth/login", json={"email": "naoexiste@test.com", "senha": "errada"})
    assert resp.status_code == 401

def test_cadastro_e_login_sucesso():
    import uuid
    email = f"login-{uuid.uuid4()}@test.com"
    resp = client.post("/v1/usuarios", json={"nome": "Login Test", "email": email, "senha": "Abc@123"})
    assert resp.status_code == 201
    resp2 = client.post("/v1/auth/login", json={"email": email, "senha": "Abc@123"})
    assert resp2.status_code == 200
    assert "access_token" in resp2.json()

# ── Contrato de listagem do ra-data-simple-rest ──────────────────────────────

import json
import uuid as _uuid

from main import SessionLocal, Usuario

@pytest.fixture
def equipe():
    """Três usuários com e-mail prefixado, para isolar as asserções."""
    marca = f"zz-lote-{_uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    criados = [
        Usuario(nome="Zeta Teste",  email=f"{marca}-c@test.com", senha_hash="x", role="CLIENTE"),
        Usuario(nome="Alfa Teste",  email=f"{marca}-a@test.com", senha_hash="x", role="ADMIN"),
        Usuario(nome="Beta Teste",  email=f"{marca}-b@test.com", senha_hash="x", role="CLIENTE"),
    ]
    for u in criados:
        db.add(u)
    db.commit()
    ids = [u.id for u in criados]
    yield marca, ids
    db.query(Usuario).filter(Usuario.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    db.close()

def listar(marca, **params):
    filtro = params.pop("filter", {})
    filtro.setdefault("email", marca)
    query = {"filter": json.dumps(filtro)}
    query.update({k: json.dumps(v) if isinstance(v, list) else v for k, v in params.items()})
    return client.get("/v1/usuarios", params=query)

def test_listar_filtra_por_role(equipe):
    marca, _ = equipe
    resp = listar(marca, filter={"email": marca, "role": "ADMIN"})
    assert resp.status_code == 200
    assert [u["nome"] for u in resp.json()] == ["Alfa Teste"]
    assert resp.headers["content-range"] == "usuarios 0-0/1"

def test_listar_ordena_e_pagina(equipe):
    marca, _ = equipe
    resp = listar(marca, sort=["nome", "ASC"], range=[0, 1])
    assert [u["nome"] for u in resp.json()] == ["Alfa Teste", "Beta Teste"]
    assert resp.headers["content-range"] == "usuarios 0-1/3"

def test_filtro_por_lista_de_ids_atende_get_many(equipe):
    _, ids = equipe
    resp = client.get("/v1/usuarios", params={"filter": json.dumps({"id": ids[:2]})})
    assert sorted(u["id"] for u in resp.json()) == sorted(ids[:2])


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

# ── Notificação de boas-vindas (best-effort) ─────────────────────────────────

import notificar as notificar_mod

def test_cadastro_publica_boas_vindas(monkeypatch):
    publicadas = []
    monkeypatch.setattr("main.notificar", lambda tipo, email, nome=None, payload=None:
                        publicadas.append((tipo, email, nome)) or True)
    email = f"boasvindas-{_uuid.uuid4()}@test.com"
    resp = client.post("/v1/usuarios", json={"nome": "Ana", "email": email, "senha": "Abc@123"})
    assert resp.status_code == 201
    assert publicadas == [("BOAS_VINDAS", email, "Ana")]

def test_cadastro_vale_mesmo_sem_notificacao(monkeypatch):
    """Notificações fora do ar (publicador devolve False) não perde o cadastro."""
    monkeypatch.setattr("main.notificar", lambda *a, **kw: False)
    email = f"falha-{_uuid.uuid4()}@test.com"
    resp = client.post("/v1/usuarios", json={"nome": "Bruno", "email": email, "senha": "Abc@123"})
    assert resp.status_code == 201
    db = SessionLocal()
    assert db.query(Usuario).filter(Usuario.email == email).first() is not None
    db.close()

def test_publicador_sem_url_nao_chama_a_rede(monkeypatch):
    """Sem NOTIFICACOES_URL (caso dos testes e de rodar o serviço isolado)."""
    monkeypatch.setattr(notificar_mod, "NOTIFICACOES_URL", "")
    def nao_deveria(*a, **kw):
        raise AssertionError("não deveria chamar a rede")
    monkeypatch.setattr(notificar_mod.httpx, "post", nao_deveria)
    assert notificar_mod.notificar("BOAS_VINDAS", "x@test.com") is False

def test_publicador_engole_falha_de_rede(monkeypatch):
    monkeypatch.setattr(notificar_mod, "NOTIFICACOES_URL", "http://svc-notificacoes:8006")
    def explode(*a, **kw):
        raise notificar_mod.httpx.ConnectError("sem rota")
    monkeypatch.setattr(notificar_mod.httpx, "post", explode)
    assert notificar_mod.notificar("BOAS_VINDAS", "x@test.com") is False
