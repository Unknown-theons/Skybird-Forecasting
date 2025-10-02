// Fake weather data generator for preferred cities
export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  comfort: number;
  conditions: string;
  forecast: Array<{
    hour: string;
    temp: number;
    humidity: number;
    wind: number;
    rain: number;
    comfort: number;
  }>;
}

// City-specific weather patterns
const cityWeatherPatterns: Record<string, {
  baseTemp: number;
  tempRange: number;
  humidityBase: number;
  windBase: number;
  rainBase: number;
}> = {
  'New York': { baseTemp: 15, tempRange: 12, humidityBase: 60, windBase: 8, rainBase: 30 },
  'London': { baseTemp: 12, tempRange: 8, humidityBase: 75, windBase: 12, rainBase: 45 },
  'Tokyo': { baseTemp: 18, tempRange: 10, humidityBase: 70, windBase: 6, rainBase: 40 },
  'Sydney': { baseTemp: 20, tempRange: 8, humidityBase: 65, windBase: 10, rainBase: 25 },
  'Paris': { baseTemp: 14, tempRange: 10, humidityBase: 70, windBase: 8, rainBase: 35 },
  'Berlin': { baseTemp: 13, tempRange: 9, humidityBase: 68, windBase: 9, rainBase: 40 },
  'Moscow': { baseTemp: 8, tempRange: 15, humidityBase: 60, windBase: 7, rainBase: 30 },
  'Los Angeles': { baseTemp: 22, tempRange: 6, humidityBase: 50, windBase: 5, rainBase: 10 },
  'Miami': { baseTemp: 26, tempRange: 4, humidityBase: 80, windBase: 8, rainBase: 35 },
  'Toronto': { baseTemp: 10, tempRange: 12, humidityBase: 65, windBase: 9, rainBase: 40 },
  'Cairo': { baseTemp: 25, tempRange: 8, humidityBase: 45, windBase: 6, rainBase: 5 },
};

export function generateWeatherData(city: string): WeatherData {
  console.log('Generating weather data for city:', city);
  
  // Normalize city name for case-insensitive lookup
  const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  console.log('Normalized city name:', normalizedCity);
  
  // Get city pattern or use default
  const pattern = cityWeatherPatterns[normalizedCity] || cityWeatherPatterns[city] || {
    baseTemp: 16,
    tempRange: 10,
    humidityBase: 60,
    windBase: 8,
    rainBase: 30
  };
  
  console.log('Using pattern for', city, ':', pattern);

  // Generate seed based on city name and current date
  const seed = Array.from(city).reduce((a, c) => a + c.charCodeAt(0), 0) + 
               Math.floor(Date.now() / (1000 * 60 * 60)); // Changes every hour

  // Seeded random function
  function seededRandom(seed: number) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  const rand = seededRandom(seed);
  
  // Generate current conditions
  const currentHour = new Date().getHours();
  const tempVariation = Math.sin((currentHour / 24) * Math.PI * 2) * 4;
  const temperature = pattern.baseTemp + tempVariation + (rand() - 0.5) * pattern.tempRange;
  const humidity = Math.max(30, Math.min(90, pattern.humidityBase + (rand() - 0.5) * 30));
  const windSpeed = Math.max(2, pattern.windBase + (rand() - 0.5) * 8);
  const rainProbability = Math.max(0, Math.min(100, pattern.rainBase + (rand() - 0.5) * 40));
  
  // Calculate comfort (0-100)
  const comfort = Math.max(0, Math.min(100, 
    100 - 
    (Math.abs(temperature - 22) * 2) - 
    (Math.max(0, humidity - 60) * 0.8) - 
    (rainProbability * 0.6) - 
    (windSpeed * 1.2)
  ));

  // Determine conditions
  let conditions = 'Clear';
  if (rainProbability > 60) conditions = 'Rainy';
  else if (rainProbability > 30) conditions = 'Cloudy';
  else if (temperature > 28) conditions = 'Hot';
  else if (temperature < 5) conditions = 'Cold';
  else if (windSpeed > 15) conditions = 'Windy';

  // Generate 12-hour forecast
  const forecast = Array.from({ length: 12 }, (_, i) => {
    const hour = (currentHour + i * 2) % 24;
    const hourTemp = pattern.baseTemp + Math.sin((hour / 24) * Math.PI * 2) * 4 + (rand() - 0.5) * pattern.tempRange;
    const hourHumidity = Math.max(30, Math.min(90, pattern.humidityBase + (rand() - 0.5) * 30));
    const hourWind = Math.max(2, pattern.windBase + (rand() - 0.5) * 8);
    const hourRain = Math.max(0, Math.min(100, pattern.rainBase + (rand() - 0.5) * 40));
    const hourComfort = Math.max(0, Math.min(100, 
      100 - 
      (Math.abs(hourTemp - 22) * 2) - 
      (Math.max(0, hourHumidity - 60) * 0.8) - 
      (hourRain * 0.6) - 
      (hourWind * 1.2)
    ));

    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      temp: Math.round(hourTemp * 10) / 10,
      humidity: Math.round(hourHumidity),
      wind: Math.round(hourWind * 10) / 10,
      rain: Math.round(hourRain),
      comfort: Math.round(hourComfort)
    };
  });

  return {
    location: city,
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity),
    windSpeed: Math.round(windSpeed * 10) / 10,
    rainProbability: Math.round(rainProbability),
    comfort: Math.round(comfort),
    conditions,
    forecast
  };
}

// Get weather conditions description
export function getWeatherDescription(comfort: number, _conditions: string): string {
  if (comfort >= 80) return "Excellent conditions for outdoor activities!";
  if (comfort >= 60) return "Good conditions with minor considerations.";
  if (comfort >= 40) return "Moderate conditions - plan accordingly.";
  if (comfort >= 20) return "Challenging conditions - consider alternatives.";
  return "Difficult conditions - indoor activities recommended.";
}

// Get weather tips based on conditions
export function getWeatherTips(conditions: string, temperature: number, humidity: number, windSpeed: number): string[] {
  const tips: string[] = [];
  
  if (conditions === 'Rainy') {
    tips.push("Carry an umbrella and waterproof layers.");
  }
  if (conditions === 'Hot' || temperature > 28) {
    tips.push("Avoid peak sun hours and stay hydrated.");
  }
  if (conditions === 'Cold' || temperature < 5) {
    tips.push("Layer up with warm clothing and consider gloves.");
  }
  if (conditions === 'Windy' || windSpeed > 15) {
    tips.push("Secure loose items and consider windproof clothing.");
  }
  if (humidity > 80) {
    tips.push("High humidity - dress in breathable fabrics.");
  }
  if (windSpeed > 20) {
    tips.push("Very windy conditions - avoid outdoor activities if possible.");
  }
  
  return tips.length > 0 ? tips : ["Conditions are generally favorable for outdoor activities."];
}
