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
  onAreaChange,
}: {
  value?: Partial<Coords> | null;
  onChange: (v: Coords, formatted?: string) => void;
  className?: string;
  onAreaChange?: (bounds: [[number, number], [number, number]]) => void; // [[minLng,minLat],[maxLng,maxLat]]
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null); // 👈 marker for live location
  const watchIdRef = useRef<number | null>(null);
  const isSelectingRef = useRef(false);
  const dragStartRef = useRef<mapboxgl.LngLat | null>(null);

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

    // 📌 Custom style switcher dropdown (button + menu)
    const StyleMenuControl = class implements mapboxgl.IControl {
      _container!: HTMLElement;
      onAdd(): HTMLElement {
        const container = document.createElement("div");
        container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        container.style.zIndex = "10";
        container.style.position = "relative";

        const button = document.createElement("button");
        button.textContent = "Light";
        Object.assign(button.style, {
          padding: "10px 20px",
          background: "#2F4F4F",
          color: "#ffffff",
          border: "1px solid #243b3b",
          borderRadius: "2px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.14)",
          cursor: "pointer",
          fontSize: "12px",
        } as CSSStyleDeclaration);

        const menu = document.createElement("div"); 
        Object.assign(menu.style, {
          position: "absolute",
          top: "40px",
          left: "0",
          background: "#2F4F4F",
          border: "1px solid #243b3b",  
          borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
          padding: "6px",
          display: "none",
          minWidth: "160px",
        } as CSSStyleDeclaration);

        const styles: Record<string, string> = {
          "Light": "mapbox://styles/mapbox/light-v11",
          "Streets": "mapbox://styles/mapbox/streets-v12",
          "Satellite": "mapbox://styles/mapbox/satellite-streets-v12",
        };

        const buildItem = (label: string, styleUrl: string) => {
          const item = document.createElement("button");
          item.textContent = label;
          Object.assign(item.style, {
            width: "100%",
            textAlign: "left",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "12px",
            transition: "background 120ms ease, color 120ms ease",
          } as CSSStyleDeclaration);
          item.onmouseenter = () => {
            item.style.background = "#3b4a4a";
          };
          item.onmouseleave = () => {
            item.style.background = "transparent";
          };
          item.onclick = () => {
            try { map.setStyle(styleUrl as any); } catch {}
            button.textContent = label;
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

    // 📌 Area select (drag to draw rectangle)
    const AreaControl = class implements mapboxgl.IControl {
      _btn!: HTMLButtonElement;
      onAdd(): HTMLElement {
        const group = document.createElement("div");
        group.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = "Select area";
        btn.textContent = "Area";
        Object.assign(btn.style, {
          padding: "6px 10px",
          background: "#2F4F4F",
          color: "#fff",
          border: "1px solid #243b3b",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "12px",
        } as CSSStyleDeclaration);
        btn.onclick = () => {
          isSelectingRef.current = !isSelectingRef.current;
          btn.style.background = isSelectingRef.current ? "#1f3636" : "#2F4F4F";
        };
        group.appendChild(btn);
        this._btn = btn;
        return group;
      }
      onRemove(): void {}
    };
    map.addControl(new AreaControl(), "top-left");

    // selection source/layer
    const selectionSourceId = "selection-src";
    const selectionLayerId = "selection-layer";
    map.on("load", () => {
      if (!map.getSource(selectionSourceId)) {
        map.addSource(selectionSourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        } as any);
        map.addLayer({
          id: selectionLayerId,
          type: "fill",
          source: selectionSourceId,
          paint: { "fill-color": "#3b82f6", "fill-opacity": 0.15 },
        });
        map.addLayer({
          id: selectionLayerId+"-outline",
          type: "line",
          source: selectionSourceId,
          paint: { "line-color": "#3b82f6", "line-width": 2 },
        });
      }
    });

    const updateSelection = (minLng: number, minLat: number, maxLng: number, maxLat: number) => {
      const poly = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[
                [minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat],
              ]],
            },
            properties: {},
          },
        ],
      } as GeoJSON.FeatureCollection;
      const src = map.getSource(selectionSourceId) as mapboxgl.GeoJSONSource | undefined;
      src?.setData(poly as any);
    };

    const clearSelection = () => {
      const src = map.getSource(selectionSourceId) as mapboxgl.GeoJSONSource | undefined;
      src?.setData({ type: "FeatureCollection", features: [] } as any);
    };

    map.on("mousedown", (e) => {
      if (!isSelectingRef.current) return;
      dragStartRef.current = e.lngLat;
      map.getCanvas().style.cursor = "crosshair";
    });

    map.on("mousemove", (e) => {
      if (!isSelectingRef.current || !dragStartRef.current) return;
      const s = dragStartRef.current;
      const minLng = Math.min(s.lng, e.lngLat.lng);
      const maxLng = Math.max(s.lng, e.lngLat.lng);
      const minLat = Math.min(s.lat, e.lngLat.lat);
      const maxLat = Math.max(s.lat, e.lngLat.lat);
      updateSelection(minLng, minLat, maxLng, maxLat);
    });

    map.on("mouseup", (e) => {
      if (!isSelectingRef.current || !dragStartRef.current) return;
      const s = dragStartRef.current;
      const minLng = Math.min(s.lng, e.lngLat.lng);
      const maxLng = Math.max(s.lng, e.lngLat.lng);
      const minLat = Math.min(s.lat, e.lngLat.lat);
      const maxLat = Math.max(s.lat, e.lngLat.lat);
      dragStartRef.current = null;
      map.getCanvas().style.cursor = "";
      onAreaChange?.([[minLng, minLat], [maxLng, maxLat]]);
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
      try { clearSelection(); } catch {}
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
