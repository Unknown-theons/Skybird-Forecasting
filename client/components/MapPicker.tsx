import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type Coords = { lat: number; lng: number };

function getMapboxToken(): string {
  return (
    (import.meta.env.VITE_MAPBOX_API_KEY as string | undefined) ||
    (import.meta.env.PUBLIC_MAPBOX_API_KEY as string | undefined) ||
    "pk.eyJ1IjoiYWJkZWxyaGFtYW4xMjMiLCJhIjoiY21nOTBmbW5rMGI1NTJqc2E2N2pkNjRyMCJ9.fovjQp9aLuOxb4V4ruCWsw"
  );
}

const token = getMapboxToken();
mapboxgl.accessToken = token;

export function MapPicker({
  value,
  onChange,
  className = "h-64 w-full",
}: {
  value?: Partial<Coords> | null;
  onChange: (v: Coords, formatted?: string) => void;
  className?: string;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null); // 👈 marker for live location
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const centerLng = value?.lng ?? -122.4194;
    const centerLat = value?.lat ?? 37.7749;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [centerLng, centerLat],
      zoom: 10,
    });
    mapRef.current = map;

    // Draggable marker (your selected location)
    markerRef.current = new mapboxgl.Marker({ draggable: true })
      .setLngLat([centerLng, centerLat])
      .addTo(map);

    markerRef.current.on("dragend", () => {
      const p = markerRef.current!.getLngLat();
      onChange({ lat: p.lat, lng: p.lng });
    });

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      markerRef.current!.setLngLat([lng, lat]);
      onChange({ lat, lng });
    });

    // 📌 Add Geolocate button (Mapbox built-in)
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.addControl(geolocateControl, "top-right");
    map.once("load", () => {
      // Auto trigger if permission was previously granted
      try { (geolocateControl as any).trigger?.(); } catch {}
    });

    // 📌 Live tracking using navigator.geolocation
    if (!("geolocation" in navigator)) {
      console.warn("Geolocation is not available in this browser.");
    } else if (location.protocol !== "https:" && location.hostname !== "localhost") {
      console.warn("Geolocation requires HTTPS (or localhost) to work.");
    } else {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
        const { latitude, longitude } = pos.coords;

        if (!userMarkerRef.current) {
          // create blue marker for user
          userMarkerRef.current = new mapboxgl.Marker({ color: "blue" })
            .setLngLat([longitude, latitude])
            .addTo(map);
        } else {
          userMarkerRef.current.setLngLat([longitude, latitude]);
        }

          // Keep map centered on live location
          try { map.panTo([longitude, latitude]); } catch {}
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      watchIdRef.current = watchId as unknown as number;
    }

    return () => {
      if (watchIdRef.current !== null) {
        try { navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
      }
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      userMarkerRef.current = null;
    };
  }, [onChange]);

  // Update selected marker when props change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (typeof value?.lat === "number" && typeof value?.lng === "number") {
      markerRef.current.setLngLat([value.lng, value.lat]);
      mapRef.current.panTo([value.lng, value.lat]);
    }
  }, [value?.lat, value?.lng]);

  return <div ref={mapContainer} className={className + " rounded-xl border bg-card"} />;
}
