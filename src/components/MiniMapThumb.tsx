interface MiniMapThumbProps {
  latitude: number;
  longitude: number;
  size?: number;
}

const MiniMapThumb = ({ latitude, longitude, size = 56 }: MiniMapThumbProps) => {
  const zoom = 13;
  const tileX = Math.floor(((longitude + 180) / 360) * Math.pow(2, zoom));
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan((latitude * Math.PI) / 180) + 1 / Math.cos((latitude * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  const tileUrl = `https://a.basemaps.cartocdn.com/light_all/${zoom}/${tileX}/${tileY}.png`;

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-border/30 shrink-0"
      style={{ width: size, height: size }}
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
