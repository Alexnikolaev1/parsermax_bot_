"""
FastAPI-фасад над Telethon.

Эндпоинты:
- POST /search   — поиск публичных постов по ключевому слову
- GET  /health   — пинг

Авторизация: Authorization: Bearer <WORKER_TOKEN>
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import List

import logging

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .middleware import RequestLogMiddleware
from .telethon_client import TelegramSearcher, SearchHit

logging.basicConfig(level=logging.INFO)


class SearchReq(BaseModel):
    q: str = Field(min_length=1, max_length=200)
    hours: int = Field(default=6, ge=1, le=48)
    limit: int = Field(default=30, ge=1, le=100)


class SearchItem(BaseModel):
    channel: str
    url: str
    text: str
    date: str


class SearchResp(BaseModel):
    items: List[SearchItem]


searcher: TelegramSearcher | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global searcher
    searcher = TelegramSearcher(
        api_id=int(os.environ["TG_API_ID"]),
        api_hash=os.environ["TG_API_HASH"],
        session_string=os.environ["TG_SESSION_STRING"],
    )
    await searcher.start()
    try:
        yield
    finally:
        await searcher.stop()


app = FastAPI(title="MAX News tg-worker", lifespan=lifespan)
app.add_middleware(RequestLogMiddleware)


def require_auth(authorization: str | None = Header(default=None)) -> None:
    expected = os.environ.get("WORKER_TOKEN")
    if not expected or authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "logged_in": searcher is not None and await searcher.is_authorized()}


@app.post("/search", response_model=SearchResp)
async def search(req: SearchReq, _: None = Depends(require_auth)) -> SearchResp:
    if searcher is None:
        raise HTTPException(503, "Searcher not initialized")
    hits: list[SearchHit] = await searcher.search(req.q, hours=req.hours, limit=req.limit)
    return SearchResp(
        items=[
            SearchItem(channel=h.channel, url=h.url, text=h.text, date=h.date.isoformat())
            for h in hits
        ]
    )
