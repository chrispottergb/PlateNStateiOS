import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

const SectionHeader = ({ title, action, className }: SectionHeaderProps) => (
  <div className={cn("flex items-center justify-between gap-3 mb-3", className)}>
    <h2 className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0">{title}</h2>
    {action}
  </div>
);

export default SectionHeader;
