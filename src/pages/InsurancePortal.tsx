import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Clock, AlertTriangle, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { INFRACTIONS } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import PlateUploadSection from "@/components/PlateUploadSection";

interface InsuranceAccount {
  id: string;
  company_name: string;
  contact_email: string;
  approved: boolean;
}

interface Infraction {
  id: string;
  infraction: string;
  location: string;
  created_at: string;
  upvote_count: number;
  verified: boolean;
}

interface LookupResult {
  plate_number: string;
  total_reports: number;
  verified_reports: number;
  risk_score: number;
  infractions: Infraction[];
}

const riskColor = (score: number) => {
  if (score === 0) return "text-emerald-600";
  if (score <= 20) return "text-emerald-600";
  if (score <= 50) return "text-amber-500";
  if (score <= 75) return "text-orange-500";
  return "text-destructive";
};

const riskLabel = (score: number) => {
  if (score === 0) return "Clean";
  if (score <= 20) return "Low Risk";
  if (score <= 50) return "Moderate";
  if (score <= 75) return "High Risk";
  return "Severe";
};

const riskProgressColor = (score: number) => {
  if (score <= 20) return "[&>div]:bg-emerald-500";
  if (score <= 50) return "[&>div]:bg-amber-500";
  if (score <= 75) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-destructive";
};

const InsurancePortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [account, setAccount] = useState<InsuranceAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAccount, setNoAccount] = useState(false);

  // Application form
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [applying, setApplying] = useState(false);

  // Lookup
  const [searchPlate, setSearchPlate] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAccount();
  }, [user]);

  const fetchAccount = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("insurance_accounts")
      .select("id, company_name, contact_email, approved")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setAccount(data as InsuranceAccount);
    } else {
      setNoAccount(true);
    }
    setLoading(false);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    const { error } = await supabase.from("insurance_accounts").insert({
      user_id: user!.id,
      company_name: companyName.trim(),
      contact_email: contactEmail.trim(),
    });
    setApplying(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application submitted!", description: "You'll be notified once approved." });
      setNoAccount(false);
      fetchAccount();
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPlate.trim()) return;
    setSearching(true);
    setLookupResult(null);
    try {
      const { data, error } = await supabase.rpc("insurance_plate_lookup", {
        p_plate_number: searchPlate.trim().toUpperCase(),
      } as any);
      if (error) throw error;
      setLookupResult(data as unknown as LookupResult);
    } catch (err: any) {
      toast({ title: "Lookup failed", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-3xl">

        {/* No account — application form */}
        {noAccount && !account && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="text-center">
                <ShieldCheck className="h-10 w-10 mx-auto text-primary mb-2" />
                <CardTitle className="text-2xl">Insurance Portal</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Apply for access to driver risk reports. Your application will be reviewed and approved by an admin.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleApply} className="space-y-4 max-w-sm mx-auto">
                  <div>
                    <Label htmlFor="ins-name">Insurance Company Name</Label>
                    <Input
                      id="ins-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="State Farm, GEICO, etc."
                      required
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ins-email">Business Contact Email</Label>
                    <Input
                      id="ins-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="underwriting@company.com"
                      required
                      maxLength={255}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={applying}>
                    {applying ? "Submitting…" : "Apply for Access"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pending approval */}
        {account && !account.approved && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Application Pending</h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Your application for <span className="font-semibold">{account.company_name}</span> is under review.
                  You'll gain access once an administrator approves your account.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Approved — lookup dashboard */}
        {account && account.approved && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Insurance Portal</h1>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {account.company_name}
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 ml-1">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                </Badge>
              </p>
            </div>

            {/* Search */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <form onSubmit={handleLookup} className="flex gap-2">
                  <Input
                    placeholder="Enter plate number to lookup…"
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                    className="font-mono text-lg flex-1"
                    maxLength={8}
                    required
                  />
                  <Button type="submit" disabled={searching} className="gap-1">
                    <Search className="h-4 w-4" />
                    {searching ? "Searching…" : "Lookup"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            {lookupResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-mono text-2xl font-bold">{lookupResult.plate_number}</p>
                        <p className="text-sm text-muted-foreground">Wisconsin License Plate</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${riskColor(lookupResult.risk_score)}`}>
                          {lookupResult.risk_score}
                        </p>
                        <p className={`text-sm font-medium ${riskColor(lookupResult.risk_score)}`}>
                          {riskLabel(lookupResult.risk_score)}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={lookupResult.risk_score}
                      className={`h-2 ${riskProgressColor(lookupResult.risk_score)}`}
                    />

                    <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xl font-bold font-mono">{lookupResult.total_reports}</p>
                        <p className="text-xs text-muted-foreground">Total Reports</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xl font-bold font-mono">{lookupResult.verified_reports}</p>
                        <p className="text-xs text-muted-foreground">Verified</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xl font-bold font-mono">
                          {lookupResult.total_reports > 0
                            ? Math.round((lookupResult.verified_reports / lookupResult.total_reports) * 100)
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Verify Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Report history */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Report History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {lookupResult.infractions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No reports found for this plate.</p>
                    ) : (
                      <div className="space-y-2">
                        {lookupResult.infractions.map((inf) => {
                          const def = INFRACTIONS.find((i) => i.type === inf.infraction);
                          return (
                            <div key={inf.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {def?.label || inf.infraction.replace(/_/g, " ")}
                                  </Badge>
                                  {inf.verified ? (
                                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 gap-0.5">
                                      <CheckCircle2 className="h-3 w-3" /> Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-muted-foreground gap-0.5">
                                      <XCircle className="h-3 w-3" /> Unverified
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {inf.location} · {formatDistanceToNow(new Date(inf.created_at), { addSuffix: true })}
                                  · {inf.upvote_count} upvotes
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InsurancePortal;
