import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Search, Check, Building2, Landmark, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import WisconsinPlate from "@/components/WisconsinPlate";

type LETier = "department" | "precinct" | "agency";

interface LEAccount {
  id: string;
  department_name: string;
  badge_number: string | null;
  contact_email: string;
  tier: LETier;
  approved: boolean;
}

const TIER_LABELS: Record<LETier, string> = {
  department: "Department",
  precinct: "Precinct",
  agency: "Agency",
};

interface LETierConfig {
  key: LETier;
  name: string;
  price: string;
  period: string;
  icon: React.ReactNode;
  description: string;
  lookupLimit: number;
  features: string[];
  popular?: boolean;
}

const leTiers: LETierConfig[] = [
  {
    key: "department",
    name: "Department",
    price: "$499",
    period: "/mo",
    icon: <Shield className="h-6 w-6" />,
    description: "For local police departments needing plate lookup access.",
    lookupLimit: 500,
    features: [
      "Up to 500 lookups/mo",
      "Full report history access",
      "Verified report filtering",
      "Location-based search",
      "Email support",
    ],
  },
  {
    key: "precinct",
    name: "Precinct",
    price: "$999",
    period: "/mo",
    icon: <Landmark className="h-6 w-6" />,
    description: "For precincts and county-level law enforcement.",
    lookupLimit: 2500,
    popular: true,
    features: [
      "Up to 2,500 lookups/mo",
      "Full report history access",
      "Verified report filtering",
      "Geofenced area monitoring",
      "Batch plate screening",
      "Risk scoring analytics",
      "Priority support",
    ],
  },
  {
    key: "agency",
    name: "Agency",
    price: "$2,499",
    period: "/mo",
    icon: <Globe className="h-6 w-6" />,
    description: "For state agencies and multi-jurisdiction operations.",
    lookupLimit: 99999,
    features: [
      "Unlimited lookups",
      "Full report history access",
      "Real-time alert feeds",
      "Multi-jurisdiction search",
      "Batch & API access",
      "Custom analytics dashboards",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
];

const LawEnforcement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [account, setAccount] = useState<LEAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<LETier | null>(null);

  // Registration form
  const [deptName, setDeptName] = useState("");
  const [badgeNum, setBadgeNum] = useState("");
  const [email, setEmail] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Lookup
  const [lookupPlate, setLookupPlate] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

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
      .from("law_enforcement_accounts")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setAccount(data as LEAccount);
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;
    setRegLoading(true);
    const { error } = await supabase.from("law_enforcement_accounts").insert({
      user_id: user!.id,
      department_name: deptName.trim(),
      badge_number: badgeNum.trim() || null,
      contact_email: email.trim(),
      tier: selectedTier,
    });
    setRegLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application submitted!", description: "Your account is pending admin approval." });
      fetchAccount();
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPlate.trim()) return;
    setLookupLoading(true);
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .eq("plate_number", lookupPlate.trim().toUpperCase())
      .order("created_at", { ascending: false })
      .limit(50);
    setLookupResult({
      plate: lookupPlate.trim().toUpperCase(),
      reports: reports || [],
      total: reports?.length || 0,
      verified: reports?.filter((r) => r.upvote_count >= 3).length || 0,
    });
    setLookupLoading(false);
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
      <div className="container py-8 max-w-5xl space-y-8">
        {!account ? (
          !selectedTier ? (
            /* Pricing tiers */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Law Enforcement Portal</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Access community-reported driving data to support investigations, traffic enforcement, and public safety initiatives.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {leTiers.map((tier, i) => (
                  <motion.div
                    key={tier.key}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                  >
                    <Card
                      className={cn(
                        "relative flex flex-col h-full transition-all duration-200",
                        tier.popular
                          ? "border-primary shadow-lg shadow-primary/10 scale-[1.03]"
                          : "hover:border-primary/40"
                      )}
                    >
                      {tier.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                          Most Popular
                        </div>
                      )}
                      <CardHeader className="text-center pb-2">
                        <div
                          className={cn(
                            "mx-auto mb-2 h-12 w-12 rounded-xl flex items-center justify-center",
                            tier.popular
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {tier.icon}
                        </div>
                        <CardTitle className="text-xl">{tier.name}</CardTitle>
                        <p className="text-muted-foreground text-sm">{tier.description}</p>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 pt-0">
                        <div className="text-center mb-4">
                          <span className="text-4xl font-black">{tier.price}</span>
                          <span className="text-muted-foreground text-sm">{tier.period}</span>
                        </div>
                        <ul className="space-y-2 mb-6 flex-1">
                          {tier.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full"
                          variant={tier.popular ? "default" : "outline"}
                          onClick={() => setSelectedTier(tier.key)}
                        >
                          Apply Now
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Registration form */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                  <Shield className="h-10 w-10 mx-auto text-primary mb-2" />
                  <CardTitle className="text-2xl">Law Enforcement Application</CardTitle>
                  <Badge variant="secondary" className="mx-auto mt-1">
                    {TIER_LABELS[selectedTier]} Plan
                  </Badge>
                  <p className="text-muted-foreground text-sm mt-2">
                    Submit your credentials for verification. Access requires admin approval.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="dept-name">Department / Agency Name</Label>
                      <Input id="dept-name" value={deptName} onChange={(e) => setDeptName(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="badge-num">Badge Number (optional)</Label>
                      <Input id="badge-num" value={badgeNum} onChange={(e) => setBadgeNum(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="le-email">Official Email</Label>
                      <Input id="le-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedTier(null)}>
                        Back
                      </Button>
                      <Button type="submit" className="flex-1" disabled={regLoading}>
                        {regLoading ? "Submitting…" : "Submit Application"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )
        ) : !account.approved ? (
          /* Pending approval */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="max-w-md mx-auto text-center">
              <CardContent className="pt-8 pb-8 space-y-4">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-bold">Application Pending</h2>
                <p className="text-muted-foreground text-sm">
                  Your {TIER_LABELS[account.tier]} plan application for <strong>{account.department_name}</strong> is under review. You'll gain access once an admin approves it.
                </p>
                <Badge variant="outline">Pending Approval</Badge>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Approved — plate lookup portal */
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  {account.department_name}
                </h1>
                <p className="text-sm text-muted-foreground">{account.contact_email}</p>
              </div>
              <Badge variant="outline" className="gap-1 text-sm py-1 px-3">
                <Shield className="h-3.5 w-3.5" />
                {TIER_LABELS[account.tier]}
              </Badge>
            </div>

            {/* Plate lookup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5" />
                  Plate Lookup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLookup} className="flex gap-2">
                  <Input
                    placeholder="Enter plate number…"
                    value={lookupPlate}
                    onChange={(e) => setLookupPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                    className="font-mono flex-1"
                    maxLength={8}
                    required
                  />
                  <Button type="submit" disabled={lookupLoading}>
                    {lookupLoading ? "Searching…" : "Search"}
                  </Button>
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
                        <p className="text-sm text-muted-foreground">
                          {lookupResult.verified} verified (3+ upvotes)
                        </p>
                      </div>
                    </div>

                    {lookupResult.reports.length > 0 ? (
                      <div className="divide-y divide-border">
                        {lookupResult.reports.map((r: any) => (
                          <div key={r.id} className="py-3 flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium capitalize">{r.infraction.replace(/_/g, " ")}</span>
                              <span className="text-muted-foreground ml-2">— {r.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {r.upvote_count >= 3 && (
                                <Badge variant="default" className="text-xs">Verified</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No reports found for this plate.</p>
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

export default LawEnforcement;
