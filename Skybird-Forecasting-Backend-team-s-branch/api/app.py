from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

from routes.demo import bp as demo_bp
from routes.auth import bp as auth_bp, init_auth
from routes.weather import bp as weather_bp, init_weather
from models.user import Base
from services.db import engine, get_session
from config import settings
from logging_config import setup_logging, get_logger

load_dotenv()

# Setup logging
setup_logging(level="INFO", environment=settings.environment)
logger = get_logger(__name__)

app = Flask(__name__)

# Security configuration
app.config["JWT_SECRET_KEY"] = settings.jwt_secret_key
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = settings.jwt_access_token_expires
app.config["JWT_ALGORITHM"] = "HS256"

# CORS configuration
CORS(app, origins=settings.cors_origins, supports_credentials=True)

# Auth setup
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
init_auth(bcrypt, jwt)

# Blueprints
app.register_blueprint(demo_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(weather_bp)

if __name__ == "__main__":
    try:
        # Create tables if not exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
        
        # Initialize weather prediction system
        init_weather()
        logger.info("Weather prediction system initialized")
        
        # Start the application
        logger.info(f"Starting application in {settings.environment} mode")
        app.run(
            host="127.0.0.1", 
            port=5000, 
            debug=settings.debug
        )
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise