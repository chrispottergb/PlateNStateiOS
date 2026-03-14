import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Truck, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import FleetVehicleCard from "@/components/FleetVehicleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Company {
  id: string;
  name: string;
  contact_email: string;
}

interface VehicleWithReports {
  id: string;
  plate_number: string;
  vehicle_label: string | null;
  report_count: number;
}

const Fleet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [vehicles, setVehicles] = useState<VehicleWithReports[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Add vehicle form
  const [newPlate, setNewPlate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchCompany();
  }, [user]);

  // Realtime: refresh report counts when new reports come in for fleet plates
  useEffect(() => {
    if (!company || vehicles.length === 0) return;

    const plateNumbers = vehicles.map((v) => v.plate_number);
    const channel = supabase
      .channel("fleet-reports")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          if (plateNumbers.includes((payload.new as { plate_number: string }).plate_number)) {
            fetchVehicles(company.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company, vehicles.length]);

  const fetchCompany = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("companies")
      .select("id, name, contact_email")
      .eq("owner_id", user!.id)
      .maybeSingle();

    if (data) {
      setCompany(data);
      await fetchVehicles(data.id);
    }
    setLoading(false);
  };

  const fetchVehicles = async (companyId: string) => {
    const { data: fv } = await supabase
      .from("fleet_vehicles")
      .select("id, plate_number, vehicle_label")
      .eq("company_id", companyId);

    if (!fv || fv.length === 0) {
      setVehicles([]);
      return;
    }

    const plateNumbers = fv.map((v) => v.plate_number);
    const { data: reports } = await supabase
      .from("reports")
      .select("plate_number")
      .in("plate_number", plateNumbers);

    const countMap: Record<string, number> = {};
    (reports || []).forEach((r) => {
      countMap[r.plate_number] = (countMap[r.plate_number] || 0) + 1;
    });

    setVehicles(
      fv.map((v) => ({
        ...v,
        report_count: countMap[v.plate_number] || 0,
      }))
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    const { error } = await supabase.from("companies").insert({
      owner_id: user!.id,
      name: regName.trim(),
      contact_email: regEmail.trim(),
    });
    setRegLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Company registered!" });
      fetchCompany();
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setAddLoading(true);
    const { error } = await supabase.from("fleet_vehicles").insert({
      company_id: company.id,
      plate_number: newPlate.trim().toUpperCase(),
      vehicle_label: newLabel.trim() || null,
    });
    setAddLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewPlate("");
      setNewLabel("");
      fetchVehicles(company.id);
    }
  };

  const handleRemoveVehicle = async (vehicleId: string) => {
    await supabase.from("fleet_vehicles").delete().eq("id", vehicleId);
    if (company) fetchVehicles(company.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const totalReports = vehicles.reduce((s, v) => s + v.report_count, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-3xl space-y-8">
        {!company ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="text-center">
                <Building2 className="h-10 w-10 mx-auto text-primary mb-2" />
                <CardTitle className="text-2xl">Register Your Fleet</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Set up "How's My Driving?" tracking for your company vehicles.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4 max-w-sm mx-auto">
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Contact Email</Label>
                    <Input id="contact-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={regLoading}>
                    {regLoading ? "Registering…" : "Register Company"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Header & Stats */}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                {company.name}
              </h1>
              <p className="text-sm text-muted-foreground">{company.contact_email}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Truck className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">{vehicles.length}</p>
                  <p className="text-xs text-muted-foreground">Vehicles</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">{totalReports}</p>
                  <p className="text-xs text-muted-foreground">Reports</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold mt-6">
                    {vehicles.length > 0 ? (totalReports / vehicles.length).toFixed(1) : "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg / Vehicle</p>
                </CardContent>
              </Card>
            </div>

            {/* Add vehicle */}
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleAddVehicle} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Plate number"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                    required
                    maxLength={8}
                    className="font-mono flex-1"
                  />
                  <Input
                    placeholder="Label (optional)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={addLoading} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Vehicle list */}
            <div className="space-y-2">
              {vehicles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No vehicles yet. Add your first fleet plate above.</p>
              ) : (
                vehicles.map((v) => (
                  <FleetVehicleCard
                    key={v.id}
                    plateNumber={v.plate_number}
                    vehicleLabel={v.vehicle_label}
                    reportCount={v.report_count}
                    onRemove={() => handleRemoveVehicle(v.id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Fleet;
