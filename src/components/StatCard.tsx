import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "destructive" | "warning" | "success" | "info";

const TONE: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  destructive: "text-destructive",
  warning: "text-warning",
  success: "text-success",
  info: "text-info",
};

interface StatCardProps {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  tone?: Tone;
  valueTone?: Tone;
  className?: string;
}

const StatCard = ({ icon: Icon, value, label, tone = "default", valueTone, className }: StatCardProps) => (
  <div className={cn("rounded-xl bg-popover border border-border/40 px-2 py-3 text-center min-w-0 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]", className)}>
    <Icon className={cn("h-4 w-4 mx-auto mb-1.5", TONE[tone === "default" ? "primary" : tone])} strokeWidth={2} />
    <p
      className={cn(
        "font-bold leading-none tabular-nums truncate",
        typeof value === "string" && value.length > 4 ? "text-[17px]" : "text-[22px]",
        TONE[valueTone ?? (tone === "default" ? "default" : tone)],
      )}
    >
      {value}
    </p>
    <p className="text-[11px] font-medium text-muted-foreground mt-1.5 leading-tight">{label}</p>
  </div>
);

export default StatCard;
