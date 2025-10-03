# Weather Prediction System API Documentation

## Overview

The Weather Prediction System provides a complete backend solution for storing and retrieving weather predictions with automatic recommendation generation. The system uses a separate SQLite database (`weather.db`) to store weather prediction data.

## Database Schema

### WeatherPrediction Table

The system stores weather predictions with the following fields:

#### Core Variables (Required)

- `rain` (Float): Rain probability/intensity (0.0 - 1.0)
- `snow` (Float): Snow probability/intensity (0.0 - 1.0)
- `wind` (Float): Wind intensity (0.0 - 1.0)
- `heat` (Float): Heat intensity (0.0 - 1.0)
- `cold` (Float): Cold intensity (0.0 - 1.0)
- `temperature` (String): Temperature description (e.g., "15 to 20 Celsius")

#### Extreme Variables (Required)

- `very_hot` (Float): Extreme heat probability (0.0 - 1.0)
- `very_cold` (Float): Extreme cold probability (0.0 - 1.0)
- `very_windy` (Float): Extreme wind probability (0.0 - 1.0)
- `very_wet` (Float): Extreme wetness probability (0.0 - 1.0)

#### System Generated Fields

- `id` (Integer): Auto-generated unique identifier
- `recommendation` (String): Auto-generated recommendation based on core variables
- `created_at` (DateTime): Timestamp when prediction was created

## API Endpoints

### Base URL

```
http://localhost:5000/api
```

### 1. Add Weather Prediction

**Endpoint:** `POST /add_prediction`

**Description:** Creates a new weather prediction with automatic recommendation generation.

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "rain": 0.8,
  "snow": 0.2,
  "wind": 0.5,
  "heat": 0.3,
  "cold": 0.4,
  "temperature": "15 to 20 Celsius",
  "very_hot": 0.1,
  "very_cold": 0.0,
  "very_windy": 0.3,
  "very_wet": 0.6
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "recommendation": "Bring an umbrella",
  "status": "success"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Missing required field: rain",
  "status": "error"
}
```

### 2. Get Latest Prediction

**Endpoint:** `GET /latest_prediction`

**Description:** Retrieves the most recently created weather prediction.

**Response (200 OK):**

```json
{
  "id": 1,
  "rain": 0.8,
  "snow": 0.2,
  "wind": 0.5,
  "heat": 0.3,
  "cold": 0.4,
  "temperature": "15 to 20 Celsius",
  "very_hot": 0.1,
  "very_cold": 0.0,
  "very_windy": 0.3,
  "very_wet": 0.6,
  "recommendation": "Bring an umbrella",
  "created_at": "2025-10-02T21:04:54.748190"
}
```

**Response (404 Not Found):**

```json
{
  "error": "No predictions found",
  "status": "error"
}
```

### 3. Get All Predictions

**Endpoint:** `GET /all_predictions`

**Description:** Retrieves all weather predictions ordered by creation date (newest first).

**Response (200 OK):**

```json
{
  "count": 2,
  "predictions": [
    {
      "id": 2,
      "rain": 0.3,
      "snow": 0.0,
      "wind": 0.2,
      "heat": 0.7,
      "cold": 0.1,
      "temperature": "25 to 30 Celsius",
      "very_hot": 0.4,
      "very_cold": 0.0,
      "very_windy": 0.1,
      "very_wet": 0.2,
      "recommendation": "Stay hydrated",
      "created_at": "2025-10-02T21:10:30.123456"
    },
    {
      "id": 1,
      "rain": 0.8,
      "snow": 0.2,
      "wind": 0.5,
      "heat": 0.3,
      "cold": 0.4,
      "temperature": "15 to 20 Celsius",
      "very_hot": 0.1,
      "very_cold": 0.0,
      "very_windy": 0.3,
      "very_wet": 0.6,
      "recommendation": "Bring an umbrella",
      "created_at": "2025-10-02T21:04:54.748190"
    }
  ]
}
```

## Recommendation Logic

The system automatically generates recommendations based on the core weather variables using the following logic:

1. **High Rain (≥ 0.7):** "Bring an umbrella"
2. **High Snow (≥ 0.7):** "Dress warmly and drive carefully"
3. **High Wind (≥ 0.7):** "Secure loose objects"
4. **High Heat (≥ 0.7):** "Stay hydrated"
5. **High Cold (≥ 0.7):** "Bundle up"
6. **Default:** "Have a great day!"

The system checks conditions in the order listed above and returns the first matching recommendation.

## Data Validation

All numeric fields must be between 0.0 and 1.0 (inclusive). The `temperature` field accepts any string value for flexibility in temperature descriptions.

Required fields that must be present in POST requests:

- All core variables (rain, snow, wind, heat, cold, temperature)
- All extreme variables (very_hot, very_cold, very_windy, very_wet)

## Database Files

- **Main Application Database:** `app.db` (contains user authentication data)
- **Weather Prediction Database:** `weather.db` (contains weather prediction data)

## Integration Notes

The weather prediction system is fully integrated into the main Flask application and initializes automatically when the server starts. The system creates the `weather.db` database file in the same directory as the main application.

## Testing Examples

### PowerShell Testing Commands

```powershell
# Add a new prediction
Invoke-WebRequest -Uri "http://localhost:5000/api/add_prediction" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"rain": 0.8, "snow": 0.2, "wind": 0.5, "heat": 0.3, "cold": 0.4, "temperature": "15 to 20 Celsius", "very_hot": 0.1, "very_cold": 0.0, "very_windy": 0.3, "very_wet": 0.6}'

# Get latest prediction
Invoke-WebRequest -Uri "http://localhost:5000/api/latest_prediction" -Method GET

# Get all predictions
Invoke-WebRequest -Uri "http://localhost:5000/api/all_predictions" -Method GET
```

### cURL Testing Commands (Linux/Mac)

```bash
# Add a new prediction
curl -X POST http://localhost:5000/api/add_prediction \
  -H "Content-Type: application/json" \
  -d '{"rain": 0.8, "snow": 0.2, "wind": 0.5, "heat": 0.3, "cold": 0.4, "temperature": "15 to 20 Celsius", "very_hot": 0.1, "very_cold": 0.0, "very_windy": 0.3, "very_wet": 0.6}'

# Get latest prediction
curl -X GET http://localhost:5000/api/latest_prediction

# Get all predictions
curl -X GET http://localhost:5000/api/all_predictions
```

## Error Handling

The API returns appropriate HTTP status codes:

- **200 OK:** Successful GET requests
- **201 Created:** Successful POST requests
- **400 Bad Request:** Invalid input data or missing required fields
- **404 Not Found:** No predictions found (for latest_prediction endpoint)
- **500 Internal Server Error:** Server-side errors

All error responses include a JSON object with `error` and `status` fields for debugging purposes.
