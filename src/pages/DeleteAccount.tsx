import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Trash2, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

const DeleteAccount = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(user?.email ?? "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("data_deletion_requests").insert({
      email: email.trim().toLowerCase(),
      reason: reason.trim() || null,
      user_id: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit request", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Request received", description: "We'll process your deletion within 30 days." });
  };

  useEffect(() => {
    document.title = "Delete Your Account & Data | Plate'n State";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Request deletion of your Plate'n State account and personal data. Processed within 30 days.");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
            <Trash2 className="h-7 w-7 text-destructive" />
            Delete My Account & Data
          </h1>
          <p className="text-muted-foreground text-sm max-w-prose mx-auto">
            Submit this form to request permanent deletion of your Plate'n State account and all
            personal data we hold about you. Requests are processed within 30 days.
          </p>
        </div>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              What gets deleted
            </CardTitle>
            <CardDescription className="text-xs">
              Your profile, claimed plates, notifications, credit history, badges, comments, and
              any account-linked records. Reports you filed are retained but anonymized
              (your identity is removed) so community moderation history stays intact.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submit a deletion request</CardTitle>
            <CardDescription>
              Use the email address tied to your account so we can verify ownership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="flex flex-col items-center text-center py-6 gap-2">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="font-semibold">Request received</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  We'll email <span className="font-mono">{email}</span> once your data has been
                  deleted. This usually happens within 30 days.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">Account email</label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="reason" className="text-sm font-medium">
                    Reason <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Help us improve — why are you leaving?"
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <Button type="submit" variant="destructive" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Request Account Deletion
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Prefer email? Write to{" "}
                  <a className="underline" href="mailto:privacy@platenstate.app?subject=Account%20Deletion%20Request">
                    privacy@platenstate.app
                  </a>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DeleteAccount;
