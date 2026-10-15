"""Publicação de notificações — substituto da fila prevista na arquitetura.

A arquitetura descreve o serviço de notificações consumindo eventos de uma fila
(`pedido.confirmado`, `pagamento.recusado`, …). No lab não existe fila, então
quem conhece o evento publica por HTTP no serviço de notificações.

É best-effort de propósito: **nenhuma falha aqui derruba a operação de negócio**.
Serviço de notificações fora do ar, timeout, DNS — o cadastro, o pagamento e o
cancelamento seguem normais e a falha só vai para o log.

Sem `NOTIFICACOES_URL` no ambiente nada é publicado, então rodar um serviço
isolado (ou os testes) não depende dos outros.

Cópia por serviço: cada microsserviço é construído a partir do próprio diretório
(`build: ../../../backend/<servico>` no compose), então não há pacote
compartilhado. Mantenha os arquivos idênticos entre os serviços.
"""
import os
from datetime import datetime, timedelta

import httpx
from jose import jwt

NOTIFICACOES_URL = os.getenv("NOTIFICACOES_URL", "")
USUARIOS_URL     = os.getenv("USUARIOS_URL", "")
PEDIDOS_URL      = os.getenv("PEDIDOS_URL", "")
SECRET_KEY       = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM        = "HS256"
TIMEOUT          = float(os.getenv("CHAMADA_TIMEOUT_SEGUNDOS", "2"))
SERVICO          = os.getenv("SERVICE_NAME", "servico")


def _token() -> str:
    """JWT de serviço: os endpoints internos exigem Bearer, e o segredo é compartilhado."""
    return jwt.encode({"sub": f"svc-{SERVICO}", "role": "SERVICO",
                       "exp": datetime.utcnow() + timedelta(minutes=5)},
                      SECRET_KEY, algorithm=ALGORITHM)


def _buscar(url: str, autenticado: bool = False):
    """GET interno; devolve o JSON ou None em qualquer falha."""
    try:
        cabecalhos = {"Authorization": f"Bearer {_token()}"} if autenticado else {}
        resp = httpx.get(url, headers=cabecalhos, timeout=TIMEOUT)
        return resp.json() if resp.status_code == 200 else None
    except Exception as e:
        print(f"[notificacoes] falha ao consultar {url}: {e}", flush=True)
        return None


def destinatario(usuario_id: str):
    """(email, nome) do cliente no serviço de usuários; (None, None) se não der."""
    if not USUARIOS_URL or not usuario_id:
        return None, None
    u = _buscar(f"{USUARIOS_URL}/v1/usuarios/{usuario_id}")
    return (u.get("email"), u.get("nome")) if u else (None, None)


def pedido(pedido_id: str):
    """Pedido no serviço de pedidos (para chegar ao cliente); None se não der."""
    if not PEDIDOS_URL or not pedido_id:
        return None
    return _buscar(f"{PEDIDOS_URL}/v1/pedidos/{pedido_id}", autenticado=True)


def notificar(tipo: str, email: str, nome: str = None, payload: dict = None) -> bool:
    """Enfileira uma notificação. Devolve False, sem levantar, se não foi publicada."""
    if not NOTIFICACOES_URL or not email:
        return False
    try:
        resp = httpx.post(
            f"{NOTIFICACOES_URL}/v1/notificacoes",
            json={"tipo": tipo, "destinatario_email": email,
                  "destinatario_nome": nome, "payload": payload},
            headers={"Authorization": f"Bearer {_token()}"}, timeout=TIMEOUT)
        if resp.status_code != 202:
            print(f"[notificacoes] {tipo} recusada: HTTP {resp.status_code}", flush=True)
        return resp.status_code == 202
    except Exception as e:
        print(f"[notificacoes] falha ao publicar {tipo}: {e}", flush=True)
        return False


def notificar_cliente_do_pedido(tipo: str, pedido_id: str, usuario_id: str = None,
                                payload: dict = None) -> bool:
    """Descobre o cliente (pelo pedido, se preciso) e notifica. Best-effort."""
    if usuario_id is None:
        p = pedido(pedido_id)
        if not p:
            return False
        usuario_id = p.get("usuario_id")
    email, nome = destinatario(usuario_id)
    dados = {"pedido_id": pedido_id, **(payload or {})}
    return notificar(tipo, email, nome, dados)
