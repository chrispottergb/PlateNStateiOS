import { useEffect } from "react";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const BlockedScreen = () => {
  useEffect(() => {
    // Sign the user out immediately so cached session is cleared
    supabase.auth.signOut().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Access revoked</h1>
        <p className="text-sm text-muted-foreground">
          Your account has been blocked from this application. If you believe this is
          a mistake, please contact support.
        </p>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => {
            supabase.auth.signOut().finally(() => {
              window.location.href = "/";
            });
          }}
        >
          Return to sign-in
        </Button>
      </div>
    </div>
  );
};

export default BlockedScreen;
