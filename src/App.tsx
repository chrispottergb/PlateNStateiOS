import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Community from "./pages/Community";
import Business from "./pages/Business";
import PlateDetail from "./pages/PlateDetail";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ClaimPlate from "./pages/ClaimPlate";
import Fleet from "./pages/Fleet";
import InsurancePortal from "./pages/InsurancePortal";
import BatchScreening from "./pages/BatchScreening";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/AdminPanel";
import LawEnforcement from "./pages/LawEnforcement";

const WatchMap = lazy(() => import("./pages/WatchMap"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/community" element={<Community />} />
            <Route path="/business" element={<Business />} />
            <Route path="/plate/:plateNumber" element={<PlateDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/claim" element={<ClaimPlate />} />
            <Route path="/fleet" element={<Fleet />} />
            <Route path="/map" element={<Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading map…</div>}><WatchMap /></Suspense>} />
            <Route path="/insurance" element={<InsurancePortal />} />
            <Route path="/screening" element={<BatchScreening />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/law-enforcement" element={<LawEnforcement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
