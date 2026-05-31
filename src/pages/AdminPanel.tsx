import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, CheckCircle2, XCircle, Mail, Building2, Shield, Users, AlertTriangle, Truck, Trash2, Crown, Flag, Ban } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { INFRACTIONS } from "@/lib/data";

interface InsuranceApp { id: string; user_id: string; company_name: string; contact_email: string; approved: boolean; created_at: string; }
interface LEApp { id: string; user_id: string; department_name: string; badge_number: string | null; contact_email: string; tier: string; approved: boolean; created_at: string; }
interface ProfileRow { id: string; user_id: string; display_name: string | null; total_reports: number; xp: number; credits: number; joined_at: string; }
interface ReportRow { id: string; plate_number: string; infraction: string; location: string; created_at: string; upvote_count: number; reporter_id: string | null; }
interface CompanyRow { id: string; name: string; contact_email: string; tier: string; owner_id: string; created_at: string; }

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [authLoading, user]);
  useEffect(() => { if (!adminLoading && !isAdmin && !authLoading) { navigate("/"); toast.error("Admin access required"); } }, [adminLoading, isAdmin, authLoading]);

  // Single query that fetches all admin data in parallel — cached and invalidated after mutations
  const { data: adminData, isLoading: loading } = useQuery({
    queryKey: ["admin-data"],
    queryFn: async () => {
      const [insRes, leRes, profRes, repRes, compRes, dispRes, appealsRes] = await Promise.all([
        supabase.from("insurance_accounts").select("*").order("created_at", { ascending: false }),
        supabase.from("law_enforcement_accounts").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, user_id, display_name, total_reports, xp, credits, joined_at").order("total_reports", { ascending: false }).limit(50),
        supabase.from("reports").select("id, plate_number, infraction, location, created_at, upvote_count, reporter_id").order("created_at", { ascending: false }).limit(30),
        supabase.from("companies").select("id, name, contact_email, tier, owner_id, created_at").order("created_at", { ascending: false }),
        supabase.from("report_disputes").select("id, report_id, plate_number, reason, note, status, paid, created_at").eq("paid", true).eq("status", "pending").order("created_at", { ascending: true }),
        supabase.from("appeals").select("id, report_id, plate_number, reason, status, created_at, user_id").eq("status", "pending").order("created_at", { ascending: true }),
      ]);
      const companies = (compRes.data ?? []) as CompanyRow[];
      const { data: vehiclesRaw } = await supabase.from("fleet_vehicles").select("company_id");
      const fleetCounts: Record<string, number> = {};
      (vehiclesRaw || []).forEach((v: any) => { fleetCounts[v.company_id] = (fleetCounts[v.company_id] || 0) + 1; });
      return {
        insuranceApps: (insRes.data ?? []) as InsuranceApp[],
        leApps: (leRes.data ?? []) as LEApp[],
        profiles: (profRes.data ?? []) as ProfileRow[],
        recentReports: (repRes.data ?? []) as ReportRow[],
        companies,
        fleetCounts,
        disputes: dispRes.data ?? [],
        appeals: appealsRes.data ?? [],
      };
    },
    enabled: !!isAdmin,
    staleTime: 60_000,
  });

  const insuranceApps = adminData?.insuranceApps ?? [];
  const leApps = adminData?.leApps ?? [];
  const profiles = adminData?.profiles ?? [];
  const recentReports = adminData?.recentReports ?? [];
  const companies = adminData?.companies ?? [];
  const fleetCounts = adminData?.fleetCounts ?? {};
  const disputes = adminData?.disputes ?? [];
  const appeals = adminData?.appeals ?? [];

  const invalidateAdmin = () => queryClient.invalidateQueries({ queryKey: ["admin-data"] });

  const handleResolveAppeal = async (appealId: string, reportId: string, decision: "upheld" | "dismissed") => {
    setUpdating(appealId);
    if (decision === "upheld") {
      await supabase.from("reports").delete().eq("id", reportId);
    } else {
      // Dismiss: keep the report and clear flagged/excluded so it counts again
      await supabase.from("reports").update({ is_flagged: false, excluded_from_score: false }).eq("id", reportId);
    }
    const { error } = await supabase
      .from("appeals")
      .update({ status: decision, resolved_at: new Date().toISOString(), resolved_by: user!.id })
      .eq("id", appealId);
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success(decision === "upheld" ? "Appeal upheld — report removed" : "Appeal dismissed");
      invalidateAdmin();
    }
    setUpdating(null);
  };

  const handleResolveDispute = async (id: string, decision: "upheld" | "denied") => {
    setUpdating(id);
    const { error } = await supabase.rpc("resolve_dispute", { p_dispute_id: id, p_decision: decision });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success(decision === "upheld" ? "Dispute upheld — post removed" : "Dispute denied");
      invalidateAdmin();
    }
    setUpdating(null);
  };

  const handleInsuranceApproval = async (id: string, approved: boolean) => {
    setUpdating(id);
    const { error } = await supabase.from("insurance_accounts").update({ approved }).eq("id", id);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success(approved ? "Approved" : "Rejected"); invalidateAdmin(); }
    setUpdating(null);
  };

  const handleLEApproval = async (id: string, approved: boolean) => {
    setUpdating(id);
    const { error } = await supabase.from("law_enforcement_accounts").update({ approved }).eq("id", id);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success(approved ? "Approved" : "Rejected"); invalidateAdmin(); }
    setUpdating(null);
  };

  const handleDeleteReport = async (id: string) => {
    setUpdating(id);
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Report deleted"); invalidateAdmin(); }
    setUpdating(null);
  };

  if (authLoading || adminLoading) {
    return <div className="min-h-screen bg-background"><Header /><div className="container py-8 max-w-4xl space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 rounded-lg" /></div></div>;
  }
  if (!isAdmin) return null;

  const insPending = insuranceApps.filter((a) => !a.approved);
  const lePending = leApps.filter((a) => !a.approved);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Manage applications, users, reports, and fleet companies</p>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl glass-card p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold font-mono">{profiles.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Users</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <Mail className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold font-mono">{insPending.length + lePending.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold font-mono">{recentReports.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reports</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <Truck className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold font-mono">{companies.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fleets</p>
          </div>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="applications" className="flex-1 gap-1">
              Applications
              {(insPending.length + lePending.length) > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{insPending.length + lePending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1">Reports</TabsTrigger>
            <TabsTrigger value="disputes" className="flex-1 gap-1">
              Disputes
              {disputes.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{disputes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="appeals" className="flex-1 gap-1">
              Appeals
              {appeals.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{appeals.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="fleets" className="flex-1">Fleets</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Insurance Applications
              </h2>
              <div className="space-y-2">
                {insuranceApps.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-card rounded-lg">No applications</p>
                ) : insuranceApps.map((app) => (
                  <div key={app.id} className="flex items-center gap-4 rounded-xl glass-card p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{app.company_name}</span>
                        {app.approved && <Badge variant="secondary" className="text-[10px] rounded-full">Approved</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />{app.contact_email} · {format(new Date(app.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!app.approved ? (
                        <>
                          <Button size="sm" disabled={updating === app.id} onClick={() => handleInsuranceApproval(app.id, true)} className="gap-1 rounded-full"><CheckCircle2 className="h-4 w-4" />Approve</Button>
                          <Button size="sm" variant="outline" disabled={updating === app.id} onClick={() => handleInsuranceApproval(app.id, false)} className="gap-1 rounded-full"><XCircle className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={updating === app.id} onClick={() => handleInsuranceApproval(app.id, false)} className="text-muted-foreground text-xs">Revoke</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Law Enforcement Applications
              </h2>
              <div className="space-y-2">
                {leApps.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-card rounded-lg">No applications</p>
                ) : leApps.map((app) => (
                  <div key={app.id} className="flex items-center gap-4 rounded-xl glass-card p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{app.department_name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize rounded-full">{app.tier}</Badge>
                        {app.approved && <Badge variant="secondary" className="text-[10px] rounded-full">Approved</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />{app.contact_email} · {format(new Date(app.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!app.approved ? (
                        <>
                          <Button size="sm" disabled={updating === app.id} onClick={() => handleLEApproval(app.id, true)} className="gap-1 rounded-full"><CheckCircle2 className="h-4 w-4" />Approve</Button>
                          <Button size="sm" variant="outline" disabled={updating === app.id} onClick={() => handleLEApproval(app.id, false)} className="gap-1 rounded-full"><XCircle className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={updating === app.id} onClick={() => handleLEApproval(app.id, false)} className="text-muted-foreground text-xs">Revoke</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-4 rounded-xl glass-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {(p.display_name || "D")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{p.display_name || "Driver"}</p>
                  <p className="text-xs text-muted-foreground">{p.total_reports} reports · {p.xp} XP · Joined {format(new Date(p.joined_at), "MMM yyyy")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px] rounded-full gap-1">
                    <Crown className="h-3 w-3" /> {p.credits} coins
                  </Badge>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-2">
            {recentReports.map((r) => {
              const inf = INFRACTIONS.find(i => i.type === r.infraction);
              return (
                <div key={r.id} className="flex items-center gap-4 rounded-xl glass-card p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-sm">{r.plate_number}</span>
                      <Badge variant="secondary" className="text-[10px] rounded-full">{inf?.label || r.infraction}</Badge>
                      {r.upvote_count >= 3 && <Badge className="text-[10px] rounded-full">Verified</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.location} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1" disabled={updating === r.id} onClick={() => handleDeleteReport(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              );
            })}
          </TabsContent>

          {/* Fleets Tab */}
          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-2">
            {disputes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center bg-card rounded-lg">No pending disputes</p>
            ) : disputes.map((d) => (
              <div key={d.id} className="rounded-xl glass-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-amber-500" />
                  <span className="font-mono font-bold text-sm">{d.plate_number}</span>
                  <Badge variant="secondary" className="text-[10px] rounded-full capitalize">{d.reason.replace(/_/g, " ")}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                </div>
                {d.note && <p className="text-xs text-muted-foreground italic">"{d.note}"</p>}
                <p className="text-[10px] text-muted-foreground">Report ID: <span className="font-mono">{d.report_id}</span></p>
                <div className="flex gap-2">
                  <Button size="sm" disabled={updating === d.id} onClick={() => handleResolveDispute(d.id, "upheld")} className="gap-1 rounded-full">
                    <CheckCircle2 className="h-4 w-4" /> Uphold (remove post)
                  </Button>
                  <Button size="sm" variant="outline" disabled={updating === d.id} onClick={() => handleResolveDispute(d.id, "denied")} className="gap-1 rounded-full">
                    <XCircle className="h-4 w-4" /> Deny
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="appeals" className="space-y-2">
            {appeals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center bg-card rounded-lg">No pending appeals</p>
            ) : appeals.map((a) => (
              <div key={a.id} className="rounded-xl glass-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-mono font-bold text-sm">{a.plate_number}</span>
                  <Badge variant="outline" className="text-[10px] rounded-full">Appeal</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-muted-foreground italic">"{a.reason}"</p>
                <p className="text-[10px] text-muted-foreground">Report ID: <span className="font-mono">{a.report_id}</span></p>
                <div className="flex gap-2">
                  <Button size="sm" disabled={updating === a.id} onClick={() => handleResolveAppeal(a.id, a.report_id, "upheld")} className="gap-1 rounded-full">
                    <CheckCircle2 className="h-4 w-4" /> Uphold (remove report)
                  </Button>
                  <Button size="sm" variant="outline" disabled={updating === a.id} onClick={() => handleResolveAppeal(a.id, a.report_id, "dismissed")} className="gap-1 rounded-full">
                    <XCircle className="h-4 w-4" /> Dismiss (restore)
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="fleets" className="space-y-2">
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center bg-card rounded-lg">No fleet companies registered</p>
            ) : companies.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-xl glass-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize rounded-full">{c.tier}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.contact_email} · {fleetCounts[c.id] || 0} vehicles · {format(new Date(c.created_at), "MMM yyyy")}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
