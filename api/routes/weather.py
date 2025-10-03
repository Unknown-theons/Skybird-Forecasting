from flask import Blueprint, request, jsonify
from models.weather_prediction import WeatherPrediction, get_weather_session, init_weather_db
from sqlalchemy.exc import SQLAlchemyError
from logging_config import get_logger
from flask_jwt_extended import jwt_required, get_jwt_identity
from typing import List, Dict, Any

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
@jwt_required()
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
        identity = get_jwt_identity()
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
            
            logger.info(f"Weather prediction created with ID: {prediction_id} by {identity}")
            
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

@bp.route('/add_predictions_bulk', methods=['POST'])
@jwt_required()
def add_predictions_bulk():
    """
    Bulk add weather predictions. Accepts a JSON array of prediction objects
    with the same schema as /api/add_prediction.
    Returns inserted IDs and count.
    """
    try:
        identity = get_jwt_identity()
        payload = request.get_json()
        if not isinstance(payload, list):
            return jsonify({"error": "Expected a JSON array of prediction objects"}), 400
        
        # Prepare objects
        to_insert: List[WeatherPrediction] = []
        for idx, data in enumerate(payload):
            # Basic validation
            required_fields = [
                'rain', 'snow', 'wind', 'heat', 'cold', 'temperature',
                'very_hot', 'very_cold', 'very_windy', 'very_wet'
            ]
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return jsonify({
                    "error": f"Item {idx}: Missing required fields: {', '.join(missing_fields)}"
                }), 400
            numeric_fields = [
                'rain', 'snow', 'wind', 'heat', 'cold',
                'very_hot', 'very_cold', 'very_windy', 'very_wet'
            ]
            for field in numeric_fields:
                try:
                    float(data[field])
                except (ValueError, TypeError):
                    return jsonify({
                        "error": f"Item {idx}: Field '{field}' must be a valid number"
                    }), 400
            
            recommendation = WeatherPrediction.calculate_recommendation(
                rain=float(data['rain']),
                snow=float(data['snow']),
                wind=float(data['wind']),
                heat=float(data['heat']),
                cold=float(data['cold'])
            )
            obj = WeatherPrediction(
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
            to_insert.append(obj)
        
        session = get_weather_session()
        try:
            session.add_all(to_insert)
            session.commit()
            ids = [obj.id for obj in to_insert]
            logger.info(f"Bulk inserted {len(ids)} predictions by {identity}")
            return jsonify({"status": "success", "count": len(ids), "ids": ids}), 201
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error during bulk insert: {e}")
            return jsonify({"error": "Database error occurred"}), 500
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error in add_predictions_bulk: {e}")
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
    Get all weather predictions, with optional filters via query params:
    - min_rain, max_rain, min_snow, max_snow, min_wind, max_wind,
      min_heat, max_heat, min_cold, max_cold
    - recommendation (exact match)
    - limit (default 100), offset (default 0)
    
    Returns:
    {
        "predictions": [...],
        "count": int
    }
    """
    try:
        session = get_weather_session()
        try:
            query = session.query(WeatherPrediction).order_by(WeatherPrediction.created_at.desc())
            
            # Build filters from query params
            def get_float_arg(name: str) -> float | None:
                val = request.args.get(name)
                if val is None:
                    return None
                try:
                    return float(val)
                except ValueError:
                    return None
            
            filters = []
            # Core variable filters
            min_rain = get_float_arg('min_rain'); max_rain = get_float_arg('max_rain')
            min_snow = get_float_arg('min_snow'); max_snow = get_float_arg('max_snow')
            min_wind = get_float_arg('min_wind'); max_wind = get_float_arg('max_wind')
            min_heat = get_float_arg('min_heat'); max_heat = get_float_arg('max_heat')
            min_cold = get_float_arg('min_cold'); max_cold = get_float_arg('max_cold')
            
            if min_rain is not None: filters.append(WeatherPrediction.rain >= min_rain)
            if max_rain is not None: filters.append(WeatherPrediction.rain <= max_rain)
            if min_snow is not None: filters.append(WeatherPrediction.snow >= min_snow)
            if max_snow is not None: filters.append(WeatherPrediction.snow <= max_snow)
            if min_wind is not None: filters.append(WeatherPrediction.wind >= min_wind)
            if max_wind is not None: filters.append(WeatherPrediction.wind <= max_wind)
            if min_heat is not None: filters.append(WeatherPrediction.heat >= min_heat)
            if max_heat is not None: filters.append(WeatherPrediction.heat <= max_heat)
            if min_cold is not None: filters.append(WeatherPrediction.cold >= min_cold)
            if max_cold is not None: filters.append(WeatherPrediction.cold <= max_cold)
            
            recommendation = request.args.get('recommendation')
            if recommendation:
                filters.append(WeatherPrediction.recommendation == recommendation)
            
            if filters:
                query = query.filter(*filters)
            
            # Pagination
            try:
                limit = int(request.args.get('limit', '100'))
                offset = int(request.args.get('offset', '0'))
            except ValueError:
                limit = 100
                offset = 0
            
            predictions = query.offset(offset).limit(limit).all()
            predictions_list = [p.to_dict() for p in predictions]
            
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