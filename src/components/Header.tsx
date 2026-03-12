import { Link, useLocation } from "react-router-dom";
import { Shield, Trophy, User } from "lucide-react";

const Header = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">WI Plate Watch</span>
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
            to="/profile"
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
              isActive("/profile") ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
