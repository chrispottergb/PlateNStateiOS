import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the user's home state (2-letter US code) from their profile.
 * Auto-populates `profiles.home_state` from the first paid claimed plate
 * when the profile field is empty. Cached locally for instant access.
 */
export function useHomeState() {
  const { user } = useAuth();
  const [homeState, setHomeState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("home_state");
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("home_state")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profile?.home_state) {
        setHomeState(profile.home_state);
        localStorage.setItem("home_state", profile.home_state);
        return;
      }

      const { data: plates } = await supabase
        .from("claimed_plates")
        .select("state, claimed_at")
        .eq("user_id", user.id)
        .eq("paid", true)
        .order("claimed_at", { ascending: true })
        .limit(1);

      const inferred = plates?.[0]?.state;
      if (inferred && !cancelled) {
        await supabase
          .from("profiles")
          .update({ home_state: inferred })
          .eq("user_id", user.id);
        setHomeState(inferred);
        localStorage.setItem("home_state", inferred);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateHomeState = async (state: string | null) => {
    setHomeState(state);
    if (state) localStorage.setItem("home_state", state);
    else localStorage.removeItem("home_state");
    if (user) {
      await supabase.from("profiles").update({ home_state: state }).eq("user_id", user.id);
    }
  };

  return { homeState, setHomeState: updateHomeState };
}
