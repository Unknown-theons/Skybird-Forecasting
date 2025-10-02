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
from datetime import datetime

from models.user import User
from services.db import get_session
from schemas.auth import (
    UserRegister, UserLogin, UserResponse, AuthResponse, ErrorResponse,
    UserUpdate, PasswordChange
)


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
            user = User(
                email=user_data.email, 
                password_hash=pw_hash,
                full_name=user_data.full_name
            )
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
            
            # Update last login
            user.last_login = datetime.utcnow()
            session.commit()
            
            token = create_access_token(identity=login_data.email)
            user_response = UserResponse.from_orm(user)
            return jsonify(AuthResponse(access_token=token, user=user_response).dict())
            
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
            
            return jsonify(UserResponse.from_orm(user).dict())
            
    except Exception as e:
        logging.error(f"Get user error: {e}")
        return jsonify(ErrorResponse(error="user_fetch_failed").dict()), 500


@bp.put("/api/auth/profile")
@jwt_required()
def update_profile():
    """Update user profile information."""
    try:
        # Validate input data
        update_data = UserUpdate(**request.get_json())
    except ValidationError as e:
        return jsonify(ErrorResponse(
            error="validation_error",
            detail=str(e)
        ).dict()), 400
    except Exception as e:
        logging.error(f"Profile update error: {e}")
        return jsonify(ErrorResponse(error="invalid_request").dict()), 400
    
    assert _SessionFactory is not None
    
    try:
        identity = get_jwt_identity()
        
        with _SessionFactory() as session:
            stmt = select(User).where(User.email == identity)
            user = session.execute(stmt).scalars().first()
            
            if not user:
                return jsonify(ErrorResponse(error="user_not_found").dict()), 404
            
            # Update fields that are provided
            if update_data.full_name is not None:
                user.full_name = update_data.full_name
            if update_data.bio is not None:
                user.bio = update_data.bio
            if update_data.avatar_url is not None:
                user.avatar_url = update_data.avatar_url
            if update_data.temperature_unit is not None:
                user.temperature_unit = update_data.temperature_unit
            if update_data.language is not None:
                user.language = update_data.language
            if update_data.timezone is not None:
                user.timezone = update_data.timezone
            if update_data.preferences is not None:
                user.preferences = update_data.preferences
            
            session.commit()
            
            return jsonify(UserResponse.from_orm(user).dict())
            
    except Exception as e:
        logging.error(f"Profile update error: {e}")
        return jsonify(ErrorResponse(error="profile_update_failed").dict()), 500


@bp.post("/api/auth/change-password")
@jwt_required()
def change_password():
    """Change user password."""
    try:
        # Validate input data
        password_data = PasswordChange(**request.get_json())
    except ValidationError as e:
        return jsonify(ErrorResponse(
            error="validation_error",
            detail=str(e)
        ).dict()), 400
    except Exception as e:
        logging.error(f"Password change error: {e}")
        return jsonify(ErrorResponse(error="invalid_request").dict()), 400
    
    assert _bcrypt is not None
    assert _SessionFactory is not None
    
    try:
        identity = get_jwt_identity()
        
        with _SessionFactory() as session:
            stmt = select(User).where(User.email == identity)
            user = session.execute(stmt).scalars().first()
            
            if not user:
                return jsonify(ErrorResponse(error="user_not_found").dict()), 404
            
            # Verify current password
            if not _bcrypt.check_password_hash(user.password_hash, password_data.current_password):
                return jsonify(ErrorResponse(error="invalid_current_password").dict()), 400
            
            # Update password
            new_password_hash = _bcrypt.generate_password_hash(password_data.new_password).decode()
            user.password_hash = new_password_hash
            session.commit()
            
            return jsonify({"message": "Password updated successfully"})
            
    except Exception as e:
        logging.error(f"Password change error: {e}")
        return jsonify(ErrorResponse(error="password_change_failed").dict()), 500


