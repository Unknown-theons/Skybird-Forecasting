import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar } from "recharts";

export default function Visualization() {
  const data = useMemo(() => {
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    return days.map((d, i) => ({
      day: d,
      temp: Math.round(18 + Math.sin((i/6)*Math.PI*2)*6 + (i%3)*1.5),
      comfort: Math.round(50 + Math.cos((i/6)*Math.PI*2)*25 + (i%2?10:0)),
    }));
  }, []);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6">Weekly Weather Trends</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Temperature (°C)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ temp: { label: "Temp", color: "hsl(var(--wc-azure-600))" } }}>
              <LineChart data={data} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 40]} />
                <Line type="monotone" dataKey="temp" stroke="var(--color-temp)" strokeWidth={2} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comfort Index</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ comfort: { label: "Comfort", color: "hsl(var(--wc-teal-400))" } }}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Bar dataKey="comfort" fill="var(--color-comfort)" radius={[8,8,0,0]} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
