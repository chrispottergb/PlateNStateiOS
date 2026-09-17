import { cn } from "@/lib/utils";
import { getStateByCode } from "@/lib/usStates";

interface PlateChipProps {
  plateNumber: string;
  state?: string | null;
  className?: string;
}

/** Compact license-plate token for list rows (mini plate look, not a data chip). */
const PlateChip = ({ plateNumber, state, className }: PlateChipProps) => {
  const st = state ? getStateByCode(state) : null;
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-[68px] h-[42px] rounded-[6px] bg-[#F4F1E8] border border-[#C9CED4] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(0,0,0,0.5)] overflow-hidden",
        className,
      )}
    >
      <span className="text-[6px] font-bold uppercase tracking-[0.18em] text-[#1B2A4A] leading-none">
        {st?.name ?? " "}
      </span>
      <span className="mt-[3px] font-mono text-[15px] font-bold tracking-[0.06em] leading-none text-[#1B2A4A] whitespace-nowrap">
        {plateNumber}
      </span>
      <span className="mt-[2px] text-[4.5px] font-semibold uppercase tracking-[0.12em] text-[#B32A2A] leading-none truncate max-w-full">
        {st?.plate.slogan ?? " "}
      </span>
    </div>
  );
};

export default PlateChip;
