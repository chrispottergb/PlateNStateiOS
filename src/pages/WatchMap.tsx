import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Clock, RefreshCw, Search, MapPin, Plus } from "lucide-react";
import ReportModal from "@/components/ReportModal";

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

const severityColor = (infraction: string) => {
  if (infraction === "reckless_driving" || infraction === "road_rage" || infraction === "ran_red_light") return "#ef4444";
  if (infraction === "speeding" || infraction === "distracted_driving") return "#f59e0b";
  return "#3b82f6";
};

const timeAgo = (date: string) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const WatchMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<"24h" | "7d" | "all">("24h");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const geocodeCache = useRef<Map<string, [number, number] | null>>(new Map());

  const geocodeLocation = async (location: string): Promise<[number, number] | null> => {
    if (!location) return null;
    const key = location.trim().toLowerCase();
    if (geocodeCache.current.has(key)) return geocodeCache.current.get(key)!;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data && data[0]) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        geocodeCache.current.set(key, coords);
        return coords;
      }
    } catch {}
    geocodeCache.current.set(key, null);
    return null;
  };

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select("id, plate_number, infraction, location, latitude, longitude, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "24h") {
      query = query.gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    } else if (filter === "7d") {
      query = query.gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    }

    const { data } = await query;
    const rows = (data as Report[]) || [];
    setReports(rows);
    setLoading(false);

    // Geocode any rows missing coordinates (throttled, sequential)
    const missing = rows.filter((r) => !r.latitude || !r.longitude);
    for (const r of missing) {
      const coords = await geocodeLocation(r.location);
      if (coords) {
        setReports((prev) =>
          prev.map((p) => (p.id === r.id ? { ...p, latitude: coords[0], longitude: coords[1] } : p))
        );
      }
      await new Promise((res) => setTimeout(res, 1100)); // Nominatim 1 req/sec
    }
  };

  useEffect(() => { fetchReports(); }, [filter]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = L.map(mapContainerRef.current).setView([44.5, -89.5], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);
    markersRef.current = L.layerGroup().addTo(mapRef.current);
    // WKWebView may report wrong container size on first paint; force recalc
    setTimeout(() => mapRef.current?.invalidateSize(), 300);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return;
    markersRef.current.clearLayers();
    const geoReports = reports.filter((r) => r.latitude && r.longitude);
    geoReports.forEach((r) => {
      const color = severityColor(r.infraction);
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:14px;font-weight:bold;">!</span>
        </div>`,
        iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
      });
      const marker = L.marker([r.latitude!, r.longitude!], { icon });
      marker.bindPopup(`
        <div style="min-width:180px;font-size:12px;font-family:system-ui;">
          <a href="/plate/${encodeURIComponent(r.plate_number)}" style="font-family:monospace;font-weight:bold;font-size:14px;color:#3b82f6;">${r.plate_number}</a>
          <p style="text-transform:capitalize;margin:4px 0 2px;font-weight:600;">${r.infraction.replace(/_/g, " ")}</p>
          <p style="color:#888;margin:2px 0;">${r.location}</p>
          <p style="color:#888;margin:2px 0;">${timeAgo(r.created_at)}</p>
          <a href="/plate/${encodeURIComponent(r.plate_number)}" style="color:#3b82f6;font-size:11px;font-weight:600;">View Full Details →</a>
        </div>
      `);
      markersRef.current!.addLayer(marker);
    });
    if (geoReports.length > 0) {
      const bounds = L.latLngBounds(geoReports.map((r) => [r.latitude!, r.longitude!] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [reports]);

  useEffect(() => {
    const channel = supabase
      .channel("watch-map-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, (payload) => {
        const newReport = payload.new as Report;
        if (newReport.latitude && newReport.longitude) setReports((prev) => [newReport, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/plate/${encodeURIComponent(searchQuery.trim().toUpperCase())}`;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Top Bar */}
      <div className="container py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Neighborhood Watch
            </h1>
            <p className="text-xs text-muted-foreground">Real-time incident reports across all 50 US states</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports} className="rounded-full">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
            placeholder="Search plates across all 50 states..."
            className="pl-9 rounded-full font-mono"
            maxLength={8}
          />
        </form>

        {/* Filter Chips */}
        <div className="flex gap-2">
          {(["24h", "7d", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "24h" && <><Clock className="h-3 w-3 inline mr-1" />Last 24h</>}
              {f === "7d" && "Last 7 Days"}
              {f === "all" && "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Map — use calc to fill viewport; flex-1 alone doesn't establish height in WKWebView */}
      <div className="relative" style={{ height: "calc(100vh - 160px)", minHeight: "400px" }}>
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {/* Report count overlay */}
        <div className="absolute top-3 left-3 z-[1000]">
          <Badge variant="secondary" className="shadow-md text-xs px-2.5 py-1 rounded-full">
            {reports.length} {reports.length === 1 ? "report" : "reports"}
            {filter === "24h" && " in 24h"}
            {filter === "7d" && " in 7d"}
          </Badge>
        </div>

        {/* Live badge */}
        <div className="absolute top-3 right-3 z-[1000]">
          <Badge className="bg-emerald-500/90 text-white shadow-md text-xs px-2.5 py-1 rounded-full gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live Across 50 States
          </Badge>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
          <Badge variant="secondary" className="shadow-md text-xs px-2 py-1 gap-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-destructive" /> Reckless
          </Badge>
          <Badge variant="secondary" className="shadow-md text-xs px-2 py-1 gap-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Speeding
          </Badge>
          <Badge variant="secondary" className="shadow-md text-xs px-2 py-1 gap-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-primary" /> Other
          </Badge>
        </div>

        {/* FAB Report Button */}
        <div className="absolute bottom-3 right-3 z-[1000]">
          <ReportModal
            trigger={
              <Button size="icon" className="h-12 w-12 rounded-full glow shadow-lg">
                <Plus className="h-6 w-6" />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default WatchMap;
