import os, uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Numeric, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from listagem import resposta_lista
from notificar import notificar_cliente_do_pedido

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pagamentos_test.db")
SECRET_KEY   = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM    = "HS256"

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()

class Pagamento(Base):
    """Registro de pagamento com idempotência garantida por idempotency_key"""
    __tablename__   = "pagamentos"
    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pedido_id       = Column(String(255), unique=True, nullable=False)  # FK lógica → pedidos.id
    idempotency_key = Column(String(255), unique=True, nullable=False)
    status          = Column(String(20), default="PENDENTE")  # PENDENTE|APROVADO|RECUSADO
    valor           = Column(Numeric(12, 2))
    referencia_ext  = Column(String(255))
    criado_em       = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

class SessaoCreate(BaseModel):
    pedido_id: str
    valor:     Optional[float] = 0.0

class WebhookPayload(BaseModel):
    idempotency_key: str
    pedido_id:       str
    status:          str          # APROVADO | RECUSADO
    referencia_ext:  Optional[str] = None
    valor:           Optional[float] = None   # valor cobrado pelo provedor

def exigir_auth(request: Request):
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    try:
        return jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

from fastapi.openapi.utils import get_openapi
# A URL do spec é relativa à página /docs: atrás do proxy do frontend resolve
# para /api/<servico>/openapi.json e, na porta do serviço, para /openapi.json.
# Absoluta ("/openapi.json") cairia no SPA e o Swagger UI não renderiza.
app = FastAPI(title="Serviço de Pagamentos", version="1.0.0",
              swagger_ui_parameters={"url": "openapi.json"})

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/status", tags=["health"])
def status():
    return {"status": "ok", "service": "pagamentos"}

@app.post("/v1/pagamentos/sessao", status_code=201, tags=["pagamentos"])
def iniciar_sessao(body: SessaoCreate, request: Request, db: Session = Depends(get_db)):
    """Cria sessão de pagamento para um pedido. Requer autenticação."""
    exigir_auth(request)
    sessao_id = str(uuid.uuid4())
    idem_key  = f"sessao-{body.pedido_id}-{sessao_id}"
    existing  = db.query(Pagamento).filter(Pagamento.pedido_id == body.pedido_id).first()
    if not existing:
        p = Pagamento(pedido_id=body.pedido_id, idempotency_key=idem_key, valor=body.valor)
        db.add(p)
        db.commit()
    return {"sessao_id": sessao_id, "pedido_id": body.pedido_id, "status": "PENDENTE"}

def valor_do_webhook(body: WebhookPayload, atual: Pagamento = None) -> float:
    """Valor a gravar: o do payload do provedor; se ausente, o da sessão já criada.

    O registro nunca deve ficar em zero — o dashboard soma esses valores para
    confrontar o faturamento aprovado com o total dos pedidos.
    """
    if body.valor is not None:
        return float(body.valor)
    return float(atual.valor or 0) if atual is not None else 0.0

def notificar_resultado(pagamento: Pagamento) -> None:
    """RN-05/RN-06: aprovado confirma o pedido e notifica; recusado pede nova tentativa.

    O serviço não conhece o cliente — chega a ele pelo pedido. Best-effort: o
    webhook responde ao provedor mesmo se a notificação não sair.
    """
    tipos = {"APROVADO": "PEDIDO_CONFIRMADO", "RECUSADO": "PAGAMENTO_RECUSADO"}
    tipo  = tipos.get(pagamento.status)
    if not tipo:
        return
    notificar_cliente_do_pedido(tipo, str(pagamento.pedido_id),
                                payload={"valor": float(pagamento.valor or 0),
                                         "status_pagamento": pagamento.status})

@app.post("/v1/pagamentos/webhook", tags=["pagamentos"])
def webhook(body: WebhookPayload, db: Session = Depends(get_db)):
    """Recebe resultado do provedor externo. Garante idempotência via idempotency_key."""
    # Idempotência: mesma chave já processada → retorna sem reprocessar
    existing_key = db.query(Pagamento).filter(Pagamento.idempotency_key == body.idempotency_key).first()
    if existing_key and existing_key.status != "PENDENTE":
        return {"id": str(existing_key.id), "status": existing_key.status, "idempotente": True}
    if existing_key:
        existing_key.status = body.status
        existing_key.referencia_ext = body.referencia_ext
        existing_key.valor = valor_do_webhook(body, existing_key)
        db.commit()
        notificar_resultado(existing_key)
        return {"id": str(existing_key.id), "status": existing_key.status, "valor": float(existing_key.valor or 0)}
    # Pedido já tem registro criado via sessão → atualiza com nova chave
    existing_pedido = db.query(Pagamento).filter(Pagamento.pedido_id == body.pedido_id).first()
    if existing_pedido:
        existing_pedido.status = body.status
        existing_pedido.referencia_ext = body.referencia_ext
        existing_pedido.idempotency_key = body.idempotency_key
        existing_pedido.valor = valor_do_webhook(body, existing_pedido)
        db.commit()
        notificar_resultado(existing_pedido)
        return {"id": str(existing_pedido.id), "status": existing_pedido.status, "valor": float(existing_pedido.valor or 0)}
    # Novo registro — valor vem do payload (webhook sem sessão prévia)
    p = Pagamento(pedido_id=body.pedido_id, idempotency_key=body.idempotency_key,
                  status=body.status, referencia_ext=body.referencia_ext,
                  valor=valor_do_webhook(body))
    db.add(p)
    db.commit()
    db.refresh(p)
    notificar_resultado(p)
    return {"id": str(p.id), "status": p.status, "valor": float(p.valor or 0)}

@app.get("/v1/pagamentos/{pagamento_id}", tags=["pagamentos"])
def obter(pagamento_id: str, request: Request, db: Session = Depends(get_db)):
    exigir_auth(request)
    p = db.query(Pagamento).filter(Pagamento.id == pagamento_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    return serializar(p)

def serializar(p: Pagamento) -> dict:
    return {"id": str(p.id), "pedido_id": str(p.pedido_id), "status": p.status,
            "valor": float(p.valor or 0), "referencia_ext": p.referencia_ext,
            "criado_em": str(p.criado_em) if p.criado_em else None}

@app.get("/v1/pagamentos", tags=["pagamentos"])
def listar(request: Request, db: Session = Depends(get_db)):
    """Lista pagamentos. Aplica filter/sort/range do ra-data-simple-rest."""
    return resposta_lista(request, db.query(Pagamento), Pagamento, "pagamentos", serializar,
                          campos_busca=("pedido_id", "status", "referencia_ext"))

# Adiciona Bearer token no Swagger UI
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
    schema.setdefault("components", {})["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
    }
    for path in schema.get("paths", {}).values():
        for op in path.values():
            op.setdefault("security", [{"BearerAuth": []}])
    app.openapi_schema = schema
    return schema
app.openapi = custom_openapi
