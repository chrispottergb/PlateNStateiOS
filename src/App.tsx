import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { useIsBlocked } from "@/hooks/useIsBlocked";
import BlockedScreen from "@/components/BlockedScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import TermsGate from "@/components/TermsGate";
import { useNativeDeepLinks } from "@/hooks/useNativeDeepLinks";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Wrap React.lazy with retry + auto-reload on stale chunk errors after a new deploy.
// Symptom this fixes: "TypeError: Importing a module script failed" / "Failed to fetch dynamically imported module"
// when a user has an old tab open and clicks a route whose chunk hash no longer exists on the CDN.
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    const reloadedKey = "chunk-reload-attempted";
    try {
      const mod = await factory();
      sessionStorage.removeItem(reloadedKey);
      return mod;
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      const isChunkErr =
        /Importing a module script failed/i.test(msg) ||
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /error loading dynamically imported module/i.test(msg) ||
        /ChunkLoadError/i.test(msg);
      if (isChunkErr && !sessionStorage.getItem(reloadedKey)) {
        sessionStorage.setItem(reloadedKey, "1");
        window.location.reload();
        // Return a never-resolving promise so Suspense holds while we reload
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });

// Lazy-load heavy / less-frequently-hit routes to keep initial bundle small for high-traffic landing
const Community = lazyWithRetry(() => import("./pages/Community"));
const Business = lazyWithRetry(() => import("./pages/Business"));
const HonkZone = lazyWithRetry(() => import("./pages/HonkZone"));
const WallOfShame = lazyWithRetry(() => import("./pages/WallOfShame"));
const PlateDetail = lazyWithRetry(() => import("./pages/PlateDetail"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const ClaimPlate = lazyWithRetry(() => import("./pages/ClaimPlate"));
const Fleet = lazyWithRetry(() => import("./pages/Fleet"));
const InsurancePortal = lazyWithRetry(() => import("./pages/InsurancePortal"));
const BatchScreening = lazyWithRetry(() => import("./pages/BatchScreening"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const AdminPanel = lazyWithRetry(() => import("./pages/AdminPanel"));
const LawEnforcement = lazyWithRetry(() => import("./pages/LawEnforcement"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const WatchMap = lazyWithRetry(() => import("./pages/WatchMap"));
const QuickCapture = lazyWithRetry(() => import("./pages/QuickCapture"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const CsaePolicy = lazyWithRetry(() => import("./pages/CsaePolicy"));
const DeleteAccount = lazyWithRetry(() => import("./pages/DeleteAccount"));
const Unsubscribe = lazyWithRetry(() => import("./pages/Unsubscribe"));


// Tuned for high-traffic: cache aggressively, retry on network errors, refetch sparingly
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, err: any) => {
        // Don't retry auth/permission errors
        const code = err?.code || err?.status;
        if (code === 401 || code === 403 || code === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: 0 },
  },
});

const NativeDeepLinkBridge = () => {
  useNativeDeepLinks();
  return null;
};

const BlocklistGate = ({ children }: { children: React.ReactNode }) => {
  const { blocked, loading } = useIsBlocked();
  if (loading) return <>{children}</>;
  if (blocked) return <BlockedScreen />;
  return <>{children}</>;
};

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
    Loading…
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TermsGate />
            <NativeDeepLinkBridge />
            <BlocklistGate>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<HonkZone />} />
                  <Route path="/welcome" element={<Index />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/a-hole-patrol" element={<HonkZone />} />
                  <Route path="/a-hole-patrol/wall" element={<WallOfShame />} />
                  <Route path="/business" element={<Business />} />
                  <Route path="/plate/:plateNumber" element={<PlateDetail />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/claim" element={<ClaimPlate />} />
                  <Route path="/fleet" element={<Fleet />} />
                  <Route path="/map" element={<WatchMap />} />
                  <Route path="/insurance" element={<InsurancePortal />} />
                  <Route path="/screening" element={<BatchScreening />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/law-enforcement" element={<LawEnforcement />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/quick-capture" element={<QuickCapture />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/csae-policy" element={<CsaePolicy />} />
                  <Route path="/delete-account" element={<DeleteAccount />} />
                  <Route path="/data-deletion" element={<DeleteAccount />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BlocklistGate>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
