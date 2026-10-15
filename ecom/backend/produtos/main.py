import os, uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Numeric, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from listagem import booleano, filtros_da_query, resposta_lista

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./produtos_test.db")
SECRET_KEY   = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM    = "HS256"

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()

class Produto(Base):
    """Modelo de produto no catálogo"""
    __tablename__ = "produtos"
    id            = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome          = Column(String(255), nullable=False)
    descricao     = Column(Text)
    preco         = Column(Numeric(12, 2), nullable=False)
    imagem_url    = Column(String(500))
    ativo         = Column(Boolean, default=True)
    criado_em     = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

class ProdutoCreate(BaseModel):
    nome:       str
    descricao:  Optional[str] = None
    preco:      float
    imagem_url: Optional[str] = None
    ativo:      Optional[bool] = None

from fastapi.openapi.utils import get_openapi
# A URL do spec é relativa à página /docs: atrás do proxy do frontend resolve
# para /api/<servico>/openapi.json e, na porta do serviço, para /openapi.json.
# Absoluta ("/openapi.json") cairia no SPA e o Swagger UI não renderiza.
app = FastAPI(title="Serviço de Produtos", version="1.0.0",
              swagger_ui_parameters={"url": "openapi.json"})

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def exigir_admin(request: Request):
    """Lê JWT do header Authorization e exige role ADMIN ou OPERADOR"""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    try:
        payload = jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") not in ("ADMIN", "OPERADOR"):
            raise HTTPException(status_code=403, detail="Acesso negado")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

@app.get("/status", tags=["health"])
def status():
    return {"status": "ok", "service": "produtos"}

def serializar(p: Produto) -> dict:
    return {"id": str(p.id), "nome": p.nome, "preco": float(p.preco), "ativo": p.ativo,
            "descricao": p.descricao, "imagem_url": p.imagem_url,
            "criado_em": str(p.criado_em) if p.criado_em else None}

@app.get("/v1/produtos", tags=["produtos"])
def listar(request: Request, incluir_inativos: bool = False, db: Session = Depends(get_db)):
    """Lista produtos. Aplica filter/sort/range do ra-data-simple-rest.

    Por padrão devolve só os ativos (é a vitrine da loja). O admin pede o
    catálogo completo com `incluir_inativos=true` (ou `filter={"ativo":false}`
    para ver apenas os desativados).
    """
    filtros = filtros_da_query(request)
    tudo    = incluir_inativos or booleano(filtros.pop("incluir_inativos", None), False)
    ativo   = booleano(filtros.pop("ativo", None))
    query   = db.query(Produto)
    if ativo is not None:
        query = query.filter(Produto.ativo == ativo)
    elif not tudo:
        query = query.filter(Produto.ativo == True)
    return resposta_lista(request, query, Produto, "produtos", serializar,
                          campos_busca=("nome", "descricao"), filtros=filtros)

@app.get("/v1/produtos/{produto_id}", tags=["produtos"])
def obter(produto_id: str, db: Session = Depends(get_db)):
    p = db.query(Produto).filter(Produto.id == produto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return serializar(p)

@app.post("/v1/produtos", status_code=201, tags=["produtos"])
def criar(body: ProdutoCreate, request: Request, db: Session = Depends(get_db)):
    """Cria produto. Requer role ADMIN ou OPERADOR."""
    exigir_admin(request)
    p = Produto(nome=body.nome, descricao=body.descricao, preco=body.preco, imagem_url=body.imagem_url,
                ativo=body.ativo if body.ativo is not None else True)
    db.add(p)
    db.commit()
    db.refresh(p)
    return serializar(p)

@app.put("/v1/produtos/{produto_id}", tags=["produtos"])
def atualizar(produto_id: str, body: ProdutoCreate, request: Request, db: Session = Depends(get_db)):
    exigir_admin(request)
    p = db.query(Produto).filter(Produto.id == produto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    p.nome = body.nome; p.preco = body.preco; p.descricao = body.descricao; p.imagem_url = body.imagem_url; p.ativo = body.ativo if body.ativo is not None else p.ativo
    db.commit()
    return serializar(p)

@app.delete("/v1/produtos/{produto_id}", tags=["produtos"])
def remover(produto_id: str, request: Request, db: Session = Depends(get_db)):
    exigir_admin(request)
    p = db.query(Produto).filter(Produto.id == produto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    p.ativo = False
    db.commit()
    return {"id": produto_id, "removido": True}

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
