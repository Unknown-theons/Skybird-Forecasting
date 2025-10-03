import { useCallback, useEffect, useRef, useState } from "react";

interface MapboxFeature {
  place_name: string;
  text: string;
  center: [number, number];
  geometry: {
    coordinates: [number, number];
  };
}

interface PlaceResult {
  description?: string;
  formatted?: string;
  lat?: number;
  lng?: number;
}

export function useMapboxPlaces(
  apiKey = import.meta.env.VITE_MAPBOX_API_KEY as string | undefined
) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchPlaces = useCallback(
    async (query: string): Promise<MapboxFeature[]> => {
      if (!apiKey || !query.trim()) {
        setSuggestions([]);
        return [];
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json`;
        const params = new URLSearchParams({
          access_token: apiKey,
          types: "address,place,locality,neighborhood",
          limit: "5",
          autocomplete: "true",
        });

        const response = await fetch(`${endpoint}?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Mapbox API request failed");
        }

        const data = await response.json();
        const features = data.features || [];
        setSuggestions(features);
        return features;
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Mapbox geocoding error:", error);
        }
        setSuggestions([]);
        return [];
      }
    },
    [apiKey]
  );

  const searchWithDebounce = useCallback(
    (query: string, delay = 300) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        searchPlaces(query);
      }, delay);
    },
    [searchPlaces]
  );

  const attachAutocomplete = useCallback(
    (
      input: HTMLInputElement | null,
      onPlace?: (place: PlaceResult) => void
    ) => {
      if (!input || !apiKey) return;
      void onPlace;

      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        searchWithDebounce(target.value);
      };

      input.addEventListener("input", handleInput);

      // Cleanup function
      return () => {
        input.removeEventListener("input", handleInput);
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    },
    [apiKey, searchWithDebounce]
  );

  const selectPlace = useCallback(
    (feature: MapboxFeature, onPlace?: (place: PlaceResult) => void) => {
      const [lng, lat] = feature.center;
      const place: PlaceResult = {
        description: feature.text,
        formatted: feature.place_name,
        lat,
        lng,
      };
      onPlace?.(place);
      setSuggestions([]);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    attachAutocomplete,
    suggestions,
    searchPlaces,
    selectPlace,
    clearSuggestions: () => setSuggestions([]),
  } as const;
}