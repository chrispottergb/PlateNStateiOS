import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import ReportModal from "@/components/ReportModal";

// Fix default marker icons for Leaflet + bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const severityIcon = (infraction: string) => {
  const color =
    infraction === "reckless_driving" || infraction === "road_rage"
      ? "#ef4444"
      : infraction === "speeding" || infraction === "distracted_driving"
      ? "#f59e0b"
      : "#3b82f6";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <span style="color:white;font-size:14px;font-weight:bold;">!</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// Auto-fit to markers
const FitBounds = ({ reports }: { reports: Report[] }) => {
  const map = useMap();
  useEffect(() => {
    const geoReports = reports.filter((r) => r.latitude && r.longitude);
    if (geoReports.length > 0) {
      const bounds = L.latLngBounds(
        geoReports.map((r) => [r.latitude!, r.longitude!])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [reports, map]);
  return null;
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
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<"24h" | "all">("24h");
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select("id, plate_number, infraction, location, latitude, longitude, created_at")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "24h") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", since);
    }

    const { data } = await query;
    setReports((data as Report[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  // Realtime subscription
  useEffect(() => {
    channelRef.current = supabase
      .channel("watch-map-reports")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          const newReport = payload.new as Report;
          if (newReport.latitude && newReport.longitude) {
            setReports((prev) => [newReport, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // Wisconsin center
  const center: [number, number] = [44.5, -89.5];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="container py-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Neighborhood Watch Map
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time incident reports across Wisconsin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setFilter("24h")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "24h" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Clock className="h-3 w-3 inline mr-1" />
              Last 24h
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "all" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              All Time
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <ReportModal
            trigger={
              <Button size="sm" className="gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Report
              </Button>
            }
          />
        </div>
      </div>

      <div className="flex-1 relative" style={{ minHeight: "500px" }}>
        <MapContainer
          center={center}
          zoom={7}
          className="absolute inset-0 z-0"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds reports={reports} />
          {reports.map((r) => (
            <Marker
              key={r.id}
              position={[r.latitude!, r.longitude!]}
              icon={severityIcon(r.infraction)}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[160px]">
                  <Link
                    to={`/plate/${encodeURIComponent(r.plate_number)}`}
                    className="font-mono font-bold text-sm text-primary hover:underline"
                  >
                    {r.plate_number}
                  </Link>
                  <p className="capitalize">{r.infraction.replace(/_/g, " ")}</p>
                  <p className="text-muted-foreground">{r.location}</p>
                  <p className="text-muted-foreground">{timeAgo(r.created_at)}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Report count overlay */}
        <div className="absolute top-3 left-3 z-[1000]">
          <Badge variant="secondary" className="shadow-md text-xs px-2.5 py-1">
            {reports.length} {reports.length === 1 ? "report" : "reports"}
            {filter === "24h" && " in 24h"}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default WatchMap;
