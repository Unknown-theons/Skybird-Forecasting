from sqlalchemy import Column, Integer, Float, String, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Create separate base and engine for weather database
WeatherBase = declarative_base()

# Weather database configuration
WEATHER_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'weather.db')
weather_engine = create_engine(f'sqlite:///{WEATHER_DB_PATH}', echo=False)
WeatherSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=weather_engine)

class WeatherPrediction(WeatherBase):
    __tablename__ = "weather_predictions"
    
    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Core variables
    rain = Column(Float, nullable=False)
    snow = Column(Float, nullable=False)
    wind = Column(Float, nullable=False)
    heat = Column(Float, nullable=False)
    cold = Column(Float, nullable=False)
    temperature = Column(String, nullable=False)  # e.g., "-10 to -15 Celsius"
    
    # Extreme variables
    very_hot = Column(Float, nullable=False)
    very_cold = Column(Float, nullable=False)
    very_windy = Column(Float, nullable=False)
    very_wet = Column(Float, nullable=False)
    
    # Final field
    recommendation = Column(String, nullable=False)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    
    @staticmethod
    def calculate_recommendation(rain, snow, wind, heat, cold):
        """
        Calculate recommendation based on the highest core variable.
        
        Args:
            rain (float): Rain value
            snow (float): Snow value
            wind (float): Wind value
            heat (float): Heat value
            cold (float): Cold value
            
        Returns:
            str: Recommendation string
        """
        core_variables = {
            'rain': rain,
            'snow': snow,
            'wind': wind,
            'heat': heat,
            'cold': cold
        }
        
        # Find the variable with the highest value
        highest_variable = max(core_variables, key=core_variables.get)
        
        # Map to recommendations
        recommendations = {
            'rain': "Bring an umbrella",
            'snow': "Wear boots",
            'wind': "Bring a hat",
            'heat': "Bring sunglasses",
            'cold': "Bring a jacket"
        }
        
        return recommendations[highest_variable]
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'rain': self.rain,
            'snow': self.snow,
            'wind': self.wind,
            'heat': self.heat,
            'cold': self.cold,
            'temperature': self.temperature,
            'very_hot': self.very_hot,
            'very_cold': self.very_cold,
            'very_windy': self.very_windy,
            'very_wet': self.very_wet,
            'recommendation': self.recommendation,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

def get_weather_session():
    """Get a database session for weather predictions."""
    return WeatherSessionLocal()

def init_weather_db():
    """Initialize the weather database tables."""
    WeatherBase.metadata.create_all(bind=weather_engine)