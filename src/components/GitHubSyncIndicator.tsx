import { useEffect, useState } from "react";
import { Github } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STORAGE_KEY = "gh_last_sync_ts";

const formatRelative = (ts: number) => {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const GitHubSyncIndicator = () => {
  const [connected] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<number>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed)) {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, String(now));
      return now;
    }
    return parsed;
  });
  const [, setTick] = useState(0);

  // Refresh "x ago" label every 30s
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Bump last-sync on app load (mock — Lovable auto-syncs to GitHub on every change)
  useEffect(() => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, String(now));
    setLastSync(now);
  }, []);

  const dotClass = connected
    ? "bg-success shadow-[0_0_8px_hsl(var(--success)/0.6)]"
    : "bg-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.6)]";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors cursor-default"
            aria-label={connected ? "GitHub connected" : "GitHub disconnected"}
          >
            <Github className="h-3 w-3" />
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
            <span className="hidden sm:inline font-mono">
              {formatRelative(lastSync)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="font-medium">
            GitHub: {connected ? "Connected" : "Disconnected"}
          </div>
          <div className="text-muted-foreground">
            Last sync: {new Date(lastSync).toLocaleString()}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GitHubSyncIndicator;
