import { Link, useLocation } from "react-router-dom";
import { Home, Trophy, Camera, MapPin, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CONSUMER_TABS = [
  { path: "/", icon: Home, label: "Home", exact: true },
  { path: "/a-hole-patrol/wall", icon: Trophy, label: "Wall" },
  { path: "/quick-capture", icon: Camera, label: "Scan", center: true },
  { path: "/map", icon: MapPin, label: "Map" },
  { path: "/feed", icon: Users, label: "Feed" },
];

const HIDDEN_PATHS = new Set([
  "/auth",
  "/admin",
  "/reset-password",
  "/quick-capture",
  "/privacy",
  "/terms",
  "/csae-policy",
  "/delete-account",
  "/data-deletion",
  "/unsubscribe",
  "/welcome",
  "/screening",
]);

export default function BottomNav() {
  const location = useLocation();
  const { portalMode } = useAuth();

  // Hide on fullscreen / utility pages
  if (HIDDEN_PATHS.has(location.pathname)) return null;
  // Hide on enterprise portal routes
  if (portalMode === "enterprise") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="bg-background/90 backdrop-blur-xl border-t border-border/40 px-2 pb-safe">
        <div className="flex items-end justify-around max-w-lg mx-auto">
          {CONSUMER_TABS.map(({ path, icon: Icon, label, exact, center }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname.startsWith(path);

            if (center) {
              return (
                <Link
                  key={path}
                  to={path}
                  className="flex flex-col items-center -mt-4 mb-1"
                  aria-label={label}
                >
                  <div
                    className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                      active
                        ? "bg-primary scale-95 shadow-primary/40"
                        : "bg-primary hover:bg-primary/90 active:scale-95"
                    }`}
                  >
                    <Icon className="h-6 w-6 text-primary-foreground" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-medium mt-1 text-muted-foreground">
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center gap-1 py-2.5 px-3 min-w-[48px] transition-all duration-150"
                aria-label={label}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
