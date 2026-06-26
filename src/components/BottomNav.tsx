import { Link, useLocation } from "react-router-dom";
import { Flame, Users, Trophy, User } from "lucide-react";

const TABS = [
  { to: "/", label: "Patrol", icon: Flame, match: (p: string) => p === "/" || p.startsWith("/a-hole-patrol") },
  { to: "/community", label: "Community", icon: Users, match: (p: string) => p.startsWith("/community") },
  { to: "/leaderboard", label: "Ranks", icon: Trophy, match: (p: string) => p.startsWith("/leaderboard") },
  { to: "/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/profile") },
];

// Routes where a bottom tab bar would be out of place (auth, legal, onboarding flows).
const HIDDEN_PREFIXES = [
  "/auth", "/reset-password", "/welcome", "/privacy", "/terms",
  "/csae-policy", "/delete-account", "/data-deletion", "/unsubscribe",
];

const BottomNav = () => {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {TABS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
