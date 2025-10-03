import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fadeInUp, slideUp, staggerContainer, staggerItem, springTransition } from "@/components/ui/motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Search, MapPin } from "lucide-react";
import { useMapboxPlaces } from "@/hooks/MapboxSearch";
import { MapPicker } from "@/components/MapPicker";


import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";


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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  
  const { suggestions, selectPlace, searchPlaces, clearSuggestions } = useMapboxPlaces();

  // Handle input changes with debounced search
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);
    if (value.trim()) {
      searchPlaces(value);
      setShowSuggestions(true);
    } else {
      clearSuggestions();
      setShowSuggestions(false);
    }
  };

  // Handle place selection
  const handlePlaceSelect = (feature: any) => {
    selectPlace(feature, (place) => {
      if (place.formatted) setLocation(place.formatted);
      if (place.lat && place.lng) setCoords({ lat: place.lat, lng: place.lng });
    });
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <motion.div 
          className="container relative z-10 mx-auto max-w-5xl px-4 py-20 text-center md:py-28"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.h1 
            className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl"
            variants={slideUp}
            transition={springTransition}
          >
            Will It Rain On My Parade?
          </motion.h1>
          <motion.p 
            className="mx-auto mt-3 max-w-2xl text-muted-foreground"
            variants={fadeInUp}
            transition={{ ...springTransition, delay: 0.2 }}
          >
            Planning a hike, vacation, or day on the lake? Check the likelihood of very hot, very cold, very windy, very wet, or very uncomfortable conditions for your chosen time and place.
          </motion.p>

          <motion.form 
            onSubmit={onSubmit} 
            className="mx-auto mt-8 max-w-3xl rounded-2xl border bg-card/80 p-4 shadow-soft-lg backdrop-blur-md"
            variants={fadeInUp}
            transition={{ ...springTransition, delay: 0.4 }}
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  aria-label="Location"
                  placeholder="Enter location"
                  className="h-12 pl-9 pr-12"
                  value={location}
                  onChange={handleLocationChange}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                
                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border bg-card shadow-lg"
                  >
                    {suggestions.map((feature) => (
                      <button
                        key={feature.place_name}
                        type="button"
                        onClick={() => handlePlaceSelect(feature)}
                        className="flex w-full items-start gap-2 border-b px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-accent"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="flex-1">{feature.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Pick on map" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full">
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Select location on map</DialogTitle>
                      <DialogDescription>
                        Click on the map to select your location or search for a place.
                      </DialogDescription>
                    </DialogHeader>
                    <MapPicker
  value={coords.lat && coords.lng ? { lat: coords.lat, lng: coords.lng } : null}
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
            <motion.div 
              className="mt-4 flex flex-wrap items-center justify-center gap-2"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {concernOptions.map((c, index) => {
                const active = selected.includes(c);
                return (
                  <motion.button
                    key={c}
                    type="button"
                    onClick={() => toggle(c)}
                    className={`h-10 rounded-xl px-4 text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    aria-pressed={active}
                    variants={staggerItem}
                    transition={{ 
                      ...springTransition,
                      delay: index * 0.1
                    }}
                    layout
                  >
                    {c}
                  </motion.button>
                );
              })}
            </motion.div>
            <motion.div 
              className="mt-4"
              variants={fadeInUp}
              transition={{ ...springTransition, delay: 0.8 }}
            >
              <Button type="submit" className="h-12 px-6">
                Check Weather Comfort
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </section>
    </div>
  );
}