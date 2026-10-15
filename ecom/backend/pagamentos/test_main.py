"""Testes unitários do serviço de pagamentos"""
import json
import uuid

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import Pagamento, SessionLocal, app

client = TestClient(app)

def test_status():
    resp = client.get("/status")
    assert resp.status_code == 200

def test_sessao_sem_token():
    resp = client.post("/v1/pagamentos/sessao", json={"pedido_id": "p1"})
    assert resp.status_code == 401

def test_webhook_cria_pagamento():
    with patch("main.get_db") as mock_db:
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        mock_db.return_value = iter([db])
        resp = client.post("/v1/pagamentos/webhook", json={
            "idempotency_key": "key-001", "pedido_id": "p1", "status": "APROVADO"
        })
    assert resp.status_code == 200

def test_webhook_idempotente():
    """Segundo envio com mesma chave deve retornar sem reprocessar"""
    with patch("main.get_db") as mock_db:
        db = MagicMock()
        existing = MagicMock()
        existing.status = "APROVADO"
        existing.id = "uuid-123"
        db.query.return_value.filter.return_value.first.return_value = existing
        mock_db.return_value = iter([db])
        resp = client.post("/v1/pagamentos/webhook", json={
            "idempotency_key": "key-001", "pedido_id": "p1", "status": "APROVADO"
        })
    assert resp.status_code == 200
    assert resp.json().get("idempotente") == True

@pytest.fixture
def limpar():
    """Remove ao fim os pagamentos criados pelo teste."""
    pedidos = []
    yield pedidos
    db = SessionLocal()
    db.query(Pagamento).filter(Pagamento.pedido_id.in_(pedidos)).delete(synchronize_session=False)
    db.commit()
    db.close()

def test_webhook_grava_valor_do_payload(limpar):
    """Webhook sem sessão prévia: o valor cobrado vem no payload."""
    pedido = f"zz-pedido-{uuid.uuid4()}"
    limpar.append(pedido)
    resp = client.post("/v1/pagamentos/webhook", json={
        "idempotency_key": f"idem-{pedido}", "pedido_id": pedido,
        "status": "APROVADO", "valor": 1234.56,
    })
    assert resp.status_code == 200
    assert resp.json()["valor"] == 1234.56
    db = SessionLocal()
    gravado = db.query(Pagamento).filter(Pagamento.pedido_id == pedido).first()
    assert float(gravado.valor) == 1234.56
    db.close()

def test_webhook_preserva_valor_da_sessao(limpar):
    """Webhook sem valor no payload não zera o valor registrado na sessão."""
    pedido = f"zz-pedido-{uuid.uuid4()}"
    limpar.append(pedido)
    db = SessionLocal()
    db.add(Pagamento(pedido_id=pedido, idempotency_key=f"sessao-{pedido}", valor=500))
    db.commit()
    db.close()
    resp = client.post("/v1/pagamentos/webhook", json={
        "idempotency_key": f"idem-{pedido}", "pedido_id": pedido, "status": "APROVADO",
    })
    assert resp.json()["valor"] == 500.0

def test_webhook_atualiza_valor_quando_provedor_informa(limpar):
    """Valor do provedor prevalece sobre o estimado na sessão."""
    pedido = f"zz-pedido-{uuid.uuid4()}"
    limpar.append(pedido)
    db = SessionLocal()
    db.add(Pagamento(pedido_id=pedido, idempotency_key=f"sessao-{pedido}", valor=500))
    db.commit()
    db.close()
    resp = client.post("/v1/pagamentos/webhook", json={
        "idempotency_key": f"idem-{pedido}", "pedido_id": pedido,
        "status": "APROVADO", "valor": 480.0,
    })
    assert resp.json()["valor"] == 480.0

def test_listagem_filtra_ordena_e_pagina(limpar):
    """filter/sort/range do ra-data-simple-rest sobre a coleção."""
    marca = f"zz-lote-{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    for i, valor in enumerate([100, 300, 200]):
        pedido = f"{marca}-{i}"
        limpar.append(pedido)
        db.add(Pagamento(pedido_id=pedido, idempotency_key=f"idem-{pedido}",
                         status="APROVADO" if i else "RECUSADO", valor=valor))
    db.commit()
    db.close()

    todos = client.get("/v1/pagamentos", params={
        "filter": json.dumps({"pedido_id": marca}), "sort": json.dumps(["valor", "DESC"]),
    })
    assert [p["valor"] for p in todos.json()] == [300.0, 200.0, 100.0]
    assert todos.headers["content-range"] == "pagamentos 0-2/3"

    pagina = client.get("/v1/pagamentos", params={
        "filter": json.dumps({"pedido_id": marca, "status": "APROVADO"}),
        "sort": json.dumps(["valor", "ASC"]), "range": json.dumps([0, 0]),
    })
    assert [p["valor"] for p in pagina.json()] == [200.0]
    assert pagina.headers["content-range"] == "pagamentos 0-0/2"


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

