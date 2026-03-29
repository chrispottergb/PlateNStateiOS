import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Search, Check, Building2, Landmark, Globe, MapPin, Clock, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import WisconsinPlate from "@/components/WisconsinPlate";
import PlateUploadSection from "@/components/PlateUploadSection";
import { INFRACTIONS } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";

type LETier = "department" | "precinct" | "agency";

interface LEAccount {
  id: string;
  department_name: string;
  badge_number: string | null;
  contact_email: string;
  tier: LETier;
  approved: boolean;
}

const TIER_LABELS: Record<LETier, string> = { department: "Department", precinct: "Precinct", agency: "Agency" };
const TIER_LIMITS: Record<LETier, number> = { department: 500, precinct: 2500, agency: 99999 };

const leTiers = [
  { key: "department" as LETier, name: "Department", price: "$499", icon: <Shield className="h-6 w-6" />, description: "For local police departments.", lookupLimit: 500, features: ["Up to 500 lookups/mo", "Full report history", "Verified filtering", "Email support"] },
  { key: "precinct" as LETier, name: "Precinct", price: "$999", icon: <Landmark className="h-6 w-6" />, description: "For precincts and county-level LE.", lookupLimit: 2500, popular: true, features: ["Up to 2,500 lookups/mo", "Batch plate screening", "Risk scoring analytics", "Priority support"] },
  { key: "agency" as LETier, name: "Agency", price: "$2,499", icon: <Globe className="h-6 w-6" />, description: "For state agencies and multi-jurisdiction ops.", lookupLimit: 99999, features: ["Unlimited lookups", "Real-time alert feeds", "API access", "Dedicated account manager"] },
];

