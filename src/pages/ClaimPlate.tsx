import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Car, CheckCircle, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const ClaimPlate = () => {
  const { user } = useAuth();
  const [plateNumber, setPlateNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: claimedPlates, refetch } = useQuery({
    queryKey: ["my-claimed-plates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("claimed_plates")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !plateNumber.trim()) return;
    setLoading(true);

    try {
      const formatted = plateNumber.trim().toUpperCase();
      const { error } = await supabase.from("claimed_plates").insert({
        user_id: user.id,
        plate_number: formatted,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Plate already claimed",
            description: "This plate number has already been claimed by someone.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Plate claimed!", description: `${formatted} is now linked to your account.` });
        setPlateNumber("");
        refetch();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUnclaim = async (id: string) => {
    const { error } = await supabase.from("claimed_plates").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plate removed" });
      refetch();
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-lg py-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center gap-2 text-primary">
                <Car className="h-6 w-6" />
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">Claim Your Plate</CardTitle>
              <CardDescription>
                Link your license plate to your account. See reports filed against your plate and track your driving reputation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClaim} className="flex gap-2">
                <Input
                  value={plateNumber}
                  onChange={e => setPlateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                  placeholder="ABC 1234"
                  className="font-mono text-lg tracking-wider"
                  maxLength={8}
                  required
                />
                <Button type="submit" disabled={loading || plateNumber.trim().length < 3}>
                  {loading ? "..." : "Claim"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {claimedPlates && claimedPlates.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <h3 className="text-lg font-semibold mb-3">Your Plates</h3>
            <div className="space-y-2">
              {claimedPlates.map(plate => (
                <Card key={plate.id} className="border-0 shadow-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-mono text-lg font-bold tracking-wider">
                        {plate.plate_number}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnclaim(plate.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClaimPlate;
