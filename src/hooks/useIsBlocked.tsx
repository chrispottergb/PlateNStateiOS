import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useIsBlocked() {
  const { user, loading: authLoading } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.email) {
      setBlocked(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("is_email_blocked", { _email: user.email });
      if (cancelled) return;
      setBlocked(!error && data === true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.email, authLoading]);

  return { blocked, loading };
}
