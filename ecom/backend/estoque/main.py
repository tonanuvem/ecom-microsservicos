import os, uuid
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from listagem import resposta_lista

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./estoque_test.db")
SECRET_KEY   = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM    = "HS256"
RESERVA_TTL  = int(os.getenv("RESERVA_TTL_MINUTOS", "15"))

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()

class Estoque(Base):
    """Quantidade disponível por produto"""
    __tablename__ = "estoque"
    id          = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    produto_id  = Column(String(255), unique=True, nullable=False)
    quantidade  = Column(Integer, default=0)

class Reserva(Base):
    """Reserva temporária de estoque para um pedido (TTL configurável)"""
    __tablename__ = "reservas"
    id          = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pedido_id   = Column(String(255), nullable=False)
    produto_id  = Column(String(255), nullable=False)
    quantidade  = Column(Integer, nullable=False)
    expira_em   = Column(DateTime, nullable=False)
    status      = Column(String(20), default="ATIVA")  # ATIVA | CONFIRMADA | LIBERADA

Base.metadata.create_all(bind=engine)

class ReservaCreate(BaseModel):
    pedido_id:  str
    produto_id: str
    quantidade: int

class EstoqueUpdate(BaseModel):
    quantidade: int
    produto_id: Optional[str] = None   # permite repontar a posição para outro produto

class EstoqueCreate(BaseModel):
    produto_id: str
    quantidade: int = 0

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
app = FastAPI(title="Serviço de Estoque", version="1.0.0",
              swagger_ui_parameters={"url": "openapi.json"})

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def serializar(e: Estoque) -> dict:
    return {"id": str(e.id), "produto_id": str(e.produto_id), "quantidade": e.quantidade}

@app.get("/status", tags=["health"])
def status():
    return {"status": "ok", "service": "estoque"}

@app.get("/v1/estoque/disponibilidade", tags=["estoque"])
def disponibilidade(produto_ids: str, db: Session = Depends(get_db)):
    """Verifica disponibilidade de produtos (IDs separados por vírgula)"""
    ids = [i.strip() for i in produto_ids.split(",")]
    result = {}
    for pid in ids:
        e = db.query(Estoque).filter(Estoque.produto_id == pid).first()
        result[pid] = e.quantidade if e else 0
    return {"disponibilidade": result}

@app.post("/v1/estoque/reservas", status_code=201, tags=["estoque"])
def reservar(body: ReservaCreate, request: Request, db: Session = Depends(get_db)):
    """Reserva estoque para um pedido. Decrementa quantidade disponível."""
    exigir_auth(request)
    e = db.query(Estoque).filter(Estoque.produto_id == body.produto_id).first()
    if not e or e.quantidade < body.quantidade:
        raise HTTPException(status_code=422, detail="Estoque insuficiente")
    e.quantidade -= body.quantidade
    r = Reserva(pedido_id=body.pedido_id, produto_id=body.produto_id,
                quantidade=body.quantidade,
                expira_em=datetime.utcnow() + timedelta(minutes=RESERVA_TTL))
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "status": r.status}

@app.delete("/v1/estoque/reservas/{reserva_id}", tags=["estoque"])
def liberar_reserva(reserva_id: str, request: Request, db: Session = Depends(get_db)):
    """Libera reserva e devolve quantidade ao estoque."""
    exigir_auth(request)
    r = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
    e = db.query(Estoque).filter(Estoque.produto_id == r.produto_id).first()
    if e:
        e.quantidade += r.quantidade
    r.status = "LIBERADA"
    db.commit()
    return {"id": reserva_id, "status": "LIBERADA"}

@app.post("/v1/estoque", status_code=201, tags=["estoque"])
def criar(body: EstoqueCreate, request: Request, db: Session = Depends(get_db)):
    """Cria a posição de estoque de um produto (o Create da tela de Estoque)."""
    exigir_auth(request)
    if db.query(Estoque).filter(Estoque.produto_id == body.produto_id).first():
        raise HTTPException(status_code=409, detail="Produto já tem posição de estoque")
    e = Estoque(produto_id=body.produto_id, quantidade=body.quantidade)
    db.add(e)
    db.commit()
    db.refresh(e)
    return serializar(e)

@app.put("/v1/estoque/{identificador}", tags=["estoque"])
def atualizar(identificador: str, body: EstoqueUpdate, request: Request, db: Session = Depends(get_db)):
    """Atualiza a quantidade. O identificador pode ser o id da posição ou o produto_id.

    O admin edita pelo id da linha (é o `id` do recurso no react-admin), enquanto
    o seed e os outros serviços conhecem o produto. Procurar só por produto_id
    fazia a edição pelo admin criar uma posição nova, com produto_id apontando
    para o id da linha editada — linhas fantasma, sem produto.

    Sem nenhuma das duas correspondências, cria a posição do produto informado:
    é assim que o seed carrega estoque de produto recém-criado.
    """
    exigir_auth(request)
    e = (db.query(Estoque).filter(Estoque.id == identificador).first()
         or db.query(Estoque).filter(Estoque.produto_id == identificador).first())
    if e:
        e.quantidade = body.quantidade
        if body.produto_id and body.produto_id != e.produto_id:
            ocupada = db.query(Estoque).filter(Estoque.produto_id == body.produto_id).first()
            if ocupada:
                raise HTTPException(status_code=409, detail="Produto já tem posição de estoque")
            e.produto_id = body.produto_id
    else:
        e = Estoque(produto_id=body.produto_id or identificador, quantidade=body.quantidade)
        db.add(e)
    db.commit()
    db.refresh(e)
    return serializar(e)

@app.get("/v1/estoque/{estoque_id}", tags=["estoque"])
def obter(estoque_id: str, db: Session = Depends(get_db)):
    e = db.query(Estoque).filter(Estoque.id == estoque_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Item de estoque não encontrado")
    return serializar(e)

@app.get("/v1/estoque", tags=["estoque"])
def listar(request: Request, db: Session = Depends(get_db)):
    """Lista estoque. Aplica filter/sort/range do ra-data-simple-rest."""
    return resposta_lista(request, db.query(Estoque), Estoque, "estoque", serializar,
                          campos_busca=("produto_id",))

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
