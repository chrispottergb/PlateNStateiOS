import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Returns the authenticated user's credit balance.
 * Uses React Query so any number of components calling this hook share
 * a single in-flight request and a single cache entry — no duplicate fetches.
 */
export const useCredits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.credits(user?.id),
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("credits")
        .eq("user_id", user.id)
        .single();
      return data?.credits ?? null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.credits(user?.id) });

  return {
    credits: data ?? null,
    loading: isLoading,
    refetch,
  };
};
