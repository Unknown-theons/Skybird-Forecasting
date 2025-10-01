import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import {
  Database,
  Filter,
  Layers,
  BrainCircuit,
  Sparkles,
  Cloud,
  MapPin,
  Wind,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const steps = [
  {
    title: "1. Data Collection",
    desc: "We gather historical and real-time weather data for your location—temperature, wind, precipitation, and more.",
    icon: Database,
  },
  {
    title: "2. Data Preprocessing",
    desc: "Raw data is cleaned and standardized. We handle inconsistencies and fill gaps for accuracy.",
    icon: Filter,
  },
  {
    title: "3. Feature Engineering",
    desc: "We build indicators like heat index, wind chill, and combined metrics for very windy/wet/uncomfortable.",
    icon: Layers,
  },
  {
    title: "4. Model Training",
    desc: "Our model learns patterns that lead to hot, cold, windy, and wet scenarios for outdoor events.",
    icon: BrainCircuit,
  },
  {
    title: "5. Prediction & Recommendation",
    desc: "Given your query, the model predicts condition likelihoods and provides clear guidance.",
    icon: Sparkles,
  },
] as const;

function useTrainingAnimation() {
  const full = useMemo(() => {
    const epochs = 24;
    return Array.from({ length: epochs }, (_, i) => {
      const t = i / (epochs - 1);
      const loss = 1.2 - t * 1.0 + Math.max(0, 0.06 - Math.random() * 0.12);
      const acc = 0.45 + t * 0.5 + Math.max(0, 0.06 - Math.random() * 0.12);
      return { epoch: i + 1, loss: Math.max(0.08, +loss.toFixed(2)), acc: Math.min(0.99, +acc.toFixed(2)) };
    });
  }, []);

  const [index, setIndex] = useState(3);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i < full.length ? i + 1 : i));
    }, 220);
    return () => clearInterval(id);
  }, [full.length]);

  return full.slice(0, index);
}

function makeNormalizedProbs() {
  const names = ["Very Hot", "Very Cold", "Very Windy", "Very Wet", "Very Uncomfortable"] as const;
  let vals = Array(5).fill(0).map(() => Math.random() * Math.random());
  const sum = vals.reduce((a, b) => a + b, 0) || 1;
  vals = vals.map((v) => Math.round((v / sum) * 100));
  const total = vals.reduce((a, b) => a + b, 0);
  if (total !== 100) {
    const idx = vals.indexOf(Math.max(...vals));
    vals[idx] += 100 - total;
  }
  return names.map((name, i) => ({ name, p: vals[i] }));
}

