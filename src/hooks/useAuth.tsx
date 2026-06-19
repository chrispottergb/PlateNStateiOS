import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type PortalMode = "consumer" | "enterprise";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  portalMode: PortalMode | null;
  termsAcceptedAt: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  portalMode: null,
  termsAcceptedAt: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalMode, setPortalMode] = useState<PortalMode | null>(null);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          const msg = String(error.message || "");
          if (/Refresh Token|Auth session missing/i.test(msg)) {
            supabase.auth.signOut({ scope: "local" }).catch(() => {});
          }
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      })
      .catch(() => {
        supabase.auth.signOut({ scope: "local" }).catch(() => {});
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch portal_mode and terms_accepted_at together whenever the user changes
  useEffect(() => {
    if (!user) {
      setPortalMode(null);
      setTermsAcceptedAt(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("portal_mode, terms_accepted_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setPortalMode((data?.portal_mode as PortalMode) ?? "consumer");
        setTermsAcceptedAt(data?.terms_accepted_at ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, portalMode, termsAcceptedAt, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
