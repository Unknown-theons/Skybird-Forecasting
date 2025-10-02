import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Search, MapPin } from "lucide-react";
import { useGooglePlaces } from "@/hooks/use-google-places";
import { MapPicker } from "@/components/MapPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, loading } = useAuth();
  const [location, setLocation] = useState("");
  const [datetime, setDatetime] = useState("");
  const [selected, setSelected] = useState<ConcernOption[]>(["Very Wet", "Very Uncomfortable"]);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { attachAutocomplete } = useGooglePlaces();

  useEffect(() => {
    // Only attach autocomplete if we're not redirecting
    const urlParams = new URLSearchParams(window.location.search);
    const isNewSearch = urlParams.get('new') === 'true';
    
    if (inputRef.current && (isNewSearch || !user || !user.preferences?.preferred_city)) {
      attachAutocomplete(inputRef.current, (p) => {
        if (p.formatted) setLocation(p.formatted);
        if (p.lat && p.lng) setCoords({ lat: p.lat, lng: p.lng });
      });
    }
  }, [attachAutocomplete, user]);

  // Redirect logged-in users to results page with their preferred city
  // But only if they haven't explicitly come to search for a new location
  useEffect(() => {
    console.log('=== REDIRECT CHECK DEBUG ===');
    console.log('Loading:', loading);
    console.log('User:', user);
    console.log('User preferences:', user?.preferences);
    console.log('Preferred city:', user?.preferences?.preferred_city);
    
    const urlParams = new URLSearchParams(window.location.search);
    const isNewSearch = urlParams.get('new') === 'true';
    console.log('Is new search:', isNewSearch);
    console.log('Is user typing:', isUserTyping);
    console.log('Has redirected:', hasRedirected);
    
    if (!loading && user && user.preferences?.preferred_city && !isNewSearch && !isUserTyping && !hasRedirected) {
      // Add a small delay to prevent interference with user input
      const redirectTimer = setTimeout(() => {
        // Double-check that user is still not typing and hasn't already redirected
        if (!isUserTyping && user?.preferences?.preferred_city && !hasRedirected) {
          console.log('=== REDIRECT DEBUG ===');
          console.log('User preferences:', user.preferences);
          console.log('Preferred city:', user.preferences.preferred_city);
          console.log('Redirecting user with preferred city:', user.preferences.preferred_city);
          setHasRedirected(true); // Prevent multiple redirects
          const params = new URLSearchParams();
          params.set("location", user.preferences.preferred_city);
          params.set("concerns", "rain,humidity"); // Default concerns
          const url = `/results?${params.toString()}`;
          console.log('Constructed URL:', url);
          console.log('URL params:', params.toString());
          console.log('About to navigate to:', url);
          
          // Try both navigate and window.location to ensure redirect works
          try {
            navigate(url);
            console.log('Navigate called successfully');
          } catch (error) {
            console.error('Navigate failed, trying window.location:', error);
            window.location.href = url;
          }
          console.log('=== END REDIRECT DEBUG ===');
        }
      }, 1000); // 1 second delay
      
      return () => clearTimeout(redirectTimer);
    }
    return undefined;
  }, [user, loading, navigate, isUserTyping, hasRedirected]);

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

  // Show loading state while checking auth and potentially redirecting
  if (loading) {
    return (
      <div className="relative overflow-hidden">
        <section className="relative">
          <AnimatedBackground />
          <div className="container relative z-10 mx-auto max-w-5xl px-4 py-20 text-center md:py-28">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </section>
      </div>
    );
  }


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
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setIsUserTyping(true);
                  }}
                  onFocus={() => setIsUserTyping(true)}
                  onBlur={() => {
                    // Reset typing state after a delay
                    setTimeout(() => setIsUserTyping(false), 2000);
                  }}
                  onKeyDown={() => setIsUserTyping(true)}
                  onKeyUp={() => {
                    // Reset typing state after a delay when user stops typing
                    setTimeout(() => setIsUserTyping(false), 1000);
                  }}
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
