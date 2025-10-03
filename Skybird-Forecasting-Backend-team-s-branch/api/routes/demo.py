from flask import Blueprint, jsonify

bp = Blueprint("demo", __name__)

@bp.get("/api/ping")
def ping():
    return jsonify({"message": "pong"})