# ── Notificação do resultado do pagamento (best-effort) ──────────────────────

@pytest.fixture
def publicadas(monkeypatch):
    """Captura o que o serviço publicaria em notificações."""
    registro = []
    monkeypatch.setattr("main.notificar_cliente_do_pedido",
                        lambda tipo, pedido_id, usuario_id=None, payload=None:
                        registro.append((tipo, pedido_id, (payload or {}).get("valor"))) or True)
    return registro

def test_webhook_aprovado_publica_pedido_confirmado(limpar, publicadas):
    pedido = f"zz-pedido-{uuid.uuid4()}"
    limpar.append(pedido)
    client.post("/v1/pagamentos/webhook", json={
        "idempotency_key": f"idem-{pedido}", "pedido_id": pedido,
        "status": "APROVADO", "valor": 250.0,
    })
    assert publicadas == [("PEDIDO_CONFIRMADO", pedido, 250.0)]

def test_webhook_recusado_publica_pagamento_recusado(limpar, publicadas):
    pedido = f"zz-pedido-{uuid.uuid4()}"
    limpar.append(pedido)
    client.post("/v1/pagamentos/webhook", json={
        "idempotency_key": f"idem-{pedido}", "pedido_id": pedido,
        "status": "RECUSADO", "valor": 99.9,
    })
    assert publicadas == [("PAGAMENTO_RECUSADO", pedido, 99.9)]

def test_reenvio_idempotente_nao_notifica_de_novo(limpar, publicadas):
    """O provedor repete o webhook; o cliente não pode receber dois e-mails."""
    pedido = f"zz-pedido-{uuid.uuid4()}"
    limpar.append(pedido)
    corpo = {"idempotency_key": f"idem-{pedido}", "pedido_id": pedido,
             "status": "APROVADO", "valor": 10.0}
    client.post("/v1/pagamentos/webhook", json=corpo)
    client.post("/v1/pagamentos/webhook", json=corpo)
    assert len(publicadas) == 1

# ── Tela de pagamento no admin: leitura, sem escrita manual ──────────────────

from jose import jwt
from main import ALGORITHM, SECRET_KEY

def cabecalho():
    token = jwt.encode({"sub": "zz-teste", "role": "ADMIN"}, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}

def test_obter_alimenta_a_tela_de_detalhe(limpar):
    """getOne do recurso: tudo o que o Show mostra vem desta rota."""
    pedido = f"zz-pedido-{uuid.uuid4()}"
    limpar.append(pedido)
    criado = client.post("/v1/pagamentos/webhook", json={
        "idempotency_key": f"idem-{pedido}", "pedido_id": pedido,
        "status": "APROVADO", "valor": 320.5, "referencia_ext": "EXT-123",
    }).json()

    resp = client.get(f"/v1/pagamentos/{criado['id']}", headers=cabecalho())
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["id"] == criado["id"]
    assert corpo["pedido_id"] == pedido
    assert corpo["status"] == "APROVADO"
    assert corpo["valor"] == 320.5
    assert corpo["referencia_ext"] == "EXT-123"
    assert corpo["criado_em"]

def test_obter_sem_token():
    assert client.get("/v1/pagamentos/qualquer").status_code == 401

def test_obter_inexistente():
    resp = client.get("/v1/pagamentos/00000000-0000-0000-0000-000000000000",
                      headers=cabecalho())
    assert resp.status_code == 404

def test_pagamento_nao_tem_escrita_manual(limpar):
    """Pagamento nasce no provedor: sessão + webhook, com idempotência.

    O admin tinha Create e Edit batendo em POST /v1/pagamentos e
    PUT /v1/pagamentos/{id} — 405 depois de preencher o formulário. Criar à mão
    inventaria cobrança que o provedor não reconhece (e pedido_id é único), e
    editar deixaria o status divergir do pedido sem notificar ninguém. Hoje a
    tela é só leitura; estes 405 são o contrato.
    """
    pedido = f"zz-pedido-{uuid.uuid4()}"
    limpar.append(pedido)
    criado = client.post("/v1/pagamentos/webhook", json={
        "idempotency_key": f"idem-{pedido}", "pedido_id": pedido,
        "status": "APROVADO", "valor": 10.0,
    }).json()

    assert client.post("/v1/pagamentos", json={"pedido_id": pedido, "valor": 1},
                       headers=cabecalho()).status_code == 405
    assert client.put(f"/v1/pagamentos/{criado['id']}", json={"status": "RECUSADO"},
                      headers=cabecalho()).status_code == 405

    db = SessionLocal()
    assert db.query(Pagamento).filter(Pagamento.pedido_id == pedido).count() == 1
    db.close()