const LawEnforcement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [account, setAccount] = useState<LEAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<LETier | null>(null);
  const [deptName, setDeptName] = useState("");
  const [badgeNum, setBadgeNum] = useState("");
  const [email, setEmail] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [lookupPlate, setLookupPlate] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupCount, setLookupCount] = useState(0);

  useEffect(() => { if (!user) { navigate("/auth"); return; } fetchAccount(); }, [user]);

  const fetchAccount = async () => {
    setLoading(true);
    const { data } = await supabase.from("law_enforcement_accounts").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) setAccount(data as LEAccount);
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;
    setRegLoading(true);
    const { error } = await supabase.from("law_enforcement_accounts").insert({ user_id: user!.id, department_name: deptName.trim(), badge_number: badgeNum.trim() || null, contact_email: email.trim(), tier: selectedTier });
    setRegLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Application submitted!" }); fetchAccount(); }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPlate.trim()) return;
    setLookupLoading(true);
    const { data: reports } = await supabase.from("reports").select("*").eq("plate_number", lookupPlate.trim().toUpperCase()).order("created_at", { ascending: false }).limit(50);
    setLookupResult({ plate: lookupPlate.trim().toUpperCase(), reports: reports || [], total: reports?.length || 0, verified: reports?.filter((r) => r.upvote_count >= 3).length || 0 });
    setLookupLoading(false);
    setLookupCount(prev => prev + 1);
  };

  if (loading) {
    return <div className="min-h-screen bg-background"><Header /><div className="container py-16 text-center text-muted-foreground">Loading…</div></div>;
  }

  const tierLimit = account ? TIER_LIMITS[account.tier] : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-5xl space-y-8">
        {!account ? (
          !selectedTier ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3"><Shield className="h-7 w-7 text-primary" /></div>
                <h2 className="text-3xl font-bold tracking-tight">Law Enforcement Portal</h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm">Access community-reported driving data for investigations and public safety.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {leTiers.map((tier, i) => (
                  <motion.div key={tier.key} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className={cn("relative flex flex-col h-full transition-all", tier.popular ? "border-primary shadow-lg scale-[1.03]" : "hover:border-primary/40")}>
                      {tier.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>}
                      <CardHeader className="text-center pb-2">
                        <div className={cn("mx-auto mb-2 h-12 w-12 rounded-xl flex items-center justify-center", tier.popular ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{tier.icon}</div>
                        <CardTitle className="text-xl">{tier.name}</CardTitle>
                        <p className="text-muted-foreground text-sm">{tier.description}</p>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 pt-0">
                        <div className="text-center mb-4"><span className="text-4xl font-black">{tier.price}</span><span className="text-muted-foreground text-sm">/mo</span></div>
                        <ul className="space-y-2 mb-6 flex-1">{tier.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span>{f}</span></li>)}</ul>
                        <Button className="w-full rounded-full" variant={tier.popular ? "default" : "outline"} onClick={() => setSelectedTier(tier.key)}>Apply Now</Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                  <Shield className="h-10 w-10 mx-auto text-primary mb-2" />
                  <CardTitle className="text-2xl">Law Enforcement Application</CardTitle>
                  <Badge variant="secondary" className="mx-auto mt-1">{TIER_LABELS[selectedTier]} Plan</Badge>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div><Label>Department / Agency Name</Label><Input value={deptName} onChange={(e) => setDeptName(e.target.value)} required /></div>
                    <div><Label>Badge Number (optional)</Label><Input value={badgeNum} onChange={(e) => setBadgeNum(e.target.value)} /></div>
                    <div><Label>Official Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedTier(null)}>Back</Button>
                      <Button type="submit" className="flex-1 rounded-full" disabled={regLoading}>{regLoading ? "Submitting…" : "Submit"}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )
        ) : !account.approved ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="max-w-md mx-auto text-center">
              <CardContent className="pt-8 pb-8 space-y-4">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-bold">Application Pending</h2>
                <p className="text-muted-foreground text-sm">Your {TIER_LABELS[account.tier]} plan for <strong>{account.department_name}</strong> is under review.</p>
                <Badge variant="outline" className="rounded-full">Pending Approval</Badge>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Dashboard Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />{account.department_name}</h1>
                <p className="text-sm text-muted-foreground">{account.contact_email}</p>
              </div>
              <Badge variant="outline" className="gap-1 text-sm py-1 px-3 rounded-full"><Shield className="h-3.5 w-3.5" />{TIER_LABELS[account.tier]}</Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl glass-card p-4 text-center">
                <Search className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold font-mono">{lookupCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {tierLimit === 99999 ? "Lookups" : `of ${tierLimit}`}
                </p>
              </div>
              <div className="rounded-xl glass-card p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold font-mono">{lookupResult?.verified || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Flagged</p>
              </div>
              <div className="rounded-xl glass-card p-4 text-center">
                <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold font-mono">{lookupResult?.total || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reports Found</p>
              </div>
            </div>

            {/* Tabbed Interface */}
            <Tabs defaultValue="lookup" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="lookup" className="flex-1">Plate Lookup</TabsTrigger>
                <TabsTrigger value="bulk" className="flex-1">Bulk Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="lookup" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <form onSubmit={handleLookup} className="flex gap-2">
                      <Input placeholder="Enter plate number…" value={lookupPlate} onChange={(e) => setLookupPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))} className="font-mono flex-1" maxLength={8} required />
                      <Button type="submit" disabled={lookupLoading} className="rounded-full">{lookupLoading ? "Searching…" : "Search"}</Button>
                    </form>
                  </CardContent>
                </Card>

                {lookupResult && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-4">
                          <WisconsinPlate plateNumber={lookupResult.plate} size="md" />
                          <div>
                            <p className="text-2xl font-bold">{lookupResult.total} report{lookupResult.total !== 1 ? "s" : ""}</p>
                            <p className="text-sm text-muted-foreground">{lookupResult.verified} verified (3+ upvotes)</p>
                          </div>
                        </div>

                        {lookupResult.reports.length > 0 ? (
                          <div className="space-y-2">
                            {lookupResult.reports.map((r: any) => {
                              const inf = INFRACTIONS.find(i => i.type === r.infraction);
                              return (
                                <div key={r.id} className="rounded-lg bg-muted/50 px-3 py-2.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs rounded-full">{inf?.label || r.infraction.replace(/_/g, " ")}</Badge>
                                      {r.upvote_count >= 3 && <Badge className="text-[10px] rounded-full">Verified</Badge>}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
                                    {r.latitude && <span className="font-mono text-[10px]">({r.latitude.toFixed(4)}, {r.longitude.toFixed(4)})</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">No reports found.</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="bulk">
                <PlateUploadSection userId={user!.id} accountType="law_enforcement" accountId={account.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default LawEnforcement;
