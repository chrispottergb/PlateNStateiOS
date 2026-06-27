import { Link, useLocation } from "react-router-dom";
import { Trophy, MapPin, Briefcase, Truck, ShieldCheck, Shield, Users } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const Header = () => {
  const location = useLocation();
  const { user, portalMode } = useAuth();
  const isEnterprise = portalMode === "enterprise";
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
      isActive(path)
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/30 w-full">
      <div className="container flex h-14 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoIcon} alt="Plate N' State" className="h-7 w-7" />
          <span className="font-bold text-sm tracking-tight">Plate N' State</span>
        </Link>
        <nav className="flex items-center gap-1">
          {isEnterprise ? (
            <>
              <Link to="/business" className={navLinkClass("/business")}>
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Business</span>
              </Link>
              <Link to="/fleet" className={navLinkClass("/fleet")}>
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Fleet</span>
              </Link>
              <Link to="/insurance" className={navLinkClass("/insurance")}>
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Insurance</span>
              </Link>
              <Link to="/law-enforcement" className={navLinkClass("/law-enforcement")}>
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Law</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/a-hole-patrol/wall" className={navLinkClass("/a-hole-patrol/wall")}>
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Leaderboard</span>
              </Link>
              <Link to="/map" className={navLinkClass("/map")}>
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </Link>
              <Link to="/feed" className={navLinkClass("/feed")}>
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
            </>
          )}
          {!user && (
            <Link to="/auth">
              <Button size="sm" className="ml-2 rounded-full text-xs h-9 px-5">
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
