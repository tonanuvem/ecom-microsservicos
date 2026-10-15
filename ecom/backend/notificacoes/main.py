import os, uuid
from datetime import datetime
from typing import Optional, Any

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from listagem import resposta_lista

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./notificacoes_test.db")
SECRET_KEY   = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM    = "HS256"

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()

class Notificacao(Base):
    """Registro de notificação enviada ou enfileirada para retry"""
    __tablename__      = "notificacoes"
    id                 = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tipo               = Column(String(50), nullable=False)  # PEDIDO_CONFIRMADO | PAGAMENTO_RECUSADO | etc
    destinatario_email = Column(String(255), nullable=False)
    destinatario_nome  = Column(String(150))
    payload            = Column(JSON)
    status             = Column(String(20), default="ENFILEIRADO")  # ENFILEIRADO | ENVIADO | FALHA
    tentativas         = Column(Integer, default=0)
    criado_em          = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

class NotificacaoCreate(BaseModel):
    tipo:               str
    destinatario_email: str
    destinatario_nome:  Optional[str] = None
    payload:            Optional[Any] = None

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
app = FastAPI(title="Serviço de Notificações", version="1.0.0",
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
    return {"status": "ok", "service": "notificacoes"}

@app.post("/v1/notificacoes", status_code=202, tags=["notificacoes"])
def enviar(body: NotificacaoCreate, request: Request, db: Session = Depends(get_db)):
    """Enfileira notificação para envio assíncrono. Retorna 202 Accepted."""
    exigir_auth(request)
    n = Notificacao(tipo=body.tipo, destinatario_email=body.destinatario_email,
                    destinatario_nome=body.destinatario_nome, payload=body.payload)
    db.add(n)
    db.commit()
    db.refresh(n)
    # Em produção: publicar em fila Kafka/Redis para envio real via SES/SendGrid
    return {"id": str(n.id), "status": "ENFILEIRADO", "tipo": n.tipo}

def serializar(n: Notificacao) -> dict:
    return {"id": str(n.id), "tipo": n.tipo, "destinatario_email": n.destinatario_email,
            "destinatario_nome": n.destinatario_nome, "status": n.status,
            "tentativas": n.tentativas, "criado_em": str(n.criado_em) if n.criado_em else None}

@app.get("/v1/notificacoes/{notificacao_id}", tags=["notificacoes"])
def obter(notificacao_id: str, request: Request, db: Session = Depends(get_db)):
    """Uma notificação. É o getOne da tela de detalhe do admin.

    Faltava: o admin tem tela de detalhe de notificação e o getOne batia em 404.
    Devolve também o payload, que a listagem não traz — é o conteúdo do que foi
    notificado (valor do pedido, status do pagamento).
    """
    exigir_auth(request)
    n = db.query(Notificacao).filter(Notificacao.id == notificacao_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    return {**serializar(n), "payload": n.payload}

@app.get("/v1/notificacoes", tags=["notificacoes"])
def listar(request: Request, db: Session = Depends(get_db)):
    """Lista notificações. Aplica filter/sort/range do ra-data-simple-rest."""
    exigir_auth(request)
    return resposta_lista(request, db.query(Notificacao), Notificacao, "notificacoes", serializar,
                          campos_busca=("tipo", "destinatario_email", "destinatario_nome"))

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
