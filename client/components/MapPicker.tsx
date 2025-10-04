import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
  const initialLocationSet = useRef<boolean>(false);

  async function reverseGeocode(lng: number, lat: number): Promise<string | undefined> {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        `${lng},${lat}`
      )}.json?access_token=${token}&limit=1`;
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const data = await res.json();
      return data?.features?.[0]?.place_name as string | undefined;
    } catch {
      return undefined;
    }
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Default coordinates (San Francisco)
    const defaultLng = -122.4194;
    const defaultLat = 37.7749;
    
    const centerLng = value?.lng ?? defaultLng;
    const centerLat = value?.lat ?? defaultLat;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [centerLng, centerLat],
      zoom: 10,
    });
    mapRef.current = map;

    // Built-in controls: navigation (zoom/rotate), fullscreen, scale
    try {
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true, showZoom: true, showCompass: true }), "top-right");
    } catch {}
    try {
      map.addControl(new mapboxgl.FullscreenControl(), "top-right");
    } catch {}
    try {
      map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");
    } catch {}

    // Draggable marker (your selected location)
    markerRef.current = new mapboxgl.Marker({ draggable: true })
      .setLngLat([centerLng, centerLat])
      .addTo(map);

    markerRef.current.on("dragend", async () => {
      const p = markerRef.current!.getLngLat();
      const formatted = await reverseGeocode(p.lng, p.lat);
      onChange({ lat: p.lat, lng: p.lng }, formatted);
    });

    map.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      markerRef.current!.setLngLat([lng, lat]);
      const formatted = await reverseGeocode(lng, lat);
      onChange({ lat, lng }, formatted);
    });

    // Get current location and set as default if no value provided
    if (!value?.lat || !value?.lng) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Only set as default if no initial location has been set yet
            if (!initialLocationSet.current) {
              initialLocationSet.current = true;
              
              // Update marker position
              markerRef.current!.setLngLat([longitude, latitude]);
              
              // Center map on current location
              map.setCenter([longitude, latitude]);
              map.setZoom(12); // Zoom in a bit more for current location
              
              // Get formatted address and call onChange
              const formatted = await reverseGeocode(longitude, latitude);
              onChange({ lat: latitude, lng: longitude }, formatted);
            }
          },
          (error) => {
            console.warn("Could not get current location:", error.message);
            // If geolocation fails, keep using the default coordinates
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      }
    }

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

    // 📌 Custom style switcher dropdown (enhanced design)
    const StyleMenuControl = class implements mapboxgl.IControl {
      _container!: HTMLElement;
      onAdd(): HTMLElement {
        const container = document.createElement("div");
        container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        container.style.zIndex = "10";
        container.style.position = "relative";

        const button = document.createElement("button");
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
          <span>Style</span>
        `;
        Object.assign(button.style, {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "10px 12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "600",
          letterSpacing: "0.2px",
          lineHeight: "1.2",
          whiteSpace: "nowrap",
          minWidth: "90px",
          transition: "all 0.2s ease",
        } as CSSStyleDeclaration);
        
        button.onmouseenter = () => { 
          button.style.transform = "translateY(-2px)";
          button.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
        };
        button.onmouseleave = () => { 
          button.style.transform = "translateY(0)";
          button.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
        };

        const menu = document.createElement("div"); 
        Object.assign(menu.style, {
          position: "absolute",
          top: "50px",
          left: "0",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",  
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          padding: "8px",
          display: "none",
          minWidth: "180px",
          zIndex: "1000",
        } as CSSStyleDeclaration);

        const styles: Record<string, string> = {
          "🗺️ Light": "mapbox://styles/mapbox/light-v11",
          "🏙️ Streets": "mapbox://styles/mapbox/streets-v12",
          "🛰️ Satellite": "mapbox://styles/mapbox/satellite-streets-v12",
        };

        const buildItem = (label: string, styleUrl: string) => {
          const item = document.createElement("button");
          item.textContent = label;
          Object.assign(item.style, {
            width: "100%",
            textAlign: "left",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "none",
            background: "transparent",
            color: "#374151",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          } as CSSStyleDeclaration);
          item.onmouseenter = () => {
            item.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
            item.style.color = "#ffffff";
            item.style.transform = "translateX(4px)";
          };
          item.onmouseleave = () => {
            item.style.background = "transparent";
            item.style.color = "#374151";
            item.style.transform = "translateX(0)";
          };
          item.onclick = () => {
            try { map.setStyle(styleUrl as any); } catch {}
            button.title = `Style: ${label}`;
            menu.style.display = "none";
          };
          return item;
        };

        for (const [label, styleUrl] of Object.entries(styles)) {
          menu.appendChild(buildItem(label, styleUrl));
        }

        button.onclick = (e) => {
          e.stopPropagation();
          menu.style.display = menu.style.display === "none" ? "block" : "none";
        };

        // close on outside click
        const onDocClick = () => { menu.style.display = "none"; };
        setTimeout(() => document.addEventListener("click", onDocClick), 0);

        container.appendChild(button);
        container.appendChild(menu);
        this._container = container;
        return container;
      }
      onRemove(): void {
        this._container?.remove();
      }
    };
    map.addControl(new StyleMenuControl(), "top-left");




    // 📌 Top-right focus icon (fits selection or centers marker)
    
    

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

  return (
    <motion.div 
      ref={mapContainer} 
      className={className + " rounded-xl border bg-card"}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier for smoother motion
        type: "spring",
        stiffness: 100,
        damping: 20
      }}
      layout
    />
  );
}
