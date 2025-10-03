from flask import Blueprint, request, jsonify
from models.weather_prediction import WeatherPrediction, get_weather_session, init_weather_db
from sqlalchemy.exc import SQLAlchemyError
from logging_config import get_logger

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

@bp.route('/add_prediction', methods=['POST'])
def add_prediction():
    """
    Add a new weather prediction.
    
    Expected JSON input:
    {
        "rain": float,
        "snow": float,
        "wind": float,
        "heat": float,
        "cold": float,
        "temperature": string,
        "very_hot": float,
        "very_cold": float,
        "very_windy": float,
        "very_wet": float
    }
    
    Returns:
    {
        "status": "success",
        "id": int,
        "recommendation": string
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Validate required fields
        required_fields = [
            'rain', 'snow', 'wind', 'heat', 'cold', 'temperature',
            'very_hot', 'very_cold', 'very_windy', 'very_wet'
        ]
        
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        # Validate numeric fields
        numeric_fields = [
            'rain', 'snow', 'wind', 'heat', 'cold',
            'very_hot', 'very_cold', 'very_windy', 'very_wet'
        ]
        
        for field in numeric_fields:
            try:
                float(data[field])
            except (ValueError, TypeError):
                return jsonify({
                    "error": f"Field '{field}' must be a valid number"
                }), 400
        
        # Calculate recommendation based on core variables
        recommendation = WeatherPrediction.calculate_recommendation(
            rain=float(data['rain']),
            snow=float(data['snow']),
            wind=float(data['wind']),
            heat=float(data['heat']),
            cold=float(data['cold'])
        )
        
        # Create new weather prediction
        session = get_weather_session()
        try:
            weather_prediction = WeatherPrediction(
                rain=float(data['rain']),
                snow=float(data['snow']),
                wind=float(data['wind']),
                heat=float(data['heat']),
                cold=float(data['cold']),
                temperature=str(data['temperature']),
                very_hot=float(data['very_hot']),
                very_cold=float(data['very_cold']),
                very_windy=float(data['very_windy']),
                very_wet=float(data['very_wet']),
                recommendation=recommendation
            )
            
            session.add(weather_prediction)
            session.commit()
            
            prediction_id = weather_prediction.id
            
            logger.info(f"Weather prediction created with ID: {prediction_id}")
            
            return jsonify({
                "status": "success",
                "id": prediction_id,
                "recommendation": recommendation
            }), 201
            
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error while creating weather prediction: {e}")
            return jsonify({"error": "Database error occurred"}), 500
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error in add_prediction: {e}")
        return jsonify({"error": "Internal server error"}), 500

@bp.route('/latest_prediction', methods=['GET'])
def get_latest_prediction():
    """
    Get the most recent weather prediction.
    
    Returns:
    {
        "id": int,
        "rain": float,
        "snow": float,
        "wind": float,
        "heat": float,
        "cold": float,
        "temperature": string,
        "very_hot": float,
        "very_cold": float,
        "very_windy": float,
        "very_wet": float,
        "recommendation": string,
        "created_at": string (ISO format)
    }
    """
    try:
        session = get_weather_session()
        try:
            # Get the most recent prediction
            latest_prediction = session.query(WeatherPrediction)\
                .order_by(WeatherPrediction.created_at.desc())\
                .first()
            
            if not latest_prediction:
                return jsonify({"error": "No predictions found"}), 404
            
            return jsonify(latest_prediction.to_dict()), 200
            
        except SQLAlchemyError as e:
            logger.error(f"Database error while fetching latest prediction: {e}")
            return jsonify({"error": "Database error occurred"}), 500
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error in get_latest_prediction: {e}")
        return jsonify({"error": "Internal server error"}), 500

@bp.route('/all_predictions', methods=['GET'])
def get_all_predictions():
    """
    Get all weather predictions.
    
    Returns:
    {
        "predictions": [
            {
                "id": int,
                "rain": float,
                "snow": float,
                "wind": float,
                "heat": float,
                "cold": float,
                "temperature": string,
                "very_hot": float,
                "very_cold": float,
                "very_windy": float,
                "very_wet": float,
                "recommendation": string,
                "created_at": string (ISO format)
            },
            ...
        ],
        "count": int
    }
    """
    try:
        session = get_weather_session()
        try:
            # Get all predictions ordered by creation date (newest first)
            all_predictions = session.query(WeatherPrediction)\
                .order_by(WeatherPrediction.created_at.desc())\
                .all()
            
            predictions_list = [prediction.to_dict() for prediction in all_predictions]
            
            return jsonify({
                "predictions": predictions_list,
                "count": len(predictions_list)
            }), 200
            
        except SQLAlchemyError as e:
            logger.error(f"Database error while fetching all predictions: {e}")
            return jsonify({"error": "Database error occurred"}), 500
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error in get_all_predictions: {e}")
        return jsonify({"error": "Internal server error"}), 500