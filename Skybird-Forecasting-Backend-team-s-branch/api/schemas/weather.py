"""Pydantic schemas for weather prediction endpoints."""
from pydantic import BaseModel, validator
from typing import Literal
from datetime import datetime

CoreVar = Literal["rain", "snow", "wind", "heat", "cold"]

class WeatherPredictionCreate(BaseModel):
    rain: float
    snow: float
    wind: float
    heat: float
    cold: float
    temperature: str
    very_hot: float
    very_cold: float
    very_windy: float
    very_wet: float

    @validator("temperature")
    def validate_temperature(cls, v):
        if not v or len(v) < 2:
            raise ValueError("temperature must be a descriptive string, e.g., '-10 to -15 Celsius'")
        return v

    @validator("rain", "snow", "wind", "heat", "cold", "very_hot", "very_cold", "very_windy", "very_wet")
    def validate_numeric(cls, v):
        if not isinstance(v, (int, float)):
            raise ValueError("must be numeric")
        return float(v)

class WeatherPredictionResponse(BaseModel):
    id: int
    rain: float
    snow: float
    wind: float
    heat: float
    cold: float
    temperature: str
    very_hot: float
    very_cold: float
    very_windy: float
    very_wet: float
    recommendation: str
    created_at: datetime

    class Config:
        from_attributes = True

class WeatherListResponse(BaseModel):
    predictions: list[WeatherPredictionResponse]
    count: int