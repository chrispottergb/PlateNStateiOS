import { Link, useLocation } from "react-router-dom";
import { Trophy, User, Car, LogOut, Coins, Truck, MapPin, ShieldCheck, Shield } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";

const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { credits } = useCredits();
  const { isAdmin } = useIsAdmin();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all ${
      isActive(path)
        ? "bg-primary/15 text-primary shadow-[inset_0_0_12px_-4px_hsl(var(--glow-primary)/0.3)]"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
    }`;

  return (
    <header className="sticky top-0 z-50 glass-strong w-full">
      <div className="container flex h-16 items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative">
            <img src={logoIcon} alt="Plate N' State" className="h-8 w-8 transition-transform group-hover:scale-110 relative z-10" />
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline">Plate N' State</span>
        </Link>
        <nav className="flex items-center gap-0.5 shrink-0">
          <Link to="/a-hole-patrol" className={navLinkClass("/a-hole-patrol")}>
            <span className="text-xs">🚨</span>
            <span className="hidden sm:inline">A-Hole Patrol</span>
          </Link>
          <Link to="/leaderboard" className={navLinkClass("/leaderboard")}>
            <Trophy className="h-4 w-4" />
            <span className="hidden md:inline">Board</span>
          </Link>
          <Link to="/map" className={navLinkClass("/map")}>
            <MapPin className="h-4 w-4" />
            <span className="hidden md:inline">Map</span>
          </Link>
          {user ? (
            <>
              <div className="flex items-center gap-1 rounded-full bg-warning/10 border border-warning/20 px-3 py-1.5 text-xs font-medium mx-1">
                <Coins className="h-3.5 w-3.5 text-warning" />
                <span className="font-mono text-[11px] text-warning">{credits ?? "–"}</span>
              </div>
              <Link to="/claim" className={navLinkClass("/claim")}>
                <Car className="h-4 w-4" />
              </Link>
              <Link to="/fleet" className={navLinkClass("/fleet")}>
                <Truck className="h-4 w-4" />
              </Link>
              <Link to="/law-enforcement" className={navLinkClass("/law-enforcement")}>
                <Shield className="h-4 w-4" />
              </Link>
              <Link to="/profile" className={navLinkClass("/profile")}>
                <User className="h-4 w-4" />
              </Link>
              {isAdmin && (
                <Link to="/admin" className={navLinkClass("/admin")}>
                  <ShieldCheck className="h-4 w-4" />
                </Link>
              )}
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground ml-0.5 rounded-full h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="ml-2 rounded-full glow text-xs h-9 px-5">
                Sign In
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );

};

export default Header;
