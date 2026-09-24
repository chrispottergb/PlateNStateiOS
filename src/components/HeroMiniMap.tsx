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
  if (infraction === "reckless_driving" || infraction === "road_rage" || infraction === "ran_red_light") return "#EF4444";
  if (infraction === "speeding" || infraction === "distracted_driving") return "#F5A623";
  return "#3B82F6";
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

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeTimer = setTimeout(() => map.invalidateSize(), 300);

    let disposed = false;

    const loadReports = async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, plate_number, infraction, latitude, longitude, created_at")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!data || !markersRef.current) return;

      markersRef.current.clearLayers();
      const reports = data as MapReport[];
      reports.forEach((r) => {
        if (!r.latitude || !r.longitude) return;
        const color = severityColor(r.infraction);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.45);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([r.latitude, r.longitude], { icon }).addTo(markersRef.current!);
      });

      // Frame where the reports actually cluster: drop far-flung outliers
      // (more than 1.2° from the median) so a single stray report can't zoom
      // the preview out to the whole country.
      const pts = reports.filter(r => r.latitude && r.longitude).map(r => [r.latitude!, r.longitude!] as [number, number]);
      if (pts.length > 0 && !disposed) {
        const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
        const mLat = median(pts.map(p => p[0])), mLng = median(pts.map(p => p[1]));
        const core = pts.filter(([la, ln]) => Math.abs(la - mLat) <= 1.2 && Math.abs(ln - mLng) <= 1.2);
        map.fitBounds(L.latLngBounds(core.length ? core : pts), { padding: [16, 16], maxZoom: 11, animate: false });
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
