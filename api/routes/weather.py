from flask import Blueprint, request, jsonify
from models.weather_prediction import WeatherPrediction, get_weather_session, init_weather_db
from sqlalchemy.exc import SQLAlchemyError
from logging_config import get_logger
from flask_jwt_extended import jwt_required, get_jwt_identity
from typing import List, Dict, Any
from config import settings
import os
import numpy as np
from joblib import load as joblib_load
import threading

logger = get_logger(__name__)

# ML model lazy loader (thread-safe)
_model = None
_model_lock = threading.Lock()

def load_ml_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                model_path = settings.model_path
                if not os.path.exists(model_path):
                    logger.error(f"ML model file not found at {model_path}")
                    raise FileNotFoundError("ML model file not found")
                try:
                    _model = joblib_load(model_path)
                    logger.info(f"ML model loaded from {model_path}")
                except Exception as e:
                    logger.error(f"Failed to load ML model: {e}")
                    raise
    return _model

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

@bp.route('/model/predict', methods=['POST'])
@jwt_required()
def model_predict():
    """
    Run ML model inference.
    
    Request JSON:
    {
      "features": one of:
        - dict of feature_name -> value (in insertion order or with feature_order)
        - list of dicts (batch)
        - list of lists (batch), optionally provide feature_order for docs
      "feature_order": ["f1", "f2", ...] (optional, used when features are dicts)
      "output_mapping": ["rain", "snow", "wind", "heat", "cold"] (optional)
      "persist": true|false (optional, default false)
      "extras": [ { "temperature": "hot", "very_hot": 0.8, "very_cold": 0.1, "very_windy": 0.7, "very_wet": 0.4 }, ... ] (optional, used when persist=true)
    }
    
    Response JSON:
    { "predictions": [ { "rain": ..., "snow": ..., "wind": ..., "heat": ..., "cold": ... }, ... ],
      "persisted_ids": [1,2,...] (if persisted)
    }
    """
    try:
        identity = get_jwt_identity()
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "No JSON data provided"}), 400
        features = payload.get("features")
        feature_order = payload.get("feature_order")
        output_mapping = payload.get("output_mapping", ["rain", "snow", "wind", "heat", "cold"])
        persist = bool(payload.get("persist", False))
        extras_list = payload.get("extras")

        if features is None:
            return jsonify({"error": "'features' is required"}), 400

        # Prepare X
        X: List[List[float]] = []
        if isinstance(features, dict):
            if feature_order and isinstance(feature_order, list):
                X = [[features.get(k) for k in feature_order]]
            else:
                # preserve insertion order of dict values
                X = [list(features.values())]
        elif isinstance(features, list):
            if len(features) == 0:
                return jsonify({"error": "'features' must be non-empty"}), 400
            if isinstance(features[0], dict):
                if feature_order and isinstance(feature_order, list):
                    X = [[row.get(k) for k in feature_order] for row in features]
                else:
                    X = [list(row.values()) for row in features]
            else:
                # assume list of lists
                X = features
        else:
            return jsonify({"error": "'features' must be a dict, list of dicts, or list of lists"}), 400

        # Convert to numpy array
        try:
            X_np = np.array(X, dtype=float)
        except Exception:
            return jsonify({"error": "All feature values must be numeric"}), 400

        # Load model and predict
        model = load_ml_model()
        try:
            preds = model.predict(X_np)
        except Exception as e:
            logger.error(f"Model prediction failed: {e}")
            return jsonify({"error": "Model prediction failed"}), 500

        # Normalize predictions to 2D array
        preds_np = np.array(preds)
        if preds_np.ndim == 1:
            preds_np = preds_np.reshape(-1, 1)
        n_samples, n_targets = preds_np.shape

        # Build prediction dicts
        predictions: List[Dict[str, Any]] = []
        for i in range(n_samples):
            row = preds_np[i].tolist()
            if len(output_mapping) == n_targets:
                pred_dict = {output_mapping[j]: row[j] for j in range(n_targets)}
            else:
                pred_dict = {f"output_{j}": row[j] for j in range(n_targets)}
            predictions.append(pred_dict)

        persisted_ids: List[int] = []
        if persist:
            session = get_weather_session()
            try:
                for idx, pred in enumerate(predictions):
                    # Map core variables
                    rain = float(pred.get("rain", 0.0))
                    snow = float(pred.get("snow", 0.0))
                    wind = float(pred.get("wind", 0.0))
                    heat = float(pred.get("heat", 0.0))
                    cold = float(pred.get("cold", 0.0))

                    recommendation = WeatherPrediction.calculate_recommendation(
                        rain=rain, snow=snow, wind=wind, heat=heat, cold=cold
                    )

                    extras = extras_list[idx] if (isinstance(extras_list, list) and idx < len(extras_list)) else {}
                    temperature = str(extras.get("temperature", "unknown"))
                    very_hot = float(extras.get("very_hot", 0.0))
                    very_cold = float(extras.get("very_cold", 0.0))
                    very_windy = float(extras.get("very_windy", 0.0))
                    very_wet = float(extras.get("very_wet", 0.0))

                    obj = WeatherPrediction(
                        rain=rain,
                        snow=snow,
                        wind=wind,
                        heat=heat,
                        cold=cold,
                        temperature=temperature,
                        very_hot=very_hot,
                        very_cold=very_cold,
                        very_windy=very_windy,
                        very_wet=very_wet,
                        recommendation=recommendation
                    )
                    session.add(obj)
                    session.flush()  # get id without committing each time
                    persisted_ids.append(obj.id)
                session.commit()
                logger.info(f"Persisted {len(persisted_ids)} predictions by {identity}")
            except SQLAlchemyError as e:
                session.rollback()
                logger.error(f"Database error while persisting predictions: {e}")
                return jsonify({"error": "Database error occurred"}), 500
            finally:
                session.close()

        return jsonify({"predictions": predictions, "persisted_ids": persisted_ids}), 200
    except Exception as e:
        logger.error(f"Error in model_predict: {e}")
        return jsonify({"error": "Internal server error"}), 500