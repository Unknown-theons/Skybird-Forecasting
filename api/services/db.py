from __future__ import annotations

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session


def get_sqlite_url() -> str:
    path = os.environ.get("DATABASE_PATH", os.path.join(os.getcwd(), "app.db"))
    return f"sqlite:///{path}"


engine = create_engine(get_sqlite_url(), echo=False, future=True)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False))


def get_session():
    return SessionLocal()


