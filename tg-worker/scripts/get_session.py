"""Запустите ОДИН РАЗ локально для генерации TG_SESSION_STRING.

Использование:
    pip install telethon
    python scripts/get_session.py

Скрипт спросит API_ID, API_HASH, номер телефона и код подтверждения,
и в конце выдаст строковую сессию — её нужно положить в TG_SESSION_STRING
переменную окружения tg-worker'а.

API_ID и API_HASH получаются на https://my.telegram.org → API development tools.
"""
import asyncio
import getpass

from telethon import TelegramClient
from telethon.sessions import StringSession


async def main() -> None:
    api_id = int(input("TG_API_ID: ").strip())
    api_hash = input("TG_API_HASH: ").strip()
    phone = input("Phone (with country code, e.g. +7999...): ").strip()

    async with TelegramClient(StringSession(), api_id, api_hash) as client:
        await client.start(phone=lambda: phone, password=lambda: getpass.getpass("2FA password (enter if none): "))
        session_str = client.session.save()
        print("\n=== TG_SESSION_STRING ===")
        print(session_str)
        print("=========================\n")
        print("Сохраните в env воркера и НИКОМУ не показывайте.")


if __name__ == "__main__":
    asyncio.run(main())
