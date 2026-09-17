import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { getPosition } from "@/lib/native";

interface MapReport {
  id: string;
  plate_number: string;
  infraction: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

const severityColor = (infraction: string) => {
  if (infraction === "reckless_driving" || infraction === "road_rage" || infraction === "ran_red_light") return "#EF4444";
  if (infraction === "speeding" || infraction === "distracted_driving") return "#F5A623";
  return "#3B82F6";
};

const HeroMiniMap = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  // Once the map is centered on the user's own location, report loading must
  // not yank the view away to fit every marker in the country.
  const userCenteredRef = useRef(false);

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

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeTimer = setTimeout(() => map.invalidateSize(), 300);

    // Default the map to the user's location (coarse). Falls through to the
    // report-fitting behaviour below when permission is denied/unavailable.
    let disposed = false;
    getPosition().then((pos) => {
      if (disposed || !pos || !mapRef.current) return;
      userCenteredRef.current = true;
      mapRef.current.setView([pos.latitude, pos.longitude], 11, { animate: false });
    }).catch(() => { /* keep fallback */ });

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

      if (reports.length > 0 && !userCenteredRef.current) {
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
      disposed = true;
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
      {/* Editorial heading above the map surface */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[17px] font-bold tracking-tight">Live Activity Near You</p>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-[#0D1B26] cursor-pointer shadow-[0_0_0_1px_rgba(136,154,170,0.12)]" style={{ isolation: "isolate", zIndex: 0 }}>
        <div
          ref={containerRef}
          className="w-full pointer-events-none"
          style={{ height: "196px" }}
        />
        {/* Location / plate search — existing behaviour, presented as map discovery */}
        <div className="absolute top-2.5 left-2.5 z-[1000] w-[50%]">
          <input
            type="text"
            placeholder={searchError ? "Not found" : "Search city, state or plate…"}
            aria-label="Search map by location or plate"
            className={`w-full h-7 rounded-md bg-[#0D1B26]/75 backdrop-blur-sm border px-2.5 text-[11px] text-foreground placeholder:text-[#889AAA]/80 outline-none pointer-events-auto transition-colors ${searchError ? "border-destructive/50 placeholder:text-destructive" : "border-[#889AAA]/[0.12] focus:border-primary"}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") handleSearch((e.target as HTMLInputElement).value, e.target as HTMLInputElement);
            }}
          />
        </div>
        <div className="absolute bottom-2.5 right-2.5 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-[#0D1B26]/95 border border-[#889AAA]/[0.18] text-foreground pl-3.5 pr-3 h-9 text-[13px] font-semibold pointer-events-auto">
          Open Map <span aria-hidden>→</span>
        </div>
      </div>
    </a>
  );
};

export default HeroMiniMap;
