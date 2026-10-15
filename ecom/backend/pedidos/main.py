import os, uuid
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Numeric, Integer, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

from listagem import resposta_lista
from notificar import notificar_cliente_do_pedido

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pedidos_test.db")
SECRET_KEY   = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM    = "HS256"

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()

class Pedido(Base):
    """Pedido de compra do cliente"""
    __tablename__ = "pedidos"
    id          = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    usuario_id  = Column(String(255), nullable=False)   # FK lógica → usuarios.id
    status      = Column(String(30), default="PENDENTE") # PENDENTE|CONFIRMADO|CANCELADO
    total       = Column(Numeric(12, 2), nullable=False)
    criado_em   = Column(DateTime, default=datetime.utcnow)
    itens       = relationship("ItemPedido", back_populates="pedido", cascade="all, delete")

class ItemPedido(Base):
    """Item de pedido — snapshot de preço e nome no momento da compra"""
    __tablename__ = "itens_pedido"
    id           = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pedido_id    = Column(String(36), ForeignKey("pedidos.id"), nullable=False)
    produto_id   = Column(String(255), nullable=False)
    nome_produto = Column(String(255), nullable=False)
    preco_unit   = Column(Numeric(12, 2), nullable=False)
    quantidade   = Column(Integer, nullable=False)
    pedido       = relationship("Pedido", back_populates="itens")

Base.metadata.create_all(bind=engine)

class ItemIn(BaseModel):
    produto_id:   str
    nome_produto: str
    preco_unit:   float
    quantidade:   int

class PedidoCreate(BaseModel):
    itens: List[ItemIn]

def exigir_auth(request: Request):
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    try:
        return jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

def serializar(p: Pedido) -> dict:
    return {"id": str(p.id), "usuario_id": str(p.usuario_id), "status": p.status,
            "total": float(p.total), "criado_em": str(p.criado_em),
            "itens": [{"produto_id": str(i.produto_id), "nome_produto": i.nome_produto,
                       "preco_unit": float(i.preco_unit), "quantidade": i.quantidade}
                      for i in p.itens]}

from fastapi.openapi.utils import get_openapi
# A URL do spec é relativa à página /docs: atrás do proxy do frontend resolve
# para /api/<servico>/openapi.json e, na porta do serviço, para /openapi.json.
# Absoluta ("/openapi.json") cairia no SPA e o Swagger UI não renderiza.
app = FastAPI(title="Serviço de Pedidos", version="1.0.0",
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
    return {"status": "ok", "service": "pedidos"}

@app.post("/v1/pedidos", status_code=201, tags=["pedidos"])
def criar(body: PedidoCreate, request: Request, db: Session = Depends(get_db)):
    """Cria pedido com status PENDENTE. Requer autenticação."""
    payload = exigir_auth(request)
    total = sum(i.preco_unit * i.quantidade for i in body.itens)
    pedido = Pedido(usuario_id=payload["sub"], total=total)
    db.add(pedido)
    db.flush()
    for i in body.itens:
        db.add(ItemPedido(pedido_id=pedido.id, produto_id=i.produto_id,
                          nome_produto=i.nome_produto, preco_unit=i.preco_unit,
                          quantidade=i.quantidade))
    db.commit()
    db.refresh(pedido)
    return serializar(pedido)

@app.get("/v1/pedidos/{pedido_id}", tags=["pedidos"])
def obter(pedido_id: str, request: Request, db: Session = Depends(get_db)):
    exigir_auth(request)
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return serializar(p)

@app.get("/v1/pedidos", tags=["pedidos"])
def listar(request: Request, db: Session = Depends(get_db)):
    """ADMIN vê todos; CLIENTE vê apenas os seus.

    Aplica filter/sort/range do ra-data-simple-rest sobre esse recorte.
    """
    payload = exigir_auth(request)
    query = db.query(Pedido)
    if payload.get("role") != "ADMIN":
        query = query.filter(Pedido.usuario_id == payload["sub"])
    return resposta_lista(request, query, Pedido, "pedidos", serializar,
                          campos_busca=("status", "usuario_id"))

@app.delete("/v1/pedidos/{pedido_id}", tags=["pedidos"])
def cancelar(pedido_id: str, request: Request, db: Session = Depends(get_db)):
    exigir_auth(request)
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    p.status = "CANCELADO"
    db.commit()
    # O serviço já conhece o cliente do pedido — só falta o e-mail, em usuários.
    notificar_cliente_do_pedido("PEDIDO_CANCELADO", pedido_id, usuario_id=str(p.usuario_id),
                                payload={"total": float(p.total)})
    return {"id": pedido_id, "status": "CANCELADO"}

@app.patch("/v1/pedidos/{pedido_id}/status", tags=["pedidos"])
def atualizar_status(pedido_id: str, body: dict, request: Request, db: Session = Depends(get_db)):
    """Atualiza status do pedido (chamado internamente pelo serviço de pagamentos)."""
    exigir_auth(request)
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    p.status = body.get("status", p.status)
    db.commit()
    return {"id": pedido_id, "status": p.status}

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
