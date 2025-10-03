import { useState, useCallback } from "react";

export function useMapboxPlaces() {
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // 🔑 Hardcoded public token (pk.)
  const token = "pk.eyJ1IjoiYWJkZWxyaGFtYW4xMjMiLCJhIjoiY21nOTBmbW5rMGI1NTJqc2E2N2pkNjRyMCJ9.fovjQp9aLuOxb4V4ruCWsw";

  const searchPlaces = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${token}&autocomplete=true&limit=5`
        );

        if (!res.ok) {
          console.error("Mapbox API error:", res.status, res.statusText);
          return;
        }

        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err) {
        console.error("Mapbox search error:", err);
      }
    },
    [token]
  );

  const clearSuggestions = () => setSuggestions([]);

  const selectPlace = (feature: any, cb?: (place: any) => void) => {
    const place = {
      formatted: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
    };
    cb?.(place);
    clearSuggestions();
  };

  return { suggestions, searchPlaces, selectPlace, clearSuggestions };
}


