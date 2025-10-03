import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { fadeInUp, slideUp, staggerContainer, staggerItem, springTransition } from "@/components/ui/motion";
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
import { apiService, type WeatherPredictionDto } from "@/lib/api";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

type DataPoint = { hour: string; temp: number; humidity: number; wind: number; rain: number; comfort: number };

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
  if (typeof document !== "undefined") document.title = "Will It Rain On My Parade? – Results";

  const query = useQuery();
  const navigate = useNavigate();
  const location = query.get("location") || "Unknown";
  const datetime = formatDateTime(query.get("datetime"));
  const concerns = (query.get("concerns") || "").split(",").filter(Boolean);

  const data = useMemo(() => {
    const seed = Array.from(location).reduce((a, c) => a + c.charCodeAt(0), 0) + concerns.length * 13;
    const rand = seededRandom(seed);
    const hours = Array.from({ length: 12 }, (_, i) => i * 2);
    const baseTemp = 16 + Math.floor(rand() * 12);
    return hours.map((h) => {
      const temp = baseTemp + Math.sin((h / 24) * Math.PI * 2) * 6 + rand() * 2;
      const humidity = 45 + rand() * 50;
      const wind = 4 + rand() * 18;
      const rain = Math.max(0, Math.min(100, (rand() * 100 + (humidity - 50) + (20 - wind)) / 1.2));
      const comfort = Math.max(
        0,
        Math.min(
          100,
          100 -
            (Math.abs(temp - 22) * (concerns.includes("heat") ? 2 : 1)) -
            (Math.max(0, humidity - 60) * (concerns.includes("humidity") ? 1.2 : 0.8)) -
            (rain * (concerns.includes("rain") ? 0.9 : 0.6)) -
            (wind * (concerns.includes("wind") ? 2 : 1.2)),
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
  }, [location, concerns]);

  const latest = data[Math.min(data.length - 1, 6)];

  const [serverLatest, setServerLatest] = useState<WeatherPredictionDto | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const res = await apiService.getLatestWeatherPrediction();
      if (!isMounted) return;
      if (res.data) {
        setServerLatest(res.data);
      } else if (res.status === 404) {
        // Seed one prediction using current synthetic snapshot
        const seed = await apiService.addWeatherPrediction({
          rain: latest.rain,
          snow: 0,
          wind: latest.wind,
          heat: Math.max(0, (latest.temp - 26) * 8),
          cold: Math.max(0, (12 - latest.temp) * 10),
          temperature: `${latest.temp.toFixed(1)}°C`,
          very_hot: 0,
          very_cold: 0,
          very_windy: 0,
          very_wet: latest.rain,
        });
        if (seed.data) {
          // Fetch the created record to display
          const after = await apiService.getLatestWeatherPrediction();
          if (after.data) setServerLatest(after.data);
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const adverse = useMemo(() => {
    const hot = Math.max(0, Math.min(100, (latest.temp - 26) * 8));
    const cold = Math.max(0, Math.min(100, (12 - latest.temp) * 10));
    const windy = Math.max(0, Math.min(100, (latest.wind - 8) * 10));
    const wet = Math.max(0, Math.min(100, latest.rain));
    const uncomfortable = Math.max(0, Math.min(100, 100 - latest.comfort));
    return [
      { key: "Hot", full: "Very Hot", value: Math.round(hot), icon: Thermometer, color: "text-orange-500" },
      { key: "Cold", full: "Very Cold", value: Math.round(cold), icon: Thermometer, color: "text-cyan-500" },
      { key: "Wind", full: "Very Windy", value: Math.round(windy), icon: Wind, color: "text-gray-500" },
      { key: "Rain", full: "Very Wet", value: Math.round(wet), icon: Umbrella, color: "text-blue-500" },
      { key: "Uncomfortable", full: "Very Uncomfortable", value: Math.round(uncomfortable), icon: Frown, color: "text-red-500" },
    ];
  }, [latest]);

  const top = adverse.slice().sort((a, b) => b.value - a.value)[0];

  const idx = Math.min(data.length - 1, 6);
  const prev = data[Math.max(0, idx - 1)];
  const deltas = {
    temp: Math.round(((latest.temp - prev.temp) / Math.max(1, Math.abs(prev.temp))) * 100),
    humidity: Math.round(((latest.humidity - prev.humidity) / Math.max(1, Math.abs(prev.humidity))) * 100),
    wind: Math.round(((latest.wind - prev.wind) / Math.max(1, Math.abs(prev.wind))) * 100),
    rain: Math.round(((latest.rain - prev.rain) / Math.max(1, Math.abs(prev.rain))) * 100),
  };

  const recommendation = serverLatest
    ? { tone: serverLatest.recommendation === "Good" ? "good" as const : "caution" as const, icon: serverLatest.recommendation === "Good" ? CheckCircle2 : AlertTriangle, text: serverLatest.recommendation, sub: "Based on latest backend prediction" }
    : latest.comfort >= 65
      ? { tone: "good" as const, icon: CheckCircle2, text: "Excellent conditions for outdoor plans.", sub: "Low risk of disruptive weather." }
      : { tone: "caution" as const, icon: AlertTriangle, text: "Conditions may be limiting.", sub: "Plan flexible or indoor options." };

  return (
    <motion.div 
      className="container mx-auto max-w-5xl px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h1 
        className="mb-2 text-2xl font-semibold tracking-tight"
        variants={slideUp}
        initial="initial"
        animate="animate"
        transition={springTransition}
      >
        Will It Rain On My Parade?
      </motion.h1>
      <motion.div 
        className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...springTransition, delay: 0.2 }}
      >
        <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {location}</span>
        {datetime && <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {datetime}</span>}
        <div className="ml-auto flex items-center gap-2">
          {concerns.map((c, index) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                ...springTransition, 
                delay: 0.4 + (index * 0.1)
              }}
            >
              <Badge variant="secondary" className="capitalize">{c}</Badge>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Overall recommendation alert with applied background */}
      <motion.div
        className="mb-8 relative overflow-hidden rounded-2xl min-h-[93px] shadow-soft bg-cover bg-center p-8"
        style={{ backgroundImage: "linear-gradient(to top, var(--primary-superlight), transparent), url('https://lh3.googleusercontent.com/aida-public/AB6AXuAwVWJYsyORS7yKut8-omHhxJsq05p_JBtgYhHAF2EKfZqXVHjxbdkhIl6oMJVJtnX-LWOb93COAjEwVIRIgoqJ68XIhU85uDvuF8lYeO1QKW-m_Df-uyRC_itULhuCzVrSzig0vCzTQNN0eHnWnV3DR2RQjHgxzPLJRyzgLRvxxQFXY7BNL_AF9lRAApKvVb39gneThwGah4HkLsyOWyVzGdIIz_fcracS1ahpSU1K-aUH6m8QE01V9oBy1g9GA3rB_DxAyPYWKaIS')" }}
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...springTransition, delay: 0.4 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        <div className="relative flex items-start gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              ...springTransition, 
              delay: 0.6,
              type: "spring",
              stiffness: 200,
              damping: 15
            }}
          >
            {(() => { const RecIcon = recommendation.icon; return (
              <RecIcon className={`mt-0.5 h-6 w-6 ${recommendation.tone === "good" ? "text-[hsl(var(--wc-azure-600))]" : "text-[hsl(var(--wc-azure-700))]"}`} />
            ); })()}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springTransition, delay: 0.8 }}
          >
            <p className="font-semibold text-foreground drop-shadow-md">Overall Recommendation: {recommendation.text}</p>
            <p className="text-sm text-foreground drop-shadow">{recommendation.sub}</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Icon square cards */}
      <motion.div 
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {adverse.map((item, index) => {
          const isTop = item.key === top.key;
          return (
            <motion.div
              key={item.key}
              variants={staggerItem}
              transition={{ ...springTransition, delay: index * 0.1 }}
            >
              <Card
                className={`transition-shadow ${isTop ? "ring-2 ring-primary/60 dark:ring-primary/50 bg-[hsl(var(--wc-sky-50))] dark:bg-secondary/20 shadow-soft-lg" : "hover:shadow-soft-lg"}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className={`h-6 w-6 ${item.key === "Wind" ? "text-muted-foreground" : item.color} ${isTop ? "drop-shadow-md" : ""}`} />
                        <span className={`${isTop ? "font-semibold" : ""}`}>{item.key === "Hot" ? "Very Hot" : item.key === "Cold" ? "Very Cold" : item.key === "Wind" ? "Very Wind" : item.key === "Rain" ? "Very Rainy" : item.key === "Uncomfortable" ? "Very Uncomfortable" : item.key}</span>
                      </div>
                      <motion.span 
                        className={`font-semibold ${isTop ? "text-xl" : "text-lg"}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                          ...springTransition, 
                          delay: 0.5 + (index * 0.1),
                          type: "spring",
                          stiffness: 300,
                          damping: 20
                        }}
                      >
                        {item.value}%
                      </motion.span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ 
                      duration: 1,
                      delay: 0.8 + (index * 0.1),
                      ease: "easeOut"
                    }}
                    style={{ transformOrigin: "left" }}
                  >
                    <Progress value={item.value} className={`h-2 ${isTop ? "bg-primary/20" : ""}`} />
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        <motion.div
          variants={staggerItem}
          transition={{ ...springTransition, delay: 0.6 }}
        >
          <Card className="flex items-center justify-center text-center">
            <CardContent className="p-6">
              <p className="text-muted-foreground">Want to check another location or event?</p>
              <button
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                onClick={() => navigate("/")}
              >
                <RefreshCw className="h-4 w-4" /> New Forecast
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* One concise tip */}
      <motion.div 
        className="mt-8 rounded-xl border bg-card p-4 shadow-soft"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...springTransition, delay: 1.0 }}
      >
        <motion.div 
          className="text-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springTransition, delay: 1.2 }}
        >
          <span className="font-medium">Top tip: </span>
          {top.full === "Very Wet" && "Carry an umbrella and waterproof layers."}
          {top.full === "Very Windy" && "Secure loose items and consider windproof clothing."}
          {top.full === "Very Hot" && "Avoid peak sun hours and stay hydrated."}
          {top.full === "Very Cold" && "Layer up; consider gloves and a hat."}
          {top.full === "Very Uncomfortable" && "Plan flexible indoor options as backup."}
        </motion.div>
      </motion.div>

      {/* Inserted section: Current Conditions */}
      <motion.section 
        className="mt-8"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...springTransition, delay: 1.4 }}
      >
        <motion.h2 
          className="mb-3 text-2xl font-bold tracking-[-0.015em] text-foreground"
          variants={slideUp}
          initial="initial"
          animate="animate"
          transition={{ ...springTransition, delay: 1.6 }}
        >
          Current Conditions
        </motion.h2>
        <motion.div 
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Temperature */}
          <motion.div
            variants={staggerItem}
            transition={{ ...springTransition, delay: 1.8 }}
          >
            <Card className="bg-card border shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-base font-medium">Temperature</p>
                  <Thermometer className="h-5 w-5 text-orange-400" />
                </div>
                <motion.p 
                  className="mt-1 text-4xl font-bold text-foreground"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    ...springTransition, 
                    delay: 2.0,
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                >
                  {latest.temp.toFixed(1)}°C
                </motion.p>
                <motion.div 
                  className={`mt-1 flex items-center gap-1 text-sm ${deltas.temp >= 0 ? "text-green-600" : "text-red-600"}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springTransition, delay: 2.2 }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      ...springTransition, 
                      delay: 2.4,
                      type: "spring",
                      stiffness: 400,
                      damping: 15
                    }}
                  >
                    {deltas.temp >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </motion.div>
                  <span>{deltas.temp >= 0 ? "+" : ""}{deltas.temp}%</span>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Humidity */}
          <motion.div
            variants={staggerItem}
            transition={{ ...springTransition, delay: 2.0 }}
          >
            <Card className="bg-card border shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-base font-medium">Humidity</p>
                  <Droplets className="h-5 w-5 text-blue-400" />
                </div>
                <motion.p className="mt-1 text-4xl font-bold text-foreground" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...springTransition, delay: 2.2, type: "spring", stiffness: 300, damping: 20 }}>
                  {latest.humidity}%
                </motion.p>
                <motion.div className={`mt-1 flex items-center gap-1 text-sm ${deltas.humidity >= 0 ? "text-green-600" : "text-red-600"}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springTransition, delay: 2.4 }}>
                  <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...springTransition, delay: 2.6, type: "spring", stiffness: 400, damping: 15 }}>
                    {deltas.humidity >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </motion.div>
                  <span>{deltas.humidity >= 0 ? "+" : ""}{deltas.humidity}%</span>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Wind */}
          <motion.div
            variants={staggerItem}
            transition={{ ...springTransition, delay: 2.2 }}
          >
            <Card className="bg-card border shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-base font-medium">Wind Speed</p>
                  <Wind className="h-5 w-5 text-gray-400" />
                </div>
                <motion.p className="mt-1 text-4xl font-bold text-foreground" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...springTransition, delay: 2.4, type: "spring", stiffness: 300, damping: 20 }}>
                  {latest.wind.toFixed(1)} km/h
                </motion.p>
                <motion.div className={`mt-1 flex items-center gap-1 text-sm ${deltas.wind >= 0 ? "text-green-600" : "text-red-600"}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springTransition, delay: 2.6 }}>
                  <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...springTransition, delay: 2.8, type: "spring", stiffness: 400, damping: 15 }}>
                    {deltas.wind >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </motion.div>
                  <span>{deltas.wind >= 0 ? "+" : ""}{deltas.wind}%</span>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Rain */}
          <motion.div
            variants={staggerItem}
            transition={{ ...springTransition, delay: 2.4 }}
          >
            <Card className="bg-card border shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-base font-medium">Rain Probability</p>
                  <Umbrella className="h-5 w-5 text-indigo-400" />
                </div>
                <motion.p className="mt-1 text-4xl font-bold text-foreground" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...springTransition, delay: 2.6, type: "spring", stiffness: 300, damping: 20 }}>
                  {latest.rain}%
                </motion.p>
                <motion.div className={`mt-1 flex items-center gap-1 text-sm ${deltas.rain >= 0 ? "text-red-600" : "text-green-600"}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springTransition, delay: 2.8 }}>
                  <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...springTransition, delay: 3.0, type: "spring", stiffness: 400, damping: 15 }}>
                    {deltas.rain >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </motion.div>
                  <span>{deltas.rain >= 0 ? "+" : ""}{deltas.rain}%</span>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.section>

 {/* Probability Section (from ML output or synthetic values) */}
      <section className="mt-8">
        <h2 className="mb-3 text-2xl font-bold tracking-[-0.015em] text-foreground">Probabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Rain Probability */}
          <Card className="shadow-md">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <Umbrella className={`h-6 w-6 ${latest.rain > 70 ? "text-blue-700" : "text-blue-500"}`} />
              <p className="mt-2 text-sm text-muted-foreground">Rain Probability</p>
              <p className={`text-2xl font-bold ${latest.rain > 70 ? "text-blue-700" : "text-blue-500"}`}>
                {latest.rain}%
              </p>
            </CardContent>
          </Card>

          {/* Heat Probability */}
          <Card className="shadow-md">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <Thermometer className={`h-6 w-6 ${(adverse.find(a => a.key === "Hot")?.value ?? 0) > 70 ? "text-red-700" : "text-red-500"}`} />
              <p className="mt-2 text-sm text-muted-foreground">Heat Probability</p>
              <p className={`text-2xl font-bold ${(adverse.find(a => a.key === "Hot")?.value ?? 0) > 70 ? "text-red-700" : "text-red-500"}`}>
                {adverse.find(a => a.key === "Hot")?.value ?? 0}%
              </p>
            </CardContent>
          </Card>

          {/* Cold Probability */}
          <Card className="shadow-md">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <Thermometer className={`h-6 w-6 ${(adverse.find(a => a.key === "Cold")?.value ?? 0) > 70 ? "text-cyan-700" : "text-cyan-500"}`} />
              <p className="mt-2 text-sm text-muted-foreground">Cold Probability</p>
              <p className={`text-2xl font-bold ${(adverse.find(a => a.key === "Cold")?.value ?? 0) > 70 ? "text-cyan-700" : "text-cyan-500"}`}>
                {adverse.find(a => a.key === "Cold")?.value ?? 0}%
              </p>
            </CardContent>
          </Card>

          {/* Wind Speed */}
          <Card className="shadow-md">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <Wind className={`h-6 w-6 ${latest.wind > 30 ? "text-indigo-700" : "text-gray-500"}`} />
              <p className="mt-2 text-sm text-muted-foreground">Wind Speed</p>
              <p className={`text-2xl font-bold ${latest.wind > 30 ? "text-indigo-700" : "text-gray-500"}`}>
                {latest.wind.toFixed(1)} km/h
              </p>
            </CardContent>
          </Card>

          {/* Temperature */}
          <Card className="shadow-md">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <Thermometer className={`h-6 w-6 ${latest.temp > 35 ? "text-orange-700" : "text-orange-500"}`} />
              <p className="mt-2 text-sm text-muted-foreground">Temperature</p>
              <p className={`text-2xl font-bold ${latest.temp > 35 ? "text-orange-700" : "text-orange-500"}`}>
                {latest.temp.toFixed(1)}°C
              </p>
            </CardContent>
          </Card>
        </div>
      </section>



      {/* Trends using provided visual style */}
      <motion.section 
        className="mt-8"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...springTransition, delay: 3.2 }}
      >
        <motion.h2 
          className="mb-3 text-lg font-semibold tracking-tight"
          variants={slideUp}
          initial="initial"
          animate="animate"
          transition={{ ...springTransition, delay: 3.4 }}
        >
          Trends
        </motion.h2>
        <motion.div 
          className="grid gap-6 md:grid-cols-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Temperature area graph (Recharts) */}
          <motion.div
            variants={staggerItem}
            transition={{ ...springTransition, delay: 3.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Temperature Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springTransition, delay: 3.8 }}
                >
                  <ChartContainer
                    config={{ temp: { label: "Temp (°C)", color: "hsl(var(--wc-azure-600))" } }}
                    className="h-56"
                  >
                    <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-temp)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-temp)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, "dataMax + 5"]} width={30} />
                      <Area type="monotone" dataKey="temp" stroke="var(--color-temp)" strokeWidth={2.5} fill="url(#tempGradient)" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </AreaChart>
                  </ChartContainer>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Comfort index bars (Recharts) */}
          <motion.div
            variants={staggerItem}
            transition={{ ...springTransition, delay: 3.8 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comfort Index Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springTransition, delay: 4.0 }}
                >
                  <ChartContainer
                    config={{ comfort: { label: "Comfort", color: "hsl(var(--wc-teal-400))" } }}
                    className="h-56"
                  >
                    <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} width={30} />
                      <Bar dataKey="comfort" fill="var(--color-comfort)" radius={[6, 6, 0, 0]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.section>

      <motion.div 
        className="mt-6 text-center text-xs text-muted-foreground"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 4.2 }}
      >
        Predictions synthesised from multiple data signals. Updated just now.
      </motion.div>
    </motion.div>
  );
}
