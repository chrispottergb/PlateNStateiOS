import { useState, useEffect } from "react";

interface MiniMapThumbProps {
  latitude?: number | null;
  longitude?: number | null;
  location?: string;
  size?: number | "fill";
}

const geoCache = new Map<string, { lat: number; lng: number } | null>();

function latLngToTile(lat: number, lng: number, zoom: number) {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  return { x, y };
}

const MiniMapThumb = ({ latitude, longitude, location, size = 56 }: MiniMapThumbProps) => {
  const isFill = size === "fill";
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );

  useEffect(() => {
    if (latitude && longitude) {
      setCoords({ lat: latitude, lng: longitude });
      return;
    }
    if (!location) return;

    const cached = geoCache.get(location);
    if (cached !== undefined) {
      setCoords(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        if (!cancelled && data?.[0]) {
          const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          geoCache.set(location, result);
          setCoords(result);
        } else {
          geoCache.set(location, null);
        }
      } catch {
        geoCache.set(location, null);
      }
    })();
    return () => { cancelled = true; };
  }, [latitude, longitude, location]);

  if (!coords) return null;

  const zoom = 13;
  const tile = latLngToTile(coords.lat, coords.lng, zoom);
  const tileUrl = `https://a.basemaps.cartocdn.com/light_all/${zoom}/${tile.x}/${tile.y}.png`;

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-border/30 shrink-0"
      style={isFill ? { width: "100%", height: "100%", minHeight: 60 } : { width: size as number, height: size as number }}
    >
      <img
        src={tileUrl}
        alt="Location"
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div
        className="absolute rounded-full bg-emerald-500 border-2 border-white shadow-sm"
        style={{
          width: 10,
          height: 10,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
};

export default MiniMapThumb;
