import { cn } from "@/lib/utils";

interface WisconsinPlateProps {
  plateNumber: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: {
    container: "w-[120px] h-[60px] rounded-md",
    header: "text-[6px] tracking-[0.2em]",
    number: "text-sm",
    footer: "text-[5px] tracking-[0.15em]",
    barn: "h-[20px] opacity-[0.06]",
  },
  md: {
    container: "w-[180px] h-[90px] rounded-lg",
    header: "text-[8px] tracking-[0.25em]",
    number: "text-xl",
    footer: "text-[6px] tracking-[0.18em]",
    barn: "h-[30px] opacity-[0.07]",
  },
  lg: {
    container: "w-[280px] h-[140px] rounded-xl",
    header: "text-[11px] tracking-[0.3em]",
    number: "text-3xl",
    footer: "text-[8px] tracking-[0.2em]",
    barn: "h-[50px] opacity-[0.08]",
  },
};

const BarnSilhouette = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 80" className={className} fill="#1a2744">
    {/* Barn */}
    <polygon points="60,80 60,35 80,18 100,35 100,80" />
    {/* Silo */}
    <rect x="100" y="30" width="15" height="50" />
    <ellipse cx="107.5" cy="30" rx="7.5" ry="5" />
    {/* Ground */}
    <rect x="0" y="75" width="200" height="5" rx="2" />
    {/* Fence */}
    <rect x="120" y="60" width="2" height="20" />
    <rect x="135" y="60" width="2" height="20" />
    <rect x="150" y="60" width="2" height="20" />
    <rect x="118" y="65" width="36" height="1.5" />
    <rect x="118" y="72" width="36" height="1.5" />
    {/* Tree */}
    <ellipse cx="40" cy="50" rx="14" ry="18" />
    <rect x="38" y="65" width="4" height="15" />
    {/* Small tree */}
    <ellipse cx="170" cy="55" rx="10" ry="14" />
    <rect x="168" y="67" width="4" height="13" />
  </svg>
);

const WisconsinPlate = ({ plateNumber, size = "md", className }: WisconsinPlateProps) => {
  const s = sizeStyles[size];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-between overflow-hidden border-2 border-[#2a3a5c]/40 shadow-md",
        "bg-gradient-to-b from-[#f5f3eb] via-white to-[#f0ede4]",
        s.container,
        className
      )}
      style={{ aspectRatio: "2 / 1" }}
    >
      {/* Barn watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <BarnSilhouette className={cn("w-auto", s.barn)} />
      </div>

      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#1a2744]" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a2744]" />

      {/* WISCONSIN header */}
      <span
        className={cn(
          "font-bold uppercase text-[#1a2744] mt-[6%] z-10 select-none",
          s.header
        )}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        WISCONSIN
      </span>

      {/* Plate number */}
      <span
        className={cn(
          "font-mono font-black text-[#1a2744] z-10 select-none tracking-widest leading-none",
          s.number
        )}
        style={{
          textShadow: "1px 1px 0px rgba(0,0,0,0.08)",
        }}
      >
        {plateNumber}
      </span>

      {/* AMERICA'S DAIRYLAND footer */}
      <span
        className={cn(
          "font-bold uppercase text-[#c41e3a] mb-[6%] z-10 select-none",
          s.footer
        )}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        AMERICA'S DAIRYLAND
      </span>
    </div>
  );
};

export default WisconsinPlate;
