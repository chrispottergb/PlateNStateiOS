import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import TermsGate from "@/components/TermsGate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy-load heavy / less-frequently-hit routes to keep initial bundle small for high-traffic landing
const Community = lazy(() => import("./pages/Community"));
const Business = lazy(() => import("./pages/Business"));
const HonkZone = lazy(() => import("./pages/HonkZone"));
const WallOfShame = lazy(() => import("./pages/WallOfShame"));
const PlateDetail = lazy(() => import("./pages/PlateDetail"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile = lazy(() => import("./pages/Profile"));
const ClaimPlate = lazy(() => import("./pages/ClaimPlate"));
const Fleet = lazy(() => import("./pages/Fleet"));
const InsurancePortal = lazy(() => import("./pages/InsurancePortal"));
const BatchScreening = lazy(() => import("./pages/BatchScreening"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const LawEnforcement = lazy(() => import("./pages/LawEnforcement"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const WatchMap = lazy(() => import("./pages/WatchMap"));
const QuickCapture = lazy(() => import("./pages/QuickCapture"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

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
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
