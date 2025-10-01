import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Search, MapPin } from "lucide-react";
import { useGooglePlaces } from "@/hooks/use-google-places";
import { MapPicker } from "@/components/MapPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const concernOptions = [
  "Very Hot",
  "Very Cold",
  "Very Windy",
  "Very Wet",
  "Very Uncomfortable",
] as const;

type ConcernOption = (typeof concernOptions)[number];

export default function Index() {
  if (typeof document !== "undefined") document.title = "Will It Rain On My Parade?";
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [datetime, setDatetime] = useState("");
  const [selected, setSelected] = useState<ConcernOption[]>(["Very Wet", "Very Uncomfortable"]);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { attachAutocomplete } = useGooglePlaces();

  useEffect(() => {
    attachAutocomplete(inputRef.current, (p) => {
      if (p.formatted) setLocation(p.formatted);
      if (p.lat && p.lng) setCoords({ lat: p.lat, lng: p.lng });
    });
  }, [attachAutocomplete]);

  const toggle = (c: ConcernOption) => {
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const mappedConcerns = () => {
    const set = new Set<string>();
    if (selected.includes("Very Hot")) set.add("heat");
    if (selected.includes("Very Cold")) set.add("heat");
    if (selected.includes("Very Windy")) set.add("wind");
    if (selected.includes("Very Wet")) set.add("rain");
    if (selected.includes("Very Uncomfortable")) set.add("humidity");
    return Array.from(set);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    const params = new URLSearchParams();
    params.set("location", location.trim());
    if (coords.lat && coords.lng) params.set("ll", `${coords.lat},${coords.lng}`);
    if (datetime) params.set("datetime", datetime);
    const m = mappedConcerns();
    if (m.length) params.set("concerns", m.join(","));
    navigate(`/results?${params.toString()}`);
  };

  return (
    <div className="relative overflow-hidden">
      <section className="relative">
        <AnimatedBackground />
        <div className="container relative z-10 mx-auto max-w-5xl px-4 py-20 text-center md:py-28">
          <h1 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">
            Will It Rain On My Parade?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Planning a hike, vacation, or day on the lake? Check the likelihood of very hot, very cold, very windy, very wet, or very uncomfortable conditions for your chosen time and place.
          </p>

          <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-3xl rounded-2xl border bg-card/80 p-4 shadow-soft-lg backdrop-blur-md">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  aria-label="Location"
                  placeholder="Enter location"
                  className="h-12 pl-9 pr-12"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Pick on map" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full">
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Select location on map</DialogTitle>
                    </DialogHeader>
                    <MapPicker
                      value={coords.lat && coords.lng ? { lat: coords.lat, lng: coords.lng } : undefined}
                      onChange={(pos, addr) => {
                        setCoords(pos);
                        if (addr) setLocation(addr);
                      }}
                      className="h-80"
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <Input
                type="datetime-local"
                aria-label="Date and time"
                className="h-12"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {concernOptions.map((c) => {
                const active = selected.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(c)}
                    className={`h-10 rounded-xl px-4 text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    aria-pressed={active}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <Button type="submit" className="h-12 px-6">
                Check Weather Comfort
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
