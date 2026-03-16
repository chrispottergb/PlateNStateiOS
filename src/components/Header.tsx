import { Link, useLocation } from "react-router-dom";
import { Trophy, User, Car, LogOut, Coins, Truck, MapPin, ShieldCheck } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">Plate In State</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/leaderboard"
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
              isActive("/leaderboard") ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </Link>
          <Link
            to="/map"
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
              isActive("/map") ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Watch Map</span>
          </Link>
          {user ? (
            <>
              <div className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1.5 text-sm font-medium">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="font-mono">{credits ?? "–"}</span>
              </div>
              <Link
                to="/claim"
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                  isActive("/claim") ? "bg-muted text-foreground" : "text-muted-foreground"
                }`}
              >
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">My Plates</span>
              </Link>
              <Link
                to="/fleet"
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                  isActive("/fleet") ? "bg-muted text-foreground" : "text-muted-foreground"
                }`}
              >
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Fleet</span>
              </Link>
              <Link
                to="/profile"
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                  isActive("/profile") ? "bg-muted text-foreground" : "text-muted-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                    isActive("/admin") ? "bg-muted text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground ml-1">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="ml-2">
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
