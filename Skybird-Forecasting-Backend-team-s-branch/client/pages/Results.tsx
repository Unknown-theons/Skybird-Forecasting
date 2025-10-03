import { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  generateWeatherData,
  getWeatherDescription,
  getWeatherTips,
} from "@/lib/weather-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import {
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  MapPin,
  Umbrella,
  Wind,
  Droplets,
  Thermometer,
  Frown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

type DataPoint = {
  hour: string;
  temp: number;
  humidity: number;
  wind: number;
  rain: number;
  comfort: number;
};

function seededRandom(seed: number) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function formatDateTime(dt: string | null) {
  if (!dt) return null;
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default function Results() {
  if (typeof document !== "undefined")
    document.title = "Will It Rain On My Parade? – Results";

  const query = useQuery();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = query.get("location") || "Unknown";
  const datetime = formatDateTime(query.get("datetime"));
  const concerns = (query.get("concerns") || "").split(",").filter(Boolean);

  // Debug logging
  console.log("=== RESULTS PAGE DEBUG ===");
  console.log("Current URL:", window.location.href);
  console.log("URL search params:", window.location.search);
  console.log("Query object entries:", Object.fromEntries(query.entries()));
  console.log("Location param:", query.get("location"));
  console.log("Concerns param:", query.get("concerns"));
  console.log("Final location value:", location);
  console.log("=== END RESULTS PAGE DEBUG ===");

  const [weatherData, setWeatherData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGeneratedData, setHasGeneratedData] = useState(false);

  // Generate weather data for the location
  useEffect(() => {
    if (location && location !== "Unknown" && !hasGeneratedData) {
      setIsLoading(true);
      setHasGeneratedData(true);
      console.log("Generating weather data for location:", location);
      // Simulate API call delay
      setTimeout(() => {
        const data = generateWeatherData(location);
        setWeatherData(data);
        setIsLoading(false);
      }, 500);
    } else if (location === "Unknown" && !hasGeneratedData) {
      // If no location is provided, try to use user's preferred city
      if (user?.preferences?.preferred_city) {
        console.log(
          "No location in URL, using user preferred city:",
          user.preferences.preferred_city,
        );
        const params = new URLSearchParams();
        params.set("location", user.preferences.preferred_city);
        params.set("concerns", "rain,humidity");
        const url = `/results?${params.toString()}`;
        console.log("Redirecting to:", url);
        navigate(url);
      } else {
        console.log(
          "No location provided and no preferred city, redirecting to home page",
        );
        navigate("/?new=true");
      }
    }
  }, [location, hasGeneratedData, navigate, user]);

  const data = useMemo(() => {
    if (weatherData) {
      // Use generated weather data
      return weatherData.forecast.map((item: any) => ({
        hour: item.hour,
        temp: item.temp,
        humidity: item.humidity,
        wind: item.wind,
        rain: item.rain,
        comfort: item.comfort,
      })) as DataPoint[];
    }

    // Fallback to original seeded random data
    const seed =
      Array.from(location).reduce((a, c) => a + c.charCodeAt(0), 0) +
      concerns.length * 13;
    const rand = seededRandom(seed);
    const hours = Array.from({ length: 12 }, (_, i) => i * 2);
    const baseTemp = 16 + Math.floor(rand() * 12);
    return hours.map((h) => {
      const temp = baseTemp + Math.sin((h / 24) * Math.PI * 2) * 6 + rand() * 2;
      const humidity = 45 + rand() * 50;
      const wind = 4 + rand() * 18;
      const rain = Math.max(
        0,
        Math.min(100, (rand() * 100 + (humidity - 50) + (20 - wind)) / 1.2),
      );
      const comfort = Math.max(
        0,
        Math.min(
          100,
          100 -
            Math.abs(temp - 22) * (concerns.includes("heat") ? 2 : 1) -
            Math.max(0, humidity - 60) *
              (concerns.includes("humidity") ? 1.2 : 0.8) -
            rain * (concerns.includes("rain") ? 0.9 : 0.6) -
            wind * (concerns.includes("wind") ? 2 : 1.2),
        ),
      );
      return {
        hour: `${h}:00`,
        temp: Math.round(temp * 10) / 10,
        humidity: Math.round(humidity),
        wind: Math.round(wind * 10) / 10,
        rain: Math.round(rain),
        comfort: Math.round(comfort),
      } as DataPoint;
    });
  }, [location, concerns, weatherData]);

  const latest = data[Math.min(data.length - 1, 6)];

  const adverse = useMemo(() => {
    const hot = Math.max(0, Math.min(100, (latest.temp - 26) * 8));
    const cold = Math.max(0, Math.min(100, (12 - latest.temp) * 10));
    const windy = Math.max(0, Math.min(100, (latest.wind - 8) * 10));
    const wet = Math.max(0, Math.min(100, latest.rain));
    const uncomfortable = Math.max(0, Math.min(100, 100 - latest.comfort));
    return [
      {
        key: "Hot",
        full: "Very Hot",
        value: Math.round(hot),
        icon: Thermometer,
        color: "text-orange-500",
      },
      {
        key: "Cold",
        full: "Very Cold",
        value: Math.round(cold),
        icon: Thermometer,
        color: "text-cyan-500",
      },
      {
        key: "Wind",
        full: "Very Windy",
        value: Math.round(windy),
        icon: Wind,
        color: "text-gray-500",
      },
      {
        key: "Rain",
        full: "Very Wet",
        value: Math.round(wet),
        icon: Umbrella,
        color: "text-blue-500",
      },
      {
        key: "Uncomfortable",
        full: "Very Uncomfortable",
        value: Math.round(uncomfortable),
        icon: Frown,
        color: "text-red-500",
      },
    ];
  }, [latest]);

  const top = adverse.slice().sort((a, b) => b.value - a.value)[0];

  const idx = Math.min(data.length - 1, 6);
  const prev = data[Math.max(0, idx - 1)];
  const deltas = {
    temp: Math.round(
      ((latest.temp - prev.temp) / Math.max(1, Math.abs(prev.temp))) * 100,
    ),
    humidity: Math.round(
      ((latest.humidity - prev.humidity) /
        Math.max(1, Math.abs(prev.humidity))) *
        100,
    ),
    wind: Math.round(
      ((latest.wind - prev.wind) / Math.max(1, Math.abs(prev.wind))) * 100,
    ),
    rain: Math.round(
      ((latest.rain - prev.rain) / Math.max(1, Math.abs(prev.rain))) * 100,
    ),
  };

  const recommendation = useMemo(() => {
    if (weatherData) {
      const description = getWeatherDescription(
        weatherData.comfort,
        weatherData.conditions,
      );
      return weatherData.comfort >= 65
        ? {
            tone: "good" as const,
            icon: CheckCircle2,
            text: description,
            sub: "Low risk of disruptive weather.",
          }
        : {
            tone: "caution" as const,
            icon: AlertTriangle,
            text: description,
            sub: "Plan flexible or indoor options.",
          };
    }

    return latest.comfort >= 65
      ? {
          tone: "good" as const,
          icon: CheckCircle2,
          text: "Excellent conditions for outdoor plans.",
          sub: "Low risk of disruptive weather.",
        }
      : {
          tone: "caution" as const,
          icon: AlertTriangle,
          text: "Conditions may be limiting.",
          sub: "Plan flexible or indoor options.",
        };
  }, [latest.comfort, weatherData]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Loading weather data for {location}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Will It Rain On My Parade?
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/?new=true")}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Search New Location
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-4 w-4" /> {location}
        </span>
        {datetime && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" /> {datetime}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {concerns.map((c) => (
            <Badge key={c} variant="secondary" className="capitalize">
              {c}
            </Badge>
          ))}
        </div>
      </div>

      {/* Overall recommendation alert with applied background */}
      <div
        className="mb-8 relative overflow-hidden rounded-2xl min-h-[93px] shadow-soft bg-cover bg-center p-8"
        style={{
          backgroundImage:
            "linear-gradient(to top, var(--primary-superlight), transparent), url('https://lh3.googleusercontent.com/aida-public/AB6AXuAwVWJYsyORS7yKut8-omHhxJsq05p_JBtgYhHAF2EKfZqXVHjxbdkhIl6oMJVJtnX-LWOb93COAjEwVIRIgoqJ68XIhU85uDvuF8lYeO1QKW-m_Df-uyRC_itULhuCzVrSzig0vCzTQNN0eHnWnV3DR2RQjHgxzPLJRyzgLRvxxQFXY7BNL_AF9lRAApKvVb39gneThwGah4HkLsyOWyVzGdIIz_fcracS1ahpSU1K-aUH6m8QE01V9oBy1g9GA3rB_DxAyPYWKaIS')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        <div className="relative flex items-start gap-3">
          {(() => {
            const RecIcon = recommendation.icon;
            return (
              <RecIcon
                className={`mt-0.5 h-6 w-6 ${recommendation.tone === "good" ? "text-[hsl(var(--wc-azure-600))]" : "text-[hsl(var(--wc-azure-700))]"}`}
              />
            );
          })()}
          <div>
            <p className="font-semibold text-foreground drop-shadow-md">
              Overall Recommendation: {recommendation.text}
            </p>
            <p className="text-sm text-foreground drop-shadow">
              {recommendation.sub}
            </p>
          </div>
        </div>
      </div>

      {/* Icon square cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {adverse.map((item) => {
          const isTop = item.key === top.key;
          return (
            <Card
              key={item.key}
              className={`transition-shadow ${isTop ? "ring-2 ring-primary/60 dark:ring-primary/50 bg-[hsl(var(--wc-sky-50))] dark:bg-secondary/20 shadow-soft-lg" : "hover:shadow-soft-lg"}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon
                        className={`h-6 w-6 ${item.key === "Wind" ? "text-muted-foreground" : item.color} ${isTop ? "drop-shadow-md" : ""}`}
                      />
                      <span className={`${isTop ? "font-semibold" : ""}`}>
                        {item.key === "Hot"
                          ? "Very Hot"
                          : item.key === "Cold"
                            ? "Very Cold"
                            : item.key === "Wind"
                              ? "Very Wind"
                              : item.key === "Rain"
                                ? "Very Rainy"
                                : item.key === "Uncomfortable"
                                  ? "Very Uncomfortable"
                                  : item.key}
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${isTop ? "text-xl" : "text-lg"}`}
                    >
                      {item.value}%
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress
                  value={item.value}
                  className={`h-2 ${isTop ? "bg-primary/20" : ""}`}
                />
              </CardContent>
            </Card>
          );
        })}
        <Card className="flex items-center justify-center text-center">
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Want to check another location or event?
            </p>
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              onClick={() => navigate("/?new=true")}
            >
              <RefreshCw className="h-4 w-4" /> New Forecast
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Weather tips */}
      <div className="mt-8 rounded-xl border bg-card p-4 shadow-soft">
        <div className="text-sm">
          <span className="font-medium">Weather tips: </span>
          {weatherData ? (
            <div className="mt-2">
              {getWeatherTips(
                weatherData.conditions,
                weatherData.temperature,
                weatherData.humidity,
                weatherData.windSpeed,
              ).map((tip, index) => (
                <div key={index} className="mb-1">
                  {tip}
                </div>
              ))}
            </div>
          ) : (
            <div>
              {top.full === "Very Wet" &&
                "Carry an umbrella and waterproof layers."}
              {top.full === "Very Windy" &&
                "Secure loose items and consider windproof clothing."}
              {top.full === "Very Hot" &&
                "Avoid peak sun hours and stay hydrated."}
              {top.full === "Very Cold" &&
                "Layer up; consider gloves and a hat."}
              {top.full === "Very Uncomfortable" &&
                "Plan flexible indoor options as backup."}
            </div>
          )}
        </div>
      </div>

      {/* Inserted section: Current Conditions */}
      <section className="mt-8">
        <h2 className="mb-3 text-2xl font-bold tracking-[-0.015em] text-foreground">
          Current Conditions
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Temperature */}
          <Card className="bg-card border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-base font-medium">
                  Temperature
                </p>
                <Thermometer className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mt-1 text-4xl font-bold text-foreground">
                {latest.temp.toFixed(1)}°C
              </p>
              <div
                className={`mt-1 flex items-center gap-1 text-sm ${deltas.temp >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {deltas.temp >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>
                  {deltas.temp >= 0 ? "+" : ""}
                  {deltas.temp}%
                </span>
              </div>
            </CardContent>
          </Card>
          {/* Humidity */}
          <Card className="bg-card border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-base font-medium">
                  Humidity
                </p>
                <Droplets className="h-5 w-5 text-blue-400" />
              </div>
              <p className="mt-1 text-4xl font-bold text-foreground">
                {latest.humidity}%
              </p>
              <div
                className={`mt-1 flex items-center gap-1 text-sm ${deltas.humidity >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {deltas.humidity >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>
                  {deltas.humidity >= 0 ? "+" : ""}
                  {deltas.humidity}%
                </span>
              </div>
            </CardContent>
          </Card>
          {/* Wind */}
          <Card className="bg-card border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-base font-medium">
                  Wind Speed
                </p>
                <Wind className="h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-1 text-4xl font-bold text-foreground">
                {latest.wind.toFixed(1)} km/h
              </p>
              <div
                className={`mt-1 flex items-center gap-1 text-sm ${deltas.wind >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {deltas.wind >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>
                  {deltas.wind >= 0 ? "+" : ""}
                  {deltas.wind}%
                </span>
              </div>
            </CardContent>
          </Card>
          {/* Rain */}
          <Card className="bg-card border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-base font-medium">
                  Rain Probability
                </p>
                <Umbrella className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="mt-1 text-4xl font-bold text-foreground">
                {latest.rain}%
              </p>
              <div
                className={`mt-1 flex items-center gap-1 text-sm ${deltas.rain >= 0 ? "text-red-600" : "text-green-600"}`}
              >
                {deltas.rain >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>
                  {deltas.rain >= 0 ? "+" : ""}
                  {deltas.rain}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trends using provided visual style */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Trends</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Temperature area graph (Recharts) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Temperature Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  temp: {
                    label: "Temp (°C)",
                    color: "hsl(var(--wc-azure-600))",
                  },
                }}
                className="h-56"
              >
                <AreaChart
                  data={data}
                  margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="tempGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--color-temp)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-temp)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, "dataMax + 5"]}
                    width={30}
                  />
                  <Area
                    type="monotone"
                    dataKey="temp"
                    stroke="var(--color-temp)"
                    strokeWidth={2.5}
                    fill="url(#tempGradient)"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Comfort index bars (Recharts) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comfort Index Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  comfort: {
                    label: "Comfort",
                    color: "hsl(var(--wc-teal-400))",
                  },
                }}
                className="h-56"
              >
                <BarChart
                  data={data}
                  margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} width={30} />
                  <Bar
                    dataKey="comfort"
                    fill="var(--color-comfort)"
                    radius={[6, 6, 0, 0]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Predictions synthesised from multiple data signals. Updated just now.
      </div>
    </div>
  );
}
