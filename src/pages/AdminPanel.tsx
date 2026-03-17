import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, CheckCircle2, XCircle, Mail, Building2, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InsuranceApp {
  id: string;
  user_id: string;
  company_name: string;
  contact_email: string;
  approved: boolean;
  created_at: string;
}

interface LEApp {
  id: string;
  user_id: string;
  department_name: string;
  badge_number: string | null;
  contact_email: string;
  tier: string;
  approved: boolean;
  created_at: string;
}

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [insuranceApps, setInsuranceApps] = useState<InsuranceApp[]>([]);
  const [leApps, setLeApps] = useState<LEApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && !authLoading) {
      navigate("/");
      toast.error("Admin access required");
    }
  }, [adminLoading, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: ins }, { data: le }] = await Promise.all([
      supabase.from("insurance_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("law_enforcement_accounts").select("*").order("created_at", { ascending: false }),
    ]);
    if (ins) setInsuranceApps(ins);
    if (le) setLeApps(le as LEApp[]);
    setLoading(false);
  };

  const handleInsuranceApproval = async (id: string, approved: boolean) => {
    setUpdating(id);
    const { error } = await supabase.from("insurance_accounts").update({ approved }).eq("id", id);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(approved ? "Approved" : "Rejected");
      setInsuranceApps((prev) => prev.map((a) => (a.id === id ? { ...a, approved } : a)));
    }
    setUpdating(null);
  };

  const handleLEApproval = async (id: string, approved: boolean) => {
    setUpdating(id);
    const { error } = await supabase.from("law_enforcement_accounts").update({ approved }).eq("id", id);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(approved ? "Approved" : "Rejected");
      setLeApps((prev) => prev.map((a) => (a.id === id ? { ...a, approved } : a)));
    }
    setUpdating(null);
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 max-w-3xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const insPending = insuranceApps.filter((a) => !a.approved);
  const insApproved = insuranceApps.filter((a) => a.approved);
  const lePending = leApps.filter((a) => !a.approved);
  const leApproved = leApps.filter((a) => a.approved);

  const renderAppCard = (
    app: { id: string; created_at: string; approved: boolean },
    name: string,
    email: string,
    extra: React.ReactNode,
    onApprove: (id: string, approved: boolean) => void
  ) => (
    <div key={app.id} className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{name}</span>
          {extra}
          {app.approved && <Badge variant="secondary" className="text-xs">Approved</Badge>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          <span>{email}</span>
          <span>·</span>
          <span>{format(new Date(app.created_at), "MMM d, yyyy")}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {!app.approved ? (
          <>
            <Button size="sm" variant="default" disabled={updating === app.id} onClick={() => onApprove(app.id, true)} className="gap-1">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" disabled={updating === app.id} onClick={() => onApprove(app.id, false)} className="gap-1">
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled={updating === app.id} onClick={() => onApprove(app.id, false)} className="text-muted-foreground">
            Revoke
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Manage account applications</p>

        <Tabs defaultValue="insurance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="insurance" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Insurance
              {insPending.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{insPending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="law-enforcement" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Law Enforcement
              {lePending.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{lePending.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insurance" className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Pending</h2>
              <div className="space-y-3">
                {loading ? (
                  <Skeleton className="h-20 rounded-lg" />
                ) : insPending.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center bg-card rounded-lg">No pending applications</p>
                ) : (
                  insPending.map((app) =>
                    renderAppCard(app, app.company_name, app.contact_email, <Building2 className="h-4 w-4 text-muted-foreground" />, handleInsuranceApproval)
                  )
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3">Approved</h2>
              <div className="space-y-3">
                {insApproved.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center bg-card rounded-lg">No approved accounts</p>
                ) : (
                  insApproved.map((app) =>
                    renderAppCard(app, app.company_name, app.contact_email, <Building2 className="h-4 w-4 text-muted-foreground" />, handleInsuranceApproval)
                  )
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="law-enforcement" className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Pending</h2>
              <div className="space-y-3">
                {loading ? (
                  <Skeleton className="h-20 rounded-lg" />
                ) : lePending.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center bg-card rounded-lg">No pending applications</p>
                ) : (
                  lePending.map((app) =>
                    renderAppCard(
                      app,
                      app.department_name,
                      app.contact_email,
                      <>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs capitalize">{app.tier}</Badge>
                      </>,
                      handleLEApproval
                    )
                  )
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3">Approved</h2>
              <div className="space-y-3">
                {leApproved.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center bg-card rounded-lg">No approved accounts</p>
                ) : (
                  leApproved.map((app) =>
                    renderAppCard(
                      app,
                      app.department_name,
                      app.contact_email,
                      <>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs capitalize">{app.tier}</Badge>
                      </>,
                      handleLEApproval
                    )
                  )
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
