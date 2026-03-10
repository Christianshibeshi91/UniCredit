from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create all tables and enable WAL mode."""
    async with engine.begin() as conn:
        await conn.execute(
            # WAL mode for concurrent reads during Sheets sync writes
            __import__("sqlalchemy").text("PRAGMA journal_mode=WAL")
        )
        await conn.execute(
            __import__("sqlalchemy").text("PRAGMA busy_timeout=10000")
        )
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session():
    """Dependency that yields an async database session."""
    async with async_session() as session:
        yield session
