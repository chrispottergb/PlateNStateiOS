import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationMiniMapProps {
  latitude: number;
  longitude: number;
  label?: string;
  height?: number;
}

export const LocationMiniMap = ({ latitude, longitude, label, height = 140 }: LocationMiniMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const el = containerRef.current;
    if (el.clientWidth === 0 || el.clientHeight === 0) {
      const t = setTimeout(() => el.dispatchEvent(new Event("resize")), 200);
      return () => clearTimeout(t);
    }

    const map = L.map(el, {
      center: [latitude, longitude],
      zoom: 12,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div class="relative -translate-x-1/2 -translate-y-1/2">
               <div class="absolute inset-0 rounded-full bg-primary/40 animate-ping" style="width:18px;height:18px;"></div>
               <div class="relative rounded-full bg-primary border-2 border-background shadow-lg" style="width:18px;height:18px;"></div>
             </div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    markerRef.current = L.marker([latitude, longitude], { icon, title: label }).addTo(map);
    mapRef.current = map;

    // Defer invalidateSize so the dialog finishes its open transition before Leaflet measures the container
    const t = setTimeout(() => map.invalidateSize(), 100);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([latitude, longitude], 12);
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <div
      className="mt-2 rounded-lg overflow-hidden border border-border/30 bg-muted/30 relative cursor-pointer group"
      style={{ height, isolation: "isolate", zIndex: 0 }}
      onClick={() => navigate(`/map?lat=${latitude}&lng=${longitude}`)}
      aria-label="Open full map"
      role="button"
    >
      <div ref={containerRef} className="absolute inset-0 pointer-events-none" />
      <div className="absolute bottom-2 right-2 z-[1000] rounded-full bg-primary/90 text-primary-foreground px-2.5 py-1 text-xs font-medium opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none">
        Open Map →
      </div>
    </div>
  );
};

export default LocationMiniMap;
