from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

from routes.demo import bp as demo_bp
from routes.auth import bp as auth_bp, init_auth
from models.user import Base
from services.db import engine

load_dotenv()

app = Flask(__name__)
CORS(app)

# Auth setup
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
init_auth(bcrypt, jwt)

# Blueprints
app.register_blueprint(demo_bp)
app.register_blueprint(auth_bp)

if __name__ == "__main__":
    # Create tables if not exist
    Base.metadata.create_all(bind=engine)
    app.run(host="127.0.0.1", port=5000, debug=True)