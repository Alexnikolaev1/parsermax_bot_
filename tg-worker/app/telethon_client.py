"""Telethon-обёртка для поиска по публичным каналам."""
from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List

from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.contacts import SearchRequest


@dataclass
class SearchHit:
    channel: str
    url: str
    text: str
    date: datetime


class TelegramSearcher:
    """Один долгоживущий Telethon-клиент на процесс."""

    def __init__(self, api_id: int, api_hash: str, session_string: str) -> None:
        self._client = TelegramClient(StringSession(session_string), api_id, api_hash)
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        await self._client.connect()

    async def stop(self) -> None:
        await self._client.disconnect()

    async def is_authorized(self) -> bool:
        return await self._client.is_user_authorized()

    async def search(self, query: str, *, hours: int = 6, limit: int = 30) -> List[SearchHit]:
        """
        Полнотекстовый поиск по публичным каналам Telegram.
        Использует contacts.Search для нахождения каналов по ключевому слову,
        затем выбирает свежие посты, содержащие запрос.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        out: list[SearchHit] = []

        async with self._lock:
            # Telethon: contacts.Search возвращает каналы и пользователей
            try:
                found = await self._client(SearchRequest(q=query, limit=20))
            except Exception:
                return out

            channel_limit = int(os.environ.get("TG_SEARCH_CHANNEL_LIMIT", "10"))
            channels = [c for c in getattr(found, "chats", []) if getattr(c, "broadcast", False)]
            for ch in channels[:channel_limit]:
                username = getattr(ch, "username", None)
                if not username:
                    continue
                try:
                    async for msg in self._client.iter_messages(
                        ch, search=query, limit=10, offset_date=None
                    ):
                        if not msg.message:
                            continue
                        if msg.date and msg.date < cutoff:
                            break
                        out.append(
                            SearchHit(
                                channel=f"@{username}",
                                url=f"https://t.me/{username}/{msg.id}",
                                text=msg.message[:500],
                                date=msg.date or datetime.now(timezone.utc),
                            )
                        )
                        if len(out) >= limit:
                            break
                except Exception:
                    continue
                if len(out) >= limit:
                    break

        return out[:limit]