export default function Model() {
  const trainingData = useTrainingAnimation();
  const [probs, setProbs] = useState(() => makeNormalizedProbs());
  const runDemo = () => setProbs(makeNormalizedProbs());

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="text-center mb-12 sm:mb-16">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tighter bg-gradient-to-r from-foreground to-primary/60 bg-clip-text text-transparent"
        >
          Predicting Your Perfect Day
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-3 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto"
        >
          See how we analyze weather data to tell you if your parade will be impacted by uncomfortable conditions.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Left: timeline */}
        <div className="xl:col-span-3 relative">
          <div className="relative pl-10">
            <div className="pointer-events-none absolute left-[19px] top-5 bottom-5 w-[2px] rounded bg-slate-300/30 dark:bg-slate-700" />
            <motion.div variants={container} initial="hidden" animate="show">
              {steps.map(({ title, desc, icon: Icon }, i) => (
                <motion.div key={title} variants={item} className="relative pl-8 pb-10 last:pb-0">
                  <div className="absolute left-0 top-1.5 h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm" />
                  <Card className="border-blue-200/40 dark:border-blue-900/60 bg-white/70 dark:bg-slate-800/60 backdrop-blur card-hover">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <span>{title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Right: data sources + training chart */}
        <div className="xl:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
            <Card className="border-blue-200/40 dark:border-blue-900/60 bg-white/70 dark:bg-slate-800/60 backdrop-blur card-hover">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" />Data Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3"><Database className="h-4 w-4 text-primary mt-0.5" /><div><strong className="font-medium">Live Weather APIs:</strong><br />Real-time temperature, humidity, wind, and precipitation.</div></li>
                  <li className="flex items-start gap-3"><MapPin className="h-4 w-4 text-primary mt-0.5" /><div><strong className="font-medium">Historical Weather Data:</strong><br />Patterns and anomalies for specific locations.</div></li>
                  <li className="flex items-start gap-3"><Wind className="h-4 w-4 text-primary mt-0.5" /><div><strong className="font-medium">Geospatial Data:</strong><br />Elevation and proximity to water bodies.</div></li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.05 }}>
            <Card className="border-blue-200/40 dark:border-blue-900/60 bg-white/70 dark:bg-slate-800/60 backdrop-blur card-hover">
              <CardHeader>
                <CardTitle className="text-lg">Training Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    loss: { label: "Loss", color: "hsl(var(--wc-azure-600))" },
                    acc: { label: "Accuracy", color: "hsl(var(--wc-teal-400))" },
                  }}
                  className="h-56"
                >
                  <LineChart data={trainingData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, 1.4]} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 1]} hide />
                    <Line yAxisId="left" type="monotone" dataKey="loss" stroke="var(--color-loss)" strokeWidth={2.5} dot={false} isAnimationActive />
                    <Line yAxisId="right" type="monotone" dataKey="acc" stroke="var(--color-acc)" strokeWidth={2.5} dot={false} isAnimationActive />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.1 }}>
            <Card className="border-blue-200/40 dark:border-blue-900/60 bg-white/70 dark:bg-slate-800/60 backdrop-blur card-hover">
              <CardHeader>
                <CardTitle className="text-lg">AI Model at Work</CardTitle>
              </CardHeader>
              <CardContent>
                {/* local styles for simple animations */}
                <style>
                  {`
                  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
                  @keyframes drawPath { to { stroke-dashoffset: 0; } }
                  .animate-fade-in { animation: fadeIn .6s ease-out both; }
                  .animated-path { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: drawPath 2.2s ease-in-out forwards; }
                  @keyframes pulse { 0% { transform: scale(1); opacity: .35 } 50% { transform: scale(1.12); opacity: .08 } 100% { transform: scale(1); opacity: .35 } }
                  .pulse { transform-origin: center; transform-box: fill-box; animation: pulse 1.8s ease-in-out infinite; }
                `}
                </style>
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-lg">
                    <svg className="w-full h-auto" viewBox="0 0 400 360">
                      <defs>
                        <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#93c5fd" />
                        </linearGradient>
                        <marker id="arrowhead" markerHeight={6} markerWidth={6} orient="auto-start-reverse" refX={5} refY={5} viewBox="0 0 10 10">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--secondary-color)" />
                        </marker>
                        <marker id="arrowhead-strong" markerHeight={10} markerWidth={10} orient="auto-start-reverse" refX={5} refY={5} viewBox="0 0 10 10">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--wc-azure-600))" transform="rotate(180 5 5)" />
                        </marker>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      <g className="animate-fade-in" style={{ animationDelay: "300ms" }}>
                        <rect x={5} y={110} width={90} height={80} rx={8} fill="#293548" stroke="#3b82f6" strokeWidth={1.5} />
                        <text x={50} y={140} textAnchor="middle" fill="#e2e8f0" fontFamily="Manrope, sans-serif" fontSize={12}>Input Data</text>
                        <text x={50} y={160} textAnchor="middle" fill="#94a3b8" fontFamily="Manrope, sans-serif" fontSize={9}>(Temp, Wind, etc)</text>
                      </g>

                      <g className="animate-fade-in" style={{ animationDelay: "500ms" }}>
                        <circle cx={200} cy={150} r={55} fill="none" stroke="var(--primary-color)" className="pulse" />
                        <circle cx={200} cy={150} r={45} fill="#0f172a" stroke="var(--primary-color)" strokeWidth={2} />
                        <text x={200} y={185} textAnchor="middle" fontSize={12} fontWeight={700} fill="#e2e8f0">AI Core</text>
                      </g>

                      <g className="animate-fade-in" style={{ animationDelay: "700ms" }} fontFamily="Manrope, sans-serif" fontSize={10} textAnchor="middle">
                        <rect x={310} y={30} width={85} height={40} rx={6} fill="#1e293b" stroke="#4a5568" />
                        <text x={352.5} y={48} fill="#f87171" fontWeight={700}>Very Hot</text>
                        <text x={352.5} y={60} fill="#94a3b8">Likelihood</text>

                        <rect x={310} y={90} width={85} height={40} rx={6} fill="#1e293b" stroke="#4a5568" />
                        <text x={352.5} y={108} fill="#60a5fa" fontWeight={700}>Very Cold</text>
                        <text x={352.5} y={120} fill="#94a3b8">Likelihood</text>

                        <rect x={310} y={150} width={85} height={40} rx={6} fill="#1e293b" stroke="#4a5568" />
                        <text x={352.5} y={168} fill="#a78bfa" fontWeight={700}>Very Windy</text>
                        <text x={352.5} y={180} fill="#94a3b8">Likelihood</text>

                        <rect x={310} y={210} width={85} height={40} rx={6} fill="#1e293b" stroke="#4a5568" />
                        <text x={352.5} y={228} fill="#34d399" fontWeight={700}>Very Wet</text>
                        <text x={352.5} y={240} fill="#94a3b8">Likelihood</text>

                        <rect x={310} y={270} width={85} height={40} rx={6} fill="#1e293b" stroke="#4a5568" />
                        <text x={352.5} y={292} fill="#f59e0b" fontWeight={700} fontSize={8}>Very Uncomfortable</text>
                        <text x={352.5} y={310} fill="#94a3b8">Likelihood</text>
                      </g>

                      <g stroke="url(#path-gradient)" strokeWidth={2} markerEnd="url(#arrowhead)">
                        <g stroke="hsl(var(--wc-azure-600))" strokeWidth={2.5} markerEnd="url(#arrowhead-strong)" filter="url(#glow)">
                          <path className="animated-path" d="M95 150 C 125 135, 145 135, 155 150" fill="none" style={{ animationDelay: "420ms" }} />
                        </g>
                        <path className="animated-path" d="M245 150 C 270 150, 290 50, 310 50" fill="none" style={{ animationDelay: "600ms" }} />
                        <path className="animated-path" d="M245 150 C 270 150, 290 110, 310 110" fill="none" style={{ animationDelay: "700ms" }} />
                        <path className="animated-path" d="M245 150 C 270 150, 290 170, 310 170" fill="none" style={{ animationDelay: "800ms" }} />
                        <path className="animated-path" d="M245 150 C 270 150, 290 230, 310 230" fill="none" style={{ animationDelay: "900ms" }} />
                        <path className="animated-path" d="M245 150 C 270 150, 290 290, 310 290" fill="none" style={{ animationDelay: "1000ms" }} />
                      </g>
                    </svg>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-4 max-w-md">
                    The AI ingests various data points, processes them through its neural network core, and outputs a probability score for each adverse weather condition.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Interactive demo */}
      <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-primary/60 bg-clip-text text-transparent">Interactive Prediction Demo</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Simulate a query for your event. Click "Run Demo" to see the predicted likelihood of adverse conditions.
        </p>
        <Card className="mx-auto max-w-2xl border-blue-200/40 dark:border-blue-900/60 bg-white/70 dark:bg-slate-800/60 backdrop-blur card-hover">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Prediction Probabilities</CardTitle>
            <Button size="sm" onClick={runDemo} className="gap-2">Run Demo</Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ p: { label: "Probability", color: "hsl(var(--wc-azure-700))" } }} className="h-72">
              <RadarChart data={probs} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                <Radar name="p" dataKey="p" stroke="var(--color-p)" fill="var(--color-p)" fillOpacity={0.25} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
