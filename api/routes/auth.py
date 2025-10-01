from flask import Flask
from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from typing import Callable, Optional
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from models.user import User
from services.db import get_session


bp = Blueprint("auth", __name__)


# DB session factory and bcrypt/jwt singletons
_SessionFactory: Optional[Callable[[], Session]] = None
_bcrypt: Bcrypt | None = None
_jwt: JWTManager | None = None


def init_auth(bcrypt: Bcrypt, jwt: JWTManager) -> None:
    global _bcrypt, _jwt, _SessionFactory
    _bcrypt = bcrypt
    _jwt = jwt
    _SessionFactory = get_session


@bp.post("/api/auth/register")
def register():
    assert _bcrypt is not None
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "missing_fields"}), 400
    pw_hash = _bcrypt.generate_password_hash(password).decode()
    assert _SessionFactory is not None
    with _SessionFactory() as session:  # type: Session
        user = User(email=email, password_hash=pw_hash)
        session.add(user)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "user_exists"}), 409
    return jsonify({"ok": True}), 201


@bp.post("/api/auth/login")
def login():
    assert _bcrypt is not None
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")
    assert _SessionFactory is not None
    with _SessionFactory() as session:  # type: Session
        stmt = select(User).where(User.email == email)
        user = session.execute(stmt).scalars().first()
    if user is None or not _bcrypt.check_password_hash(user.password_hash, password or ""):
        return jsonify({"error": "invalid_credentials"}), 401
    token = create_access_token(identity=email)
    return jsonify({"accessToken": token})


@bp.get("/api/auth/me")
@jwt_required()
def me():
    identity = get_jwt_identity()
    return jsonify({"email": identity})


