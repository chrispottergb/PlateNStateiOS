import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, RefreshCw, Download, AlertTriangle, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface PlateUploadSectionProps {
  userId: string;
  accountType: "law_enforcement" | "insurance";
  accountId: string;
}

interface PlateList {
  id: string;
  name: string;
  file_name: string;
  plate_count: number;
  status: string;
  created_at: string;
}

interface UploadedPlate {
  id: string;
  plate_number: string;
  label: string | null;
  total_reports: number;
  verified_reports: number;
  risk_score: number;
}

const riskColor = (score: number) => {
  if (score === 0) return "text-emerald-600";
  if (score <= 20) return "text-amber-500";
  if (score <= 50) return "text-orange-500";
  return "text-destructive";
};

const riskLabel = (score: number) => {
  if (score === 0) return "Clean";
  if (score <= 20) return "Low";
  if (score <= 50) return "Moderate";
  if (score <= 75) return "High";
  return "Severe";
};

const PlateUploadSection = ({ userId, accountType, accountId }: PlateUploadSectionProps) => {
  const { toast } = useToast();
  const [lists, setLists] = useState<PlateList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [plates, setPlates] = useState<UploadedPlate[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [rescanning, setRescanning] = useState(false);

  const fetchLists = useCallback(async () => {
    const { data } = await supabase
      .from("uploaded_plate_lists")
      .select("id, name, file_name, plate_count, status, created_at")
      .eq("user_id", userId)
      .eq("account_type", accountType)
      .order("created_at", { ascending: false });
    if (data) setLists(data as PlateList[]);
  }, [userId, accountType]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  // Poll for processing lists
  useEffect(() => {
    const processing = lists.some((l) => l.status === "processing");
    if (!processing) return;
    const interval = setInterval(fetchLists, 3000);
    return () => clearInterval(interval);
  }, [lists, fetchLists]);

  const fetchPlates = async (listId: string) => {
    setLoading(true);
    setSelectedList(listId);
    const { data } = await supabase
      .from("uploaded_plates")
      .select("id, plate_number, label, total_reports, verified_reports, risk_score")
      .eq("list_id", listId)
      .order("risk_score", { ascending: false });
    if (data) setPlates(data as UploadedPlate[]);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!uploadName.trim()) {
      toast({ title: "Name required", description: "Enter a name for this upload.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage.from("plate-uploads").upload(filePath, file);
      if (uploadErr) throw uploadErr;

      // Create list record
      const { data: listData, error: listErr } = await supabase
        .from("uploaded_plate_lists")
        .insert({
          account_type: accountType,
          account_id: accountId,
          user_id: userId,
          name: uploadName.trim(),
          file_name: fileName,
          status: "processing",
        })
        .select("id")
        .single();
      if (listErr) throw listErr;

      // Trigger processing edge function
      const { error: fnErr } = await supabase.functions.invoke("process-plate-upload", {
        body: { list_id: listData.id },
      });
      if (fnErr) {
        console.error("Edge function error:", fnErr);
      }

      toast({ title: "Upload started!", description: "Your file is being processed." });
      setUploadName("");
      e.target.value = "";
      fetchLists();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRescan = async (listId: string) => {
    setRescanning(true);
    try {
      const { error } = await supabase.rpc("scan_uploaded_plates", { p_list_id: listId } as any);
      if (error) throw error;
      toast({ title: "Re-scan complete", description: "Risk scores have been updated." });
      if (selectedList === listId) fetchPlates(listId);
    } catch (err: any) {
      toast({ title: "Re-scan failed", description: err.message, variant: "destructive" });
    } finally {
      setRescanning(false);
    }
  };

  const handleDelete = async (listId: string) => {
    await supabase.from("uploaded_plate_lists").delete().eq("id", listId);
    if (selectedList === listId) {
      setSelectedList(null);
      setPlates([]);
    }
    fetchLists();
  };

  const exportCSV = () => {
    if (!plates.length) return;
    const header = "Plate Number,Label,Total Reports,Verified Reports,Risk Score,Risk Level\n";
    const rows = plates.map((p) =>
      `${p.plate_number},${p.label || ""},${p.total_reports},${p.verified_reports},${p.risk_score},${riskLabel(p.risk_score)}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plate-screening-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const flaggedCount = plates.filter((p) => p.risk_score > 0).length;
  const distribution = {
    clean: plates.filter((p) => p.risk_score === 0).length,
    low: plates.filter((p) => p.risk_score > 0 && p.risk_score <= 20).length,
    moderate: plates.filter((p) => p.risk_score > 20 && p.risk_score <= 50).length,
    high: plates.filter((p) => p.risk_score > 50 && p.risk_score <= 75).length,
    severe: plates.filter((p) => p.risk_score > 75).length,
  };

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Plate Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="upload-name">Upload Name</Label>
            <Input
              id="upload-name"
              placeholder="e.g. Q1 Fleet Roster, Policy Holders 2026"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div>
            <Label>CSV File</Label>
            <p className="text-xs text-muted-foreground mb-2">
              CSV with columns: plate_number (required), label (optional). Max 5MB.
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading || !uploadName.trim()}
              className="cursor-pointer"
            />
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Uploading and processing…
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload history */}
      {lists.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedList === list.id ? "bg-muted/50" : ""
                  }`}
                  onClick={() => list.status === "complete" && fetchPlates(list.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{list.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {list.plate_count} plates · {formatDistanceToNow(new Date(list.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {list.status === "processing" && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Clock className="h-3 w-3 animate-pulse" /> Processing
                      </Badge>
                    )}
                    {list.status === "complete" && (
                      <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> Complete
                      </Badge>
                    )}
                    {list.status === "error" && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Error
                      </Badge>
                    )}
                    {list.status === "complete" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleRescan(list.id); }}
                        disabled={rescanning}
                        title="Re-scan"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${rescanning ? "animate-spin" : ""}`} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results dashboard */}
      {selectedList && plates.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Summary stats */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xl font-bold font-mono">{plates.length}</p>
                  <p className="text-xs text-muted-foreground">Total Plates</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xl font-bold font-mono text-destructive">{flaggedCount}</p>
                  <p className="text-xs text-muted-foreground">Flagged</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xl font-bold font-mono text-emerald-600">{distribution.clean}</p>
                  <p className="text-xs text-muted-foreground">Clean</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xl font-bold font-mono text-orange-500">{distribution.high + distribution.severe}</p>
                  <p className="text-xs text-muted-foreground">High/Severe</p>
                </div>
              </div>

              {/* Risk distribution bar */}
              <div className="mt-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Risk Distribution</p>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  {plates.length > 0 && (
                    <>
                      <div className="bg-emerald-500" style={{ width: `${(distribution.clean / plates.length) * 100}%` }} />
                      <div className="bg-amber-400" style={{ width: `${(distribution.low / plates.length) * 100}%` }} />
                      <div className="bg-orange-400" style={{ width: `${(distribution.moderate / plates.length) * 100}%` }} />
                      <div className="bg-orange-600" style={{ width: `${(distribution.high / plates.length) * 100}%` }} />
                      <div className="bg-destructive" style={{ width: `${(distribution.severe / plates.length) * 100}%` }} />
                    </>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Clean ({distribution.clean})</span>
                  <span>Low ({distribution.low})</span>
                  <span>Mod ({distribution.moderate})</span>
                  <span>High ({distribution.high})</span>
                  <span>Severe ({distribution.severe})</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flagged plates table */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Screening Results</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-2 font-medium">Plate</th>
                      <th className="text-left px-4 py-2 font-medium">Label</th>
                      <th className="text-center px-4 py-2 font-medium">Reports</th>
                      <th className="text-center px-4 py-2 font-medium">Verified</th>
                      <th className="text-center px-4 py-2 font-medium">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plates.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono font-medium">{p.plate_number}</td>
                        <td className="px-4 py-2 text-muted-foreground">{p.label || "—"}</td>
                        <td className="px-4 py-2 text-center font-mono">{p.total_reports}</td>
                        <td className="px-4 py-2 text-center font-mono">{p.verified_reports}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`font-bold ${riskColor(p.risk_score)}`}>
                            {p.risk_score} <span className="font-normal text-xs">({riskLabel(p.risk_score)})</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {selectedList && !loading && plates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No plates found in this upload.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlateUploadSection;
