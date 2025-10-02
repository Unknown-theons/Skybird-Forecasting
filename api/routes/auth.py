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
from pydantic import ValidationError
import logging

from models.user import User
from services.db import get_session
from schemas.auth import UserRegister, UserLogin, UserResponse, AuthResponse, ErrorResponse


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
    """Register a new user with validation."""
    try:
        # Validate input data
        user_data = UserRegister(**request.get_json())
    except ValidationError as e:
        return jsonify(ErrorResponse(
            error="validation_error",
            detail=str(e)
        ).dict()), 400
    except Exception as e:
        logging.error(f"Registration error: {e}")
        return jsonify(ErrorResponse(error="invalid_request").dict()), 400
    
    assert _bcrypt is not None
    assert _SessionFactory is not None
    
    try:
        pw_hash = _bcrypt.generate_password_hash(user_data.password).decode()
        
        with _SessionFactory() as session:
            user = User(email=user_data.email, password_hash=pw_hash)
            session.add(user)
            session.commit()
            
            return jsonify({"message": "User created successfully"}), 201
            
    except IntegrityError:
        return jsonify(ErrorResponse(error="user_exists").dict()), 409
    except Exception as e:
        logging.error(f"Registration error: {e}")
        return jsonify(ErrorResponse(error="registration_failed").dict()), 500


@bp.post("/api/auth/login")
def login():
    """Login user with validation."""
    try:
        # Validate input data
        login_data = UserLogin(**request.get_json())
    except ValidationError as e:
        return jsonify(ErrorResponse(
            error="validation_error",
            detail=str(e)
        ).dict()), 400
    except Exception as e:
        logging.error(f"Login error: {e}")
        return jsonify(ErrorResponse(error="invalid_request").dict()), 400
    
    assert _bcrypt is not None
    assert _SessionFactory is not None
    
    try:
        with _SessionFactory() as session:
            stmt = select(User).where(User.email == login_data.email)
            user = session.execute(stmt).scalars().first()
            
            if user is None or not _bcrypt.check_password_hash(user.password_hash, login_data.password):
                return jsonify(ErrorResponse(error="invalid_credentials").dict()), 401
            
            token = create_access_token(identity=login_data.email)
            return jsonify(AuthResponse(access_token=token).dict())
            
    except Exception as e:
        logging.error(f"Login error: {e}")
        return jsonify(ErrorResponse(error="login_failed").dict()), 500


@bp.get("/api/auth/me")
@jwt_required()
def me():
    """Get current user information."""
    try:
        identity = get_jwt_identity()
        assert _SessionFactory is not None
        
        with _SessionFactory() as session:
            stmt = select(User).where(User.email == identity)
            user = session.execute(stmt).scalars().first()
            
            if not user:
                return jsonify(ErrorResponse(error="user_not_found").dict()), 404
            
            return jsonify(UserResponse(
                id=user.id,
                email=user.email
            ).dict())
            
    except Exception as e:
        logging.error(f"Get user error: {e}")
        return jsonify(ErrorResponse(error="user_fetch_failed").dict()), 500


