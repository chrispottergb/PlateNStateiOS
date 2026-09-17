import { Link, useLocation } from "react-router-dom";
import { Briefcase, Truck, ShieldCheck, Shield } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";

interface HeaderProps {
  /** Transparent, absolutely positioned over a hero image (Home). */
  overlay?: boolean;
}

const Header = ({ overlay = false }: HeaderProps) => {
  const location = useLocation();
  const { user, portalMode } = useAuth();
  const isEnterprise = portalMode === "enterprise";
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
      isActive(path)
        ? "bg-primary/12 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  return (
    <header
      className={
        overlay
          ? "absolute top-0 left-0 right-0 z-40 w-full pt-safe"
          : "sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/40 w-full pt-safe"
      }
    >
      <div className={`container flex items-center justify-between gap-2 ${overlay ? "h-[68px]" : "h-[60px]"}`}>
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <img src={logoIcon} alt="" className={`shrink-0 ${overlay ? "h-9 w-9" : "h-7 w-7"}`} />
          <span className="flex flex-col leading-none min-w-0">
            <span className={`font-extrabold tracking-wide uppercase whitespace-nowrap ${overlay ? "text-[17px]" : "text-[15px]"}`}>
              Plate <span className="text-primary">N'</span> State
            </span>
            <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap truncate">
              Drivers accountable. Roads safer.
            </span>
          </span>
        </Link>
        {/* Enterprise portal nav stays in header */}
        {isEnterprise && (
          <nav className="flex items-center gap-1">
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
          </nav>
        )}

        {user && !isEnterprise && <NotificationBell />}

        {!user && (
          <Link to="/auth" className="shrink-0">
            <Button size="sm" variant={overlay ? "secondary" : "default"} className={overlay ? "h-8 px-3 text-xs bg-[#0D1B26]/70 backdrop-blur-sm border-[#889AAA]/[0.2]" : "h-9 px-3.5"}>
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
