import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window { google?: any }
}

function loadScriptOnce(src: string) {
  const id = `script-${btoa(src)}`;
  if (document.getElementById(id)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

export function useGooglePlaces(apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!apiKey || loadedRef.current) return;
    const url = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    loadScriptOnce(url).then(() => {
      loadedRef.current = true;
    }).catch(() => {
      // silently fail; input will behave normally
    });
  }, [apiKey]);

  const attachAutocomplete = useCallback((input: HTMLInputElement | null, onPlace?: (place: { description?: string; formatted?: string; lat?: number; lng?: number }) => void) => {
    if (!input || !window.google?.maps?.places) return;
    try {
      const ac = new window.google.maps.places.Autocomplete(input, {
        fields: ["formatted_address", "geometry", "name"],
        types: ["geocode"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const formatted = place.formatted_address || place.name || input.value;
        const loc = place.geometry?.location;
        onPlace?.({
          description: place.name,
          formatted,
          lat: loc?.lat?.(),
          lng: loc?.lng?.(),
        });
      });
    } catch {
      // no-op
    }
  }, []);

  return { attachAutocomplete } as const;
}
