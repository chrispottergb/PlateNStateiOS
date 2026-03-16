import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, CheckCircle2, XCircle, Mail, Building2 } from "lucide-react";
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

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [apps, setApps] = useState<InsuranceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && !authLoading) {
      navigate("/");
      toast.error("Admin access required");
    }
  }, [adminLoading, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchApps();
  }, [isAdmin]);

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("insurance_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setApps(data);
    setLoading(false);
  };

  const handleApproval = async (id: string, approved: boolean) => {
    setUpdating(id);
    const { error } = await supabase
      .from("insurance_accounts")
      .update({ approved })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      toast.success(approved ? "Application approved" : "Application rejected");
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, approved } : a))
      );
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

  const pending = apps.filter((a) => !a.approved);
  const approved = apps.filter((a) => a.approved);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Manage insurance account applications
        </p>

        {/* Pending Applications */}
        <h2 className="text-lg font-semibold mb-3">
          Pending Applications
          {pending.length > 0 && (
            <Badge variant="destructive" className="ml-2">{pending.length}</Badge>
          )}
        </h2>
        <div className="space-y-3 mb-10">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center bg-card rounded-lg">
              No pending applications
            </p>
          ) : (
            pending.map((app) => (
              <div
                key={app.id}
                className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{app.company_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{app.contact_email}</span>
                    <span>·</span>
                    <span>Applied {format(new Date(app.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={updating === app.id}
                    onClick={() => handleApproval(app.id, true)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updating === app.id}
                    onClick={() => handleApproval(app.id, false)}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Approved Accounts */}
        <h2 className="text-lg font-semibold mb-3">Approved Accounts</h2>
        <div className="space-y-3">
          {loading ? (
            <Skeleton className="h-16 rounded-lg" />
          ) : approved.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center bg-card rounded-lg">
              No approved accounts yet
            </p>
          ) : (
            approved.map((app) => (
              <div
                key={app.id}
                className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{app.company_name}</span>
                    <Badge variant="secondary" className="text-xs">Approved</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{app.contact_email}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={updating === app.id}
                  onClick={() => handleApproval(app.id, false)}
                  className="text-muted-foreground shrink-0"
                >
                  Revoke
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
