import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Contribute() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    toast("Thank you!", {
      description: "Your feedback helps improve prediction accuracy.",
    });
    console.log("Volunteer feedback", payload);
    (e.currentTarget as HTMLFormElement).reset();
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2">Contribute to Weather Prediction Accuracy</h1>
      <p className="mb-6 text-muted-foreground">
        Help us improve prediction accuracy by sharing real-time feedback.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Share your local conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="City, Country"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  step="0.1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="humidity">Humidity (%)</Label>
                <Input id="humidity" name="humidity" type="number" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition">Condition</Label>
                <Input
                  id="condition"
                  name="condition"
                  placeholder="Sunny / Rainy / Windy..."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Anything else we should know?"
                rows={4}
              />
            </div>
            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
