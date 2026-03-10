"""Create or update the dashboard admin user."""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from sqlmodel import select
from app.core.database import engine, async_session, init_db
from app.core.auth import hash_password
from app.models.user import User


async def main():
    username = os.environ.get("DASHBOARD_USER", "admin")
    password = os.environ.get("DASHBOARD_PASSWORD")

    if not password:
        print("Set DASHBOARD_PASSWORD in .env")
        sys.exit(1)

    await init_db()

    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if user:
            user.password_hash = hash_password(password)
            session.add(user)
            print(f"Updated password for user '{username}'")
        else:
            user = User(username=username, password_hash=hash_password(password))
            session.add(user)
            print(f"Created user '{username}'")

        await session.commit()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
