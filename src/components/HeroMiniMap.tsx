import { useEffect, useRef } from "react";
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
      dragging: true,
      scrollWheelZoom: false,
      touchZoom: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 300);

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
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
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
      supabase.removeChannel(channel);
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-2xl">
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: "280px" }}
      />
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </div>
    </div>
  );
};

export default HeroMiniMap;
