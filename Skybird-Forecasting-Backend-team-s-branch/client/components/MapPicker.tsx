import { useEffect, useRef } from "react";
import { useGooglePlaces } from "@/hooks/use-google-places";

declare global {
  interface Window {
    google?: any;
  }
}

type Coords = { lat: number; lng: number };

export function MapPicker({
  value,
  onChange,
  className = "h-64",
}: {
  value?: Partial<Coords> | null;
  onChange: (v: Coords, formatted?: string) => void;
  className?: string;
}) {
  useGooglePlaces(); // ensures Google Places script loads
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  // init map when Google is ready
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    if (!mapInstance.current) {
      const center: Coords = {
        lat: typeof value?.lat === "number" ? value!.lat : 30.0444,
        lng: typeof value?.lng === "number" ? value!.lng : 31.2357,
      };
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 11,
        disableDefaultUI: true,
        clickableIcons: false,
      });
      geocoderRef.current = new window.google.maps.Geocoder();
      markerRef.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: center,
      });
      mapInstance.current.addListener("click", (e: any) => {
        const pos: Coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        markerRef.current.setPosition(pos);
        onChange(pos);
        // try reverse geocode
        try {
          geocoderRef.current.geocode(
            { location: pos },
            (results: any, status: any) => {
              if (status === "OK" && results?.[0])
                onChange(pos, results[0].formatted_address);
            },
          );
        } catch {}
      });
    }
  }, [value?.lat, value?.lng]);

  // sync external value
  useEffect(() => {
    if (!window.google?.maps || !mapInstance.current || !markerRef.current)
      return;
    if (typeof value?.lat === "number" && typeof value?.lng === "number") {
      const pos = { lat: value.lat, lng: value.lng } as Coords;
      markerRef.current.setPosition(pos);
      mapInstance.current.panTo(pos);
    }
  }, [value?.lat, value?.lng]);

  return (
    <div className={className + " rounded-xl border bg-card"} ref={mapRef} />
  );
}
