import { Link, useLocation } from "react-router-dom";
import { Home, Trophy, Camera, MapPin, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CONSUMER_TABS = [
  { path: "/", icon: Home, label: "Home", exact: true },
  { path: "/patrol/wall", icon: Trophy, label: "Wall" },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[#0A1620]/95 backdrop-blur-md border-t border-[#889AAA]/[0.08] px-2 pb-safe">
        <div className="flex items-end justify-around max-w-lg mx-auto h-[74px]">
          {CONSUMER_TABS.map(({ path, icon: Icon, label, exact, center }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname.startsWith(path);

            if (center) {
              return (
                <Link
                  key={path}
                  to={path}
                  className="flex flex-col items-center -mt-7 pb-2 min-w-[60px]"
                  aria-label={label}
                >
                  <div
                    className={`h-[62px] w-[62px] rounded-full flex items-center justify-center bg-primary text-[#0B1017] ring-[3px] ring-[#0A1620] transition-transform duration-150 active:scale-95 ${
                      active ? "scale-95" : ""
                    }`}
                    style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 18px -6px hsl(var(--primary) / 0.55), 0 2px 4px rgba(0,0,0,0.4)" }}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.25} />
                  </div>
                  <span className="text-[12px] font-semibold mt-1.5 text-foreground/90 leading-none">
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center gap-2 pb-2.5 px-3 min-w-[56px] transition-colors duration-150"
                aria-label={label}
              >
                <Icon
                  className={`h-[24px] w-[24px] transition-colors ${
                    active ? "text-primary" : "text-icon-muted"
                  }`}
                  strokeWidth={1.75}
                />
                <span
                  className={`text-[12px] font-semibold leading-none transition-colors ${
                    active ? "text-primary" : "text-icon-muted/80"
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
