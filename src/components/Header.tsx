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
  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
      isActive(path)
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`;

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={logoIcon} alt="Plate In State" className="h-7 w-7 transition-transform group-hover:scale-110" />
          <span className="font-bold text-base tracking-tight">Plate In State</span>
        </Link>
        <nav className="flex items-center gap-0.5">
          <Link to="/leaderboard" className={navLinkClass("/leaderboard")}>
            <Trophy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Leaderboard</span>
          </Link>
          <Link to="/map" className={navLinkClass("/map")}>
            <MapPin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Map</span>
          </Link>
          {user ? (
            <>
              <div className="flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 text-sm font-medium mx-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-mono text-xs">{credits ?? "–"}</span>
              </div>
              <Link to="/claim" className={navLinkClass("/claim")}>
                <Car className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Plates</span>
              </Link>
              <Link to="/fleet" className={navLinkClass("/fleet")}>
                <Truck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fleet</span>
              </Link>
              <Link to="/law-enforcement" className={navLinkClass("/law-enforcement")}>
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">LEO</span>
              </Link>
              <Link to="/profile" className={navLinkClass("/profile")}>
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              {isAdmin && (
                <Link to="/admin" className={navLinkClass("/admin")}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground ml-0.5 rounded-full h-8 w-8 p-0">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="ml-2 rounded-full glow">
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
