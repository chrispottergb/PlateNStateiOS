import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

interface MapReport {
  id: string;
  plate_number: string;
  infraction: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

const severityColor = (infraction: string) => {
  if (infraction === "reckless_driving" || infraction === "road_rage" || infraction === "ran_red_light") return "#ef4444";
  if (infraction === "speeding" || infraction === "distracted_driving") return "#f59e0b";
  return "#3b82f6";
};

const HeroMiniMap = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.8, -98.5],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeTimer = setTimeout(() => map.invalidateSize(), 300);

    const loadReports = async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("reports")
        .select("id, plate_number, infraction, latitude, longitude, created_at")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data || !markersRef.current) return;

      markersRef.current.clearLayers();
      const reports = data as MapReport[];
      reports.forEach((r) => {
        if (!r.latitude || !r.longitude) return;
        const color = severityColor(r.infraction);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 6px ${color}80;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([r.latitude, r.longitude], { icon }).addTo(markersRef.current!);
      });

      if (reports.length > 0) {
        const bounds = L.latLngBounds(
          reports.filter(r => r.latitude && r.longitude).map(r => [r.latitude!, r.longitude!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10, animate: false });
      }
    };

    loadReports();

    const channel = supabase
      .channel("hero-map-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, (payload) => {
        const r = payload.new as MapReport;
        if (r.latitude && r.longitude && markersRef.current) {
          const color = severityColor(r.infraction);
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 12px ${color};animation:pulse 1.5s ease-in-out 3;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          L.marker([r.latitude, r.longitude], { icon }).addTo(markersRef.current);
        }
      })
      .subscribe();

    return () => {
      clearTimeout(resizeTimer);
      supabase.removeChannel(channel);
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  const [searchError, setSearchError] = useState(false);

  const handleSearch = async (query: string, inputEl: HTMLInputElement) => {
    if (!query.trim()) return;
    setSearchError(false);
    const cleaned = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    // If it looks like a plate number (3-10 alphanumeric, no spaces/commas), navigate to plate detail
    if (cleaned.length >= 3 && cleaned.length <= 10 && !query.includes(",")) {
      window.location.href = `/plate/${encodeURIComponent(cleaned)}`;
      return;
    }
    if (!mapRef.current) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data?.[0]) {
        mapRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12);
        inputEl.blur();
      } else {
        setSearchError(true);
        setTimeout(() => setSearchError(false), 2000);
      }
    } catch {
      setSearchError(true);
      setTimeout(() => setSearchError(false), 2000);
    }
  };

  return (
    <a href="/map" className="block">
      <div className="relative rounded-2xl overflow-hidden border border-border/30 cursor-pointer hover:border-primary/30 transition-colors" style={{ isolation: "isolate", zIndex: 0 }}>
        <div
          ref={containerRef}
          className="w-full pointer-events-none"
          style={{ height: "240px" }}
        />
        <div className="absolute top-3 left-3 right-20 z-[1000]">
          <input
            type="text"
            placeholder={searchError ? "Not found" : "Search plate or city, state..."}
            className={`w-full rounded-full bg-background/90 backdrop-blur-sm border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none pointer-events-auto ${searchError ? "border-destructive/50 placeholder:text-destructive" : "border-border/40 focus:border-primary/50"}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") handleSearch((e.target as HTMLInputElement).value, e.target as HTMLInputElement);
            }}
          />
        </div>
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
        <div className="absolute bottom-3 right-3 z-[1000] rounded-full bg-primary/90 text-primary-foreground px-3 py-1 text-xs font-medium pointer-events-auto">
          Open Map →
        </div>
      </div>
    </a>
  );
};

export default HeroMiniMap;
