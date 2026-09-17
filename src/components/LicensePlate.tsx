import { cn } from "@/lib/utils";
import { getStateByCode } from "@/lib/usStates";

interface LicensePlateProps {
  plateNumber: string;
  state?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: {
    container: "w-[120px] h-[60px] rounded-md",
    header: "text-[6px] tracking-[0.2em]",
    number: "text-sm",
    footer: "text-[5px] tracking-[0.15em]",
  },
  md: {
    container: "w-[180px] h-[90px] rounded-lg",
    header: "text-[8px] tracking-[0.25em]",
    number: "text-xl",
    footer: "text-[6px] tracking-[0.18em]",
  },
  lg: {
    container: "w-[280px] h-[140px] rounded-xl",
    header: "text-[11px] tracking-[0.3em]",
    number: "text-3xl",
    footer: "text-[8px] tracking-[0.2em]",
  },
};

const LicensePlate = ({ plateNumber, state, size = "md", className }: LicensePlateProps) => {
  const s = sizeStyles[size];
  const st = getStateByCode(state);
  const style = st.plate;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-between overflow-hidden border-[3px] border-[#c9ced4] shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.5)_inset,0_-2px_0_rgba(0,0,0,0.12)_inset,0_4px_6px_-2px_rgba(0,0,0,0.5),0_18px_36px_-14px_rgba(0,0,0,0.85)]",
        s.container,
        className
      )}
      style={{ aspectRatio: "2 / 1", background: style.bg }}
    >
      {/* Top + bottom accent borders */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: style.text }} />
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: style.text }} />
      {/* Controlled highlight across the upper half */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 55%)" }} />

      <span
        className={cn("font-sans font-bold uppercase mt-[6%] z-10 select-none", s.header)}
        style={{ color: style.text }}
      >
        {st.name}
      </span>

      <span
        className={cn("font-mono font-bold z-10 select-none tracking-widest leading-none whitespace-nowrap", s.number)}
        style={{
          color: style.text,
          textShadow: "0 1px 0 rgba(255,255,255,0.25), 0 -1px 0 rgba(0,0,0,0.15)",
        }}
      >
        {plateNumber}
      </span>

      <span
        className={cn("font-sans font-bold uppercase mb-[6%] z-10 select-none text-center px-1 truncate max-w-full", s.footer)}
        style={{ color: style.accent }}
      >
        {style.slogan}
      </span>
    </div>
  );
};

export default LicensePlate;
