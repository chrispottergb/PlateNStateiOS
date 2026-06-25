import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronUp, User, Briefcase, Coins, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/**
 * Floating account dock — bottom-right arrow button that opens a popover
 * containing the user's account links and live token (credit) counter.
 *
 * Lives at the app root (rendered globally in App.tsx).
 */
const AccountFab = () => {
  const [open, setOpen] = useState(false);
  const { user, portalMode, signOut } = useAuth();
  const { credits } = useCredits();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();

  // Don't render on /auth (sign-in page) or when not authenticated
  if (!user) return null;
  if (location.pathname === "/auth") return null;

  const isEnterprise = portalMode === "enterprise";

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            aria-label="Account menu"
            className="h-12 w-12 rounded-full shadow-lg glow hover:scale-105 transition-transform"
          >
            <ChevronUp
              className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          className="w-64 p-2 glass-strong rounded-2xl border border-border/50 shadow-2xl"
        >
          {/* Token counter */}
          <div className="flex items-center justify-between rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5 mb-2">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-warning">Tokens</span>
            </div>
            <span className="font-mono text-sm font-bold text-warning">
              {credits ?? "–"}
            </span>
          </div>

          {/* My Account */}
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            My Account
          </Link>

          {/* Enterprise */}
          <Link
            to="/business"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors"
          >
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Enterprise
            {isEnterprise && (
              <span className="ml-auto text-[10px] font-bold text-primary uppercase tracking-wider">
                Active
              </span>
            )}
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Admin
            </Link>
          )}

          <div className="my-1 border-t border-border/50" />

          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AccountFab;
