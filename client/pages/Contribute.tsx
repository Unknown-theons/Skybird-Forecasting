import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fadeInUp, slideUp, staggerContainer, staggerItem, hoverScale, springTransition } from "@/components/ui/motion";

export default function Contribute() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    toast("Thank you!", { description: "Your feedback helps improve prediction accuracy." });
    console.log("Volunteer feedback", payload);
    (e.currentTarget as HTMLFormElement).reset();
  };

  return (
    <motion.div 
      className="container mx-auto max-w-3xl px-4 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h1 
        className="mb-2"
        variants={slideUp}
        initial="initial"
        animate="animate"
        transition={springTransition}
      >
        Contribute to Weather Prediction Accuracy
      </motion.h1>
      <motion.p 
        className="mb-6 text-muted-foreground"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...springTransition, delay: 0.2 }}
      >
        Help us improve prediction accuracy by sharing real-time feedback.
      </motion.p>
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...springTransition, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Share your local conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.form 
              onSubmit={onSubmit} 
              className="grid gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div 
                className="grid gap-2"
                variants={staggerItem}
                transition={{ ...springTransition, delay: 0.6 }}
              >
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="City, Country" required />
              </motion.div>
              <motion.div 
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                variants={staggerItem}
                transition={{ ...springTransition, delay: 0.7 }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input id="temperature" name="temperature" type="number" step="0.1" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="humidity">Humidity (%)</Label>
                  <Input id="humidity" name="humidity" type="number" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Input id="condition" name="condition" placeholder="Sunny / Rainy / Windy..." />
                </div>
              </motion.div>
              <motion.div 
                className="grid gap-2"
                variants={staggerItem}
                transition={{ ...springTransition, delay: 0.8 }}
              >
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Anything else we should know?" rows={4} />
              </motion.div>
              <motion.div
                variants={staggerItem}
                transition={{ ...springTransition, delay: 0.9 }}
              >
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
