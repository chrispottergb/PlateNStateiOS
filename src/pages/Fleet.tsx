import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Truck, BarChart3, Crown, AlertTriangle, Search, Settings, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import FleetVehicleCard from "@/components/FleetVehicleCard";
import FleetPricing, { FleetTier, TIER_VEHICLE_LIMITS } from "@/components/FleetPricing";
import WisconsinPlate from "@/components/WisconsinPlate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface Company {
  id: string;
  name: string;
  contact_email: string;
  tier: FleetTier;
}

interface VehicleWithReports {
  id: string;
  plate_number: string;
  vehicle_label: string | null;
  report_count: number;
}

const TIER_LABELS: Record<FleetTier, string> = { starter: "Starter", business: "Business", premium: "Premium" };

const getRiskBadge = (count: number) => {
  if (count >= 5) return { label: "High", color: "bg-destructive/15 text-destructive border-destructive/30" };
  if (count >= 2) return { label: "Moderate", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  return { label: "Low", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
};

const Fleet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [vehicles, setVehicles] = useState<VehicleWithReports[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<FleetTier | null>(null);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");

  useEffect(() => { if (!user) { navigate("/auth"); return; } fetchCompany(); }, [user]);

  useEffect(() => {
    if (!company || vehicles.length === 0) return;
    const plateNumbers = vehicles.map((v) => v.plate_number);
    const channel = supabase.channel("fleet-reports").on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, (payload) => {
      if (plateNumbers.includes((payload.new as { plate_number: string }).plate_number)) fetchVehicles(company.id);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [company, vehicles.length]);

  const fetchCompany = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("id, name, contact_email, tier").eq("owner_id", user!.id).maybeSingle();
    if (data) { setCompany(data as Company); await fetchVehicles(data.id); }
    setLoading(false);
  };

  const fetchVehicles = async (companyId: string) => {
    const { data: fv } = await supabase.from("fleet_vehicles").select("id, plate_number, vehicle_label").eq("company_id", companyId);
    if (!fv || fv.length === 0) { setVehicles([]); return; }
    const plateNumbers = fv.map((v) => v.plate_number);
    const { data: reports } = await supabase.from("reports").select("plate_number").in("plate_number", plateNumbers);
    const countMap: Record<string, number> = {};
    (reports || []).forEach((r) => { countMap[r.plate_number] = (countMap[r.plate_number] || 0) + 1; });
    setVehicles(fv.map((v) => ({ ...v, report_count: countMap[v.plate_number] || 0 })));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;
    setRegLoading(true);
    const { error } = await supabase.from("companies").insert({ owner_id: user!.id, name: regName.trim(), contact_email: regEmail.trim(), tier: selectedTier });
    setRegLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Company registered!", description: `You're on the ${TIER_LABELS[selectedTier]} plan.` }); fetchCompany(); }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    const limit = TIER_VEHICLE_LIMITS[company.tier];
    if (vehicles.length >= limit) {
      toast({ title: "Vehicle limit reached", description: `Upgrade to add more vehicles.`, variant: "destructive" });
      return;
    }
    setAddLoading(true);
    const { error } = await supabase.from("fleet_vehicles").insert({ company_id: company.id, plate_number: newPlate.trim().toUpperCase(), vehicle_label: newLabel.trim() || null });
    setAddLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setNewPlate(""); setNewLabel(""); fetchVehicles(company.id); }
  };

  const handleRemoveVehicle = async (vehicleId: string) => {
    await supabase.from("fleet_vehicles").delete().eq("id", vehicleId);
    if (company) fetchVehicles(company.id);
  };

  if (loading) {
    return <div className="min-h-screen bg-background"><Header /><div className="container py-16 text-center text-muted-foreground">Loading…</div></div>;
  }

  const totalReports = vehicles.reduce((s, v) => s + v.report_count, 0);
  const vehicleLimit = company ? TIER_VEHICLE_LIMITS[company.tier] : 0;
  const fleetScore = vehicles.length > 0 ? Math.max(0, 100 - Math.round((totalReports / vehicles.length) * 10)) : 100;
  const alertVehicles = vehicles.filter(v => v.report_count >= 3);

  const filteredVehicles = vehicles.filter(v =>
    v.plate_number.includes(vehicleSearch.toUpperCase()) ||
    (v.vehicle_label || "").toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  // Real 7-day trend data from fleet vehicle reports
  const [trendData, setTrendData] = useState<{ day: string; incidents: number }[]>([]);
  useEffect(() => {
    if (!vehicles.length) return;
    const fetchTrend = async () => {
      const plateNumbers = vehicles.map(v => v.plate_number);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const { data } = await supabase
        .from("reports")
        .select("created_at")
        .in("plate_number", plateNumbers)
        .gte("created_at", sevenDaysAgo.toISOString());
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const counts: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        counts[d.toISOString().slice(0, 10)] = 0;
      }
      (data ?? []).forEach(r => {
        const key = r.created_at.slice(0, 10);
        if (key in counts) counts[key]++;
      });
      setTrendData(Object.entries(counts).map(([date, incidents]) => ({
        day: days[new Date(date).getDay()],
        incidents,
      })));
    };
    fetchTrend();
  }, [vehicles]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-4xl space-y-6">
        {!company ? (
          !selectedTier ? (
            <FleetPricing onSelectTier={setSelectedTier} />
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                  <Building2 className="h-10 w-10 mx-auto text-primary mb-2" />
                  <CardTitle className="text-2xl">Register Your Fleet</CardTitle>
                  <Badge variant="secondary" className="mx-auto mt-1">{TIER_LABELS[selectedTier]} Plan</Badge>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div><Label>Company Name</Label><Input value={regName} onChange={(e) => setRegName(e.target.value)} required /></div>
                    <div><Label>Contact Email</Label><Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required /></div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedTier(null)}>Back</Button>
                      <Button type="submit" className="flex-1" disabled={regLoading}>{regLoading ? "Registering…" : "Register"}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )
        ) : (
          <>
            {/* Dashboard Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Truck className="h-6 w-6 text-primary" /> Fleet Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">{company.name} · {TIER_LABELS[company.tier]} Plan</p>
              </div>
              <Badge variant="outline" className="gap-1 text-sm py-1 px-3 rounded-full">
                <Crown className="h-3.5 w-3.5" /> {TIER_LABELS[company.tier]}
              </Badge>
            </div>

            {/* Alert Banner */}
            {alertVehicles.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4 border border-destructive/30 bg-destructive/5 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{alertVehicles.length} vehicle{alertVehicles.length > 1 ? "s" : ""} with multiple infractions</p>
                  <p className="text-xs text-muted-foreground">Review immediately to reduce fleet risk</p>
                </div>
              </motion.div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl glass-card p-4 text-center">
                <Truck className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold font-mono">{vehicles.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Vehicles</p>
              </div>
              <div className="rounded-xl glass-card p-4 text-center">
                <Shield className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className={`text-2xl font-bold font-mono ${fleetScore >= 80 ? "text-emerald-500" : fleetScore >= 50 ? "text-amber-500" : "text-destructive"}`}>{fleetScore}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fleet Score</p>
              </div>
              <div className="rounded-xl glass-card p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
                <p className="text-2xl font-bold font-mono">{alertVehicles.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Alerts</p>
              </div>
            </div>

            {/* 7-Day Trend */}
            <div className="rounded-xl glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">7-Day Incident Trend</h3>
                <Badge variant="secondary" className="rounded-full text-[10px] gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Update
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trendData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", background: "hsl(var(--card))" }} />
                  <Line type="monotone" dataKey="incidents" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Add vehicle + Search */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Monitored Vehicles</h3>
                <span className="text-xs text-muted-foreground">{vehicles.length}{vehicleLimit !== 9999 ? ` / ${vehicleLimit}` : ""}</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search vehicles..." value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} className="pl-9 rounded-full" />
                </div>
              </div>
              <form onSubmit={handleAddVehicle} className="flex gap-2">
                <Input placeholder="Plate number" value={newPlate} onChange={(e) => setNewPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))} required maxLength={8} className="font-mono flex-1" />
                <Input placeholder="Label (optional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="flex-1" />
                <Button type="submit" disabled={addLoading || vehicles.length >= vehicleLimit} className="gap-1 rounded-full">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </form>
            </div>

            {/* Vehicle List */}
            <div className="space-y-2">
              {filteredVehicles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {vehicles.length === 0 ? "No vehicles yet. Add your first fleet plate above." : "No vehicles match your search."}
                </p>
              ) : (
                filteredVehicles.map((v) => {
                  const risk = getRiskBadge(v.report_count);
                  return (
                    <div key={v.id} className="rounded-xl glass-card p-4 flex items-center gap-4">
                      <WisconsinPlate plateNumber={v.plate_number} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{v.vehicle_label || v.plate_number}</p>
                        <p className="text-xs text-muted-foreground">{v.report_count} report{v.report_count !== 1 ? "s" : ""}</p>
                      </div>
                      <Badge variant="outline" className={`rounded-full text-[10px] ${risk.color}`}>{risk.label}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveVehicle(v.id)} className="text-muted-foreground text-xs">Remove</Button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Fleet;
