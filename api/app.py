from flask import Flask, jsonify, g
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
import logging
import uuid
from werkzeug.exceptions import HTTPException

# Swagger (Flasgger)
from flasgger import Swagger
# Rate limiting
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
# Metrics
from prometheus_flask_exporter import PrometheusMetrics
# Caching (optional, configured here; per-route decorators can be added later)
from flask_caching import Cache

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

# Swagger setup
swagger = Swagger(app)

# Rate limiter setup (default limits; tune per environment)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
)

# Metrics setup (/metrics endpoint provided)
metrics = PrometheusMetrics(app)
metrics.info("app_info", "Skybird Forecasting API", version="1.0.0")

# Cache setup (simple config; use @cache.cached on routes as needed)
cache = Cache(app, config={
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 60
})

# Request ID correlation for logs
class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            record.request_id = getattr(g, "request_id", "-")
        except Exception:
            record.request_id = "-"
        return True

for handler in logging.getLogger().handlers:
    handler.addFilter(RequestIdFilter())

@app.before_request
def assign_request_id():
    g.request_id = str(uuid.uuid4())

# Global JSON error handling
@app.errorhandler(HTTPException)
def handle_http_exception(e: HTTPException):
    response = e.get_response()
    response.data = jsonify({
        "error": e.name.lower().replace(" ", "_"),
        "status_code": e.code,
        "message": e.description,
        "request_id": getattr(g, "request_id", "-")
    }).data
    response.content_type = "application/json"
    return response

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