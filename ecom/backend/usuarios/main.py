import os, uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from listagem import resposta_lista
from notificar import notificar
import bcrypt as _bcrypt

DATABASE_URL  = os.getenv("DATABASE_URL", "sqlite:///./usuarios_test.db")
SECRET_KEY    = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM     = "HS256"
TOKEN_EXPIRE  = int(os.getenv("TOKEN_EXPIRE_MINUTES", "60"))

engine        = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal  = sessionmaker(bind=engine)
Base          = declarative_base()

from datetime import timedelta

class Usuario(Base):
    """Modelo de dados do usuário"""
    __tablename__ = "usuarios"
    id            = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome          = Column(String(150), nullable=False)
    email         = Column(String(255), unique=True, nullable=False)
    senha_hash    = Column(String(255), nullable=False)
    role          = Column(String(20), default="CLIENTE")  # CLIENTE | OPERADOR | ADMIN
    ativo         = Column(Boolean, default=True)
    criado_em     = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def hash_senha(senha: str) -> str:
    return _bcrypt.hashpw(senha.encode(), _bcrypt.gensalt(rounds=12)).decode()

def verificar_senha(senha: str, hash: str) -> bool:
    return _bcrypt.checkpw(senha.encode(), hash.encode())

def criar_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def exigir_auth(request: Request):
    """Lê JWT do header Authorization e retorna payload"""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    try:
        return jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

class UsuarioCreate(BaseModel):
    nome:  str
    email: EmailStr
    senha: str

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str

from fastapi.openapi.utils import get_openapi
# A URL do spec é relativa à página /docs: atrás do proxy do frontend resolve
# para /api/<servico>/openapi.json e, na porta do serviço, para /openapi.json.
# Absoluta ("/openapi.json") cairia no SPA e o Swagger UI não renderiza.
app = FastAPI(title="Serviço de Usuários", version="1.0.0",
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
    return {"status": "ok", "service": "usuarios"}

@app.post("/v1/usuarios", status_code=201, tags=["usuarios"])
def cadastrar(body: UsuarioCreate, db: Session = Depends(get_db)):
    """Cadastra novo usuário. Retorna 409 se e-mail já existir."""
    if db.query(Usuario).filter(Usuario.email == body.email).first():
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    u = Usuario(nome=body.nome, email=body.email, senha_hash=hash_senha(body.senha))
    db.add(u)
    db.commit()
    db.refresh(u)
    # Evento de negócio → notificação. Best-effort: o cadastro não depende dela.
    notificar("BOAS_VINDAS", u.email, u.nome, {"usuario_id": str(u.id)})
    return {"id": u.id, "nome": u.nome, "email": u.email, "role": u.role}

@app.post("/v1/auth/login", tags=["auth"])
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Autentica e retorna JWT com expiração de 1h."""
    u = db.query(Usuario).filter(Usuario.email == body.email).first()
    if not u or not verificar_senha(body.senha, u.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = criar_token({"sub": str(u.id), "email": u.email, "role": u.role})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/v1/auth/refresh", tags=["auth"])
def refresh(request: Request, db: Session = Depends(get_db)):
    """Renova token JWT."""
    payload = exigir_auth(request)
    u = db.query(Usuario).filter(Usuario.id == payload["sub"]).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    token = criar_token({"sub": str(u.id), "email": u.email, "role": u.role})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/v1/usuarios/me", tags=["usuarios"])
def perfil(request: Request, db: Session = Depends(get_db)):
    """Retorna perfil do usuário autenticado."""
    payload = exigir_auth(request)
    u = db.query(Usuario).filter(Usuario.id == payload["sub"]).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"id": u.id, "nome": u.nome, "email": u.email, "role": u.role}

@app.put("/v1/usuarios/me", tags=["usuarios"])
def atualizar_perfil(body: UsuarioCreate, request: Request, db: Session = Depends(get_db)):
    payload = exigir_auth(request)
    u = db.query(Usuario).filter(Usuario.id == payload["sub"]).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    u.nome = body.nome
    db.commit()
    return {"id": u.id, "nome": u.nome, "email": u.email, "role": u.role}

@app.get("/v1/usuarios/{usuario_id}", tags=["usuarios"])
def obter(usuario_id: str, db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return serializar(u)

@app.put("/v1/usuarios/{usuario_id}", tags=["usuarios"])
def atualizar(usuario_id: str, body: UsuarioCreate, request: Request, db: Session = Depends(get_db)):
    exigir_auth(request)
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    u.nome = body.nome
    db.commit()
    return {"id": str(u.id), "nome": u.nome, "email": u.email, "role": u.role, "ativo": u.ativo}

def serializar(u: Usuario) -> dict:
    return {"id": str(u.id), "nome": u.nome, "email": u.email, "role": u.role,
            "ativo": u.ativo, "criado_em": str(u.criado_em) if u.criado_em else None}

@app.get("/v1/usuarios", tags=["usuarios"])
def listar(request: Request, db: Session = Depends(get_db)):
    """Lista usuários. Aplica filter/sort/range do ra-data-simple-rest."""
    return resposta_lista(request, db.query(Usuario), Usuario, "usuarios", serializar,
                          campos_busca=("nome", "email"))

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
