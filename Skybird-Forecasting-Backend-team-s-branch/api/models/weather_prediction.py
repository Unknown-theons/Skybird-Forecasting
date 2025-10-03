from __future__ import annotations

import os
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

# SQLAlchemy 2.0 style base for weather database
class WeatherBase(DeclarativeBase):
    pass

# Weather database configuration
WEATHER_DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "weather.db")
)
weather_engine = create_engine(f"sqlite:///{WEATHER_DB_PATH}", echo=False, future=True)
WeatherSessionLocal = sessionmaker(
    bind=weather_engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

class WeatherPrediction(WeatherBase):
    __tablename__ = "weather_predictions"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Core variables
    rain: Mapped[float] = mapped_column(Float, nullable=False)
    snow: Mapped[float] = mapped_column(Float, nullable=False)
    wind: Mapped[float] = mapped_column(Float, nullable=False)
    heat: Mapped[float] = mapped_column(Float, nullable=False)
    cold: Mapped[float] = mapped_column(Float, nullable=False)
    temperature: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "-10 to -15 Celsius"

    # Extreme variables
    very_hot: Mapped[float] = mapped_column(Float, nullable=False)
    very_cold: Mapped[float] = mapped_column(Float, nullable=False)
    very_windy: Mapped[float] = mapped_column(Float, nullable=False)
    very_wet: Mapped[float] = mapped_column(Float, nullable=False)

    # Final field
    recommendation: Mapped[str] = mapped_column(String(255), nullable=False)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    @staticmethod
    def calculate_recommendation(rain: float, snow: float, wind: float, heat: float, cold: float) -> str:
        """
        Calculate recommendation based on the highest core variable.
        """
        core_variables = {
            "rain": rain,
            "snow": snow,
            "wind": wind,
            "heat": heat,
            "cold": cold,
        }

        # Find the variable with the highest value
        highest_variable = max(core_variables, key=core_variables.get)

        # Map to recommendations
        recommendations = {
            "rain": "Bring an umbrella",
            "snow": "Wear boots",
            "wind": "Bring a hat",
            "heat": "Bring sunglasses",
            "cold": "Bring a jacket",
        }

        return recommendations[highest_variable]

    def to_dict(self) -> dict:
        """Convert the model instance to a dictionary."""
        return {
            "id": self.id,
            "rain": self.rain,
            "snow": self.snow,
            "wind": self.wind,
            "heat": self.heat,
            "cold": self.cold,
            "temperature": self.temperature,
            "very_hot": self.very_hot,
            "very_cold": self.very_cold,
            "very_windy": self.very_windy,
            "very_wet": self.very_wet,
            "recommendation": self.recommendation,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def get_weather_session():
    """Get a database session for weather predictions."""
    return WeatherSessionLocal()


def init_weather_db():
    """Initialize the weather database tables."""
    WeatherBase.metadata.create_all(bind=weather_engine)