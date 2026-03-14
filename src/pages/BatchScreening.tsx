import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Upload, Plus, Search, Trash2, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, Download } from "lucide-react";
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

interface PlateResult {
  plate_number: string;
  total_reports: number;
  verified_reports: number;
  risk_score: number;
  top_infraction: string | null;
  last_reported: string | null;
}

const riskColor = (score: number) => {
  if (score === 0) return "text-emerald-600";
  if (score <= 20) return "text-emerald-600";
  if (score <= 50) return "text-amber-500";
  if (score <= 75) return "text-orange-500";
  return "text-destructive";
};

const riskBg = (score: number) => {
  if (score === 0) return "bg-emerald-500/10";
  if (score <= 20) return "bg-emerald-500/10";
  if (score <= 50) return "bg-amber-500/10";
  if (score <= 75) return "bg-orange-500/10";
  return "bg-destructive/10";
};

const riskLabel = (score: number) => {
  if (score === 0) return "Clean";
  if (score <= 20) return "Low";
  if (score <= 50) return "Moderate";
  if (score <= 75) return "High";
  return "Severe";
};

const BatchScreening = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [plates, setPlates] = useState<string[]>([]);
  const [newPlate, setNewPlate] = useState("");
  const [results, setResults] = useState<PlateResult[] | null>(null);
  const [screening, setScreening] = useState(false);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const addPlate = () => {
    const p = newPlate.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "");
    if (p.length >= 3 && !plates.includes(p)) {
      setPlates((prev) => [...prev, p]);
      setNewPlate("");
    }
  };

  const removePlate = (plate: string) => {
    setPlates((prev) => prev.filter((p) => p !== plate));
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = text
        .split(/[\n,;\t]/)
        .map((s) => s.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/^["']|["']$/g, ""))
        .filter((s) => s.length >= 3);

      const unique = [...new Set([...plates, ...parsed])];
      setPlates(unique.slice(0, 500));
      toast({
        title: `${parsed.length} plates imported`,
        description: `${unique.length} total plates ready for screening`,
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runScreening = async () => {
    if (plates.length === 0) return;
    setScreening(true);
    setResults(null);
    try {
      const { data, error } = await supabase.rpc("batch_plate_screening", {
        p_plates: plates,
      } as any);
      if (error) throw error;
      setResults((data as unknown as PlateResult[]) || []);
    } catch (err: any) {
      toast({ title: "Screening failed", description: err.message, variant: "destructive" });
    } finally {
      setScreening(false);
    }
  };

  const exportCSV = () => {
    if (!results) return;
    const header = "Plate,Risk Score,Total Reports,Verified,Top Infraction,Last Reported";
    const rows = results.map((r) =>
      [
        r.plate_number,
        r.risk_score,
        r.total_reports,
        r.verified_reports,
        r.top_infraction?.replace(/_/g, " ") || "N/A",
        r.last_reported ? new Date(r.last_reported).toLocaleDateString() : "Never",
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plate-screening-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const flaggedCount = results?.filter((r) => r.risk_score > 0).length || 0;
  const highRiskCount = results?.filter((r) => r.risk_score >= 50).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Batch Plate Screening
          </h1>
          <p className="text-sm text-muted-foreground">
            Submit plates manually or upload a CSV to screen for community-reported driving incidents.
          </p>
        </div>

        {/* Input section */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            {/* Manual add */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter plate number…"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPlate())}
                className="font-mono flex-1"
                maxLength={8}
              />
              <Button onClick={addPlate} variant="outline" className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleCSV}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1">
                <Upload className="h-4 w-4" /> CSV
              </Button>
            </div>

            {/* Plate chips */}
            {plates.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{plates.length} plate{plates.length !== 1 ? "s" : ""} queued</p>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setPlates([])}>
                    Clear all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {plates.map((p) => (
                    <Badge key={p} variant="secondary" className="font-mono text-xs gap-1 pr-1">
                      {p}
                      <button onClick={() => removePlate(p)} className="ml-0.5 hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={runScreening} disabled={plates.length === 0 || screening} className="w-full gap-1">
              <Search className="h-4 w-4" />
              {screening ? "Screening…" : `Screen ${plates.length} Plate${plates.length !== 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 gap-3 flex-1">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold font-mono">{results.length}</p>
                    <p className="text-xs text-muted-foreground">Screened</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-amber-500">{flaggedCount}</p>
                    <p className="text-xs text-muted-foreground">Flagged</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-destructive">{highRiskCount}</p>
                    <p className="text-xs text-muted-foreground">High Risk</p>
                  </CardContent>
                </Card>
              </div>
              <Button variant="outline" size="sm" className="ml-3 gap-1" onClick={exportCSV}>
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>

            {/* Results table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium">Plate</th>
                        <th className="text-center px-3 py-2.5 font-medium">Risk</th>
                        <th className="text-center px-3 py-2.5 font-medium">Reports</th>
                        <th className="text-center px-3 py-2.5 font-medium">Verified</th>
                        <th className="text-left px-3 py-2.5 font-medium">Top Infraction</th>
                        <th className="text-right px-4 py-2.5 font-medium">Last Reported</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => {
                        const inf = INFRACTIONS.find((i) => i.type === r.top_infraction);
                        return (
                          <tr key={r.plate_number} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2.5">
                              <Link
                                to={`/plate/${encodeURIComponent(r.plate_number)}`}
                                className="font-mono font-bold text-primary hover:underline"
                              >
                                {r.plate_number}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${riskBg(r.risk_score)} ${riskColor(r.risk_score)}`}>
                                {r.risk_score} — {riskLabel(r.risk_score)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono">{r.total_reports}</td>
                            <td className="px-3 py-2.5 text-center">
                              {r.verified_reports > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> {r.verified_reports}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {inf ? (
                                <Badge variant="secondary" className="text-xs">{inf.label}</Badge>
                              ) : r.top_infraction ? (
                                <span className="text-xs capitalize">{r.top_infraction.replace(/_/g, " ")}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                              {r.last_reported
                                ? formatDistanceToNow(new Date(r.last_reported), { addSuffix: true })
                                : "Never"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BatchScreening;
