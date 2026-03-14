import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", user.id)
      .single();
    setCredits(data?.credits ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchCredits();
  }, [user]);

  return { credits, loading, refetch: fetchCredits };
};
