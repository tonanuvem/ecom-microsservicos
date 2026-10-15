"""Contrato de listagem do ra-data-simple-rest: filter, sort e range.

O provider do admin envia, em toda listagem:

    GET /v1/<recurso>?filter={"status":"PENDENTE"}&sort=["criado_em","DESC"]&range=[0,24]

e espera o header ``Content-Range: <recurso> <inicio>-<fim>/<total>`` para montar
a paginação. ``getMany`` envia apenas ``filter={"id":[...]}``, sem range — nesse
caso devolvemos a coleção filtrada inteira.

Campos desconhecidos no filter e no sort são ignorados (e não zeram a lista),
para que o admin possa evoluir sem derrubar as telas.

Cada microsserviço é construído a partir do seu próprio diretório
(``build: ../../../backend/<servico>`` no compose), então não existe pacote
compartilhado: este arquivo é copiado igual em todos os serviços.
"""
import json
from typing import Sequence

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import or_

PADRAO_SORT = ["id", "ASC"]


def _json_param(request: Request, nome: str, padrao):
    bruto = request.query_params.get(nome)
    if not bruto:
        return padrao
    try:
        return json.loads(bruto)
    except (TypeError, ValueError):
        return padrao


def booleano(valor, padrao=None):
    """Aceita bool nativo ou as formas textuais que chegam pela query string."""
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, str):
        if valor.lower() in ("true", "1", "sim"):
            return True
        if valor.lower() in ("false", "0", "nao", "não"):
            return False
    return padrao


def filtros_da_query(request: Request) -> dict:
    """Lê o param ``filter`` (JSON) como dicionário."""
    filtros = _json_param(request, "filter", {})
    return filtros if isinstance(filtros, dict) else {}


def aplicar_filtro(query, model, filtros: dict, campos_busca: Sequence[str] = ()):
    """``{"campo": valor}`` → WHERE. Lista vira ``IN``; ``q`` busca em campos_busca."""
    for campo, valor in (filtros or {}).items():
        if valor is None or valor == "":
            continue
        if campo == "q":
            alvos = [getattr(model, c).ilike(f"%{valor}%") for c in campos_busca if hasattr(model, c)]
            if alvos:
                query = query.filter(or_(*alvos))
            continue
        coluna = getattr(model, campo, None)
        if coluna is None:
            continue
        if isinstance(valor, (list, tuple)):
            query = query.filter(coluna.in_(list(valor)))
        elif isinstance(valor, str) and campo in campos_busca:
            query = query.filter(coluna.ilike(f"%{valor}%"))
        else:
            query = query.filter(coluna == valor)
    return query


def aplicar_ordenacao(query, model, sort):
    """``["campo","ASC"|"DESC"]`` → ORDER BY. Campo inexistente é ignorado."""
    if not isinstance(sort, (list, tuple)) or not sort:
        sort = PADRAO_SORT
    campo = sort[0]
    ordem = str(sort[1]).upper() if len(sort) > 1 else "ASC"
    coluna = getattr(model, campo, None) if isinstance(campo, str) else None
    if coluna is None:
        return query
    return query.order_by(coluna.desc() if ordem == "DESC" else coluna.asc())


def aplicar_range(query, range_):
    """``[inicio, fim]`` (fim inclusivo) → OFFSET/LIMIT. Sem range, devolve tudo."""
    if not isinstance(range_, (list, tuple)) or len(range_) < 2:
        return query, 0
    try:
        inicio, fim = int(range_[0]), int(range_[1])
    except (TypeError, ValueError):
        return query, 0
    inicio = max(inicio, 0)
    if fim < inicio:
        return query, inicio
    return query.offset(inicio).limit(fim - inicio + 1), inicio


def resposta_lista(request: Request, query, model, recurso: str, serializar,
                   campos_busca: Sequence[str] = (), filtros: dict = None):
    """Aplica filter/sort/range na query e responde com o Content-Range correto."""
    if filtros is None:
        filtros = filtros_da_query(request)
    query = aplicar_filtro(query, model, filtros, campos_busca)
    total = query.order_by(None).count()
    query = aplicar_ordenacao(query, model, _json_param(request, "sort", PADRAO_SORT))
    query, inicio = aplicar_range(query, _json_param(request, "range", None))
    itens = query.all()
    fim = inicio + len(itens) - 1 if itens else inicio
    return JSONResponse(
        content=[serializar(i) for i in itens],
        headers={"Content-Range": f"{recurso} {inicio}-{fim}/{total}",
                 "Access-Control-Expose-Headers": "Content-Range"})
