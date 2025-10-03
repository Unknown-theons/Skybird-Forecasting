from __future__ import annotations

from dataclasses import dataclass
from sqlalchemy import String, DateTime, func, Boolean, Text, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from typing import Optional, Dict, Any
from datetime import datetime


class Base(DeclarativeBase):
    pass


@dataclass
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    
    # User profile fields
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # User preferences
    temperature_unit: Mapped[str] = mapped_column(String(10), default="celsius")  # celsius or fahrenheit
    language: Mapped[str] = mapped_column(String(10), default="en")
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # User settings (JSON field for flexible preferences)
    preferences: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


