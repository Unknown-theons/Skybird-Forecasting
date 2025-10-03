from flask import Blueprint, request, jsonify
from models.weather_prediction import WeatherPrediction, get_weather_session, init_weather_db
from sqlalchemy.exc import SQLAlchemyError
from logging_config import get_logger
from pydantic import ValidationError
from schemas.weather import WeatherPredictionCreate, WeatherPredictionResponse, WeatherListResponse

logger = get_logger(__name__)

# Create blueprint
bp = Blueprint('weather', __name__, url_prefix='/api')

def init_weather():
    """Initialize weather prediction routes and database."""
    try:
        init_weather_db()
        logger.info("Weather database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize weather database: {e}")
        raise

@bp.post('/weather')
def add_prediction():
    """Create a new weather prediction using Pydantic validation."""
    try:
        payload = WeatherPredictionCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({"error": "validation_error", "detail": str(e)}), 400
    except Exception:
        return jsonify({"error": "invalid_request"}), 400

    try:
        recommendation = WeatherPrediction.calculate_recommendation(
            rain=payload.rain,
            snow=payload.snow,
            wind=payload.wind,
            heat=payload.heat,
            cold=payload.cold,
        )

        session = get_weather_session()
        try:
            weather_prediction = WeatherPrediction(
                rain=payload.rain,
                snow=payload.snow,
                wind=payload.wind,
                heat=payload.heat,
                cold=payload.cold,
                temperature=payload.temperature,
                very_hot=payload.very_hot,
                very_cold=payload.very_cold,
                very_windy=payload.very_windy,
                very_wet=payload.very_wet,
                recommendation=recommendation,
            )

            session.add(weather_prediction)
            session.commit()

            logger.info(f"Weather prediction created with ID: {weather_prediction.id}")
            return jsonify(WeatherPredictionResponse.from_orm(weather_prediction).dict()), 201
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error while creating weather prediction: {e}")
            return jsonify({"error": "database_error"}), 500
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error in add_prediction: {e}")
        return jsonify({"error": "internal_server_error"}), 500

@bp.get('/weather/latest')
def get_latest_prediction():
    """Get the most recent weather prediction."""
    try:
        session = get_weather_session()
        try:
            latest_prediction = (
                session.query(WeatherPrediction)
                .order_by(WeatherPrediction.created_at.desc())
                .first()
            )

            if not latest_prediction:
                return jsonify({"error": "not_found"}), 404

            return jsonify(WeatherPredictionResponse.from_orm(latest_prediction).dict()), 200
        except SQLAlchemyError as e:
            logger.error(f"Database error while fetching latest prediction: {e}")
            return jsonify({"error": "database_error"}), 500
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error in get_latest_prediction: {e}")
        return jsonify({"error": "internal_server_error"}), 500

@bp.get('/weather')
def get_all_predictions():
    """Get all weather predictions."""
    try:
        session = get_weather_session()
        try:
            all_predictions = (
                session.query(WeatherPrediction)
                .order_by(WeatherPrediction.created_at.desc())
                .all()
            )

            predictions_list = [WeatherPredictionResponse.from_orm(p).dict() for p in all_predictions]
            return jsonify(WeatherListResponse(predictions=predictions_list, count=len(predictions_list)).dict()), 200
        except SQLAlchemyError as e:
            logger.error(f"Database error while fetching all predictions: {e}")
            return jsonify({"error": "database_error"}), 500
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error in get_all_predictions: {e}")
        return jsonify({"error": "internal_server_error"}), 500