import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import CommunityPostCard, { CommunityPost } from "@/components/CommunityPostCard";

const PAGE_SIZE = 20;

async function fetchPostPage(pageParam: number): Promise<CommunityPost[]> {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  // PRIVACY-CRITICAL: select profiles.display_name only — never join in auth.users.email
  // or user_metadata. Community feed must surface usernames, not real identities.
  const { data, error } = await supabase
    .from("community_posts")
    .select(`id, user_id, body, plate_tag, like_count, comment_count, created_at, profiles(display_name)`)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    ...p,
    display_name: p.profiles?.display_name ?? null,
  }));
}

export default function CommunityFeed() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [body, setBody] = useState("");
  const [plateTag, setPlateTag] = useState("");
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  // Local overrides for optimistic like/delete on top of query data
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [likeOverrides, setLikeOverrides] = useState<Map<string, number>>(new Map());
  const [newPosts, setNewPosts] = useState<CommunityPost[]>([]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["community-feed"],
    queryFn: ({ pageParam }) => fetchPostPage(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    staleTime: 30_000,
  });

  const allFetched = data?.pages.flat() ?? [];
  const posts = [
    ...newPosts,
    ...allFetched.filter((p) => !newPosts.some((n) => n.id === p.id)),
  ].filter((p) => !deletedIds.has(p.id));

  // Load current user's likes
  useEffect(() => {
    if (!user) return;
    supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setMyLikes(new Set(data.map((r: any) => r.post_id)));
      });
  }, [user]);

  async function handleLikeToggle(postId: string, currentlyLiked: boolean) {
    if (!user) return;
    setMyLikes((prev) => {
      const next = new Set(prev);
      currentlyLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setLikeOverrides((prev) => {
      const base = posts.find((p) => p.id === postId)?.like_count ?? 0;
      return new Map(prev).set(postId, base + (currentlyLiked ? -1 : 1));
    });

    if (currentlyLiked) {
      await supabase.from("community_post_likes").delete().match({ post_id: postId, user_id: user.id });
    } else {
      const { error } = await supabase.from("community_post_likes").insert({ post_id: postId, user_id: user.id });
      if (error) toast.error("Couldn't register your appreciation");
    }
  }

  function handleDelete(postId: string) {
    setDeletedIds((prev) => new Set(prev).add(postId));
    setNewPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  const submitPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("empty");
      if (trimmed.length > 1000) throw new Error("too_long");

      const { data, error } = await supabase
        .from("community_posts")
        .insert({ user_id: user.id, body: trimmed, plate_tag: plateTag.trim().toUpperCase() || null })
        .select(`id, user_id, body, plate_tag, like_count, comment_count, created_at, profiles(display_name)`)
        .single();

      if (error) throw error;
      return { ...(data as any), display_name: (data as any).profiles?.display_name ?? null } as CommunityPost;
    },
    onSuccess: (newPost) => {
      setNewPosts((prev) => [newPost, ...prev]);
      setBody("");
      setPlateTag("");
      toast.success("Posted. The world is now a slightly noisier place.");
    },
    onError: (err: any) => {
      if (err.message === "empty") return;
      if (err.message === "too_long") { toast.error("1000 characters max — brevity is a virtue"); return; }
      if (err.message === "Not signed in") { toast.error("Sign in first"); return; }
      toast.error("Post failed. Try again.");
    },
  });

  return (
    <div className="min-h-screen bg-background pb-nav">
      <Header />
      <main className="container max-w-2xl py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Feed</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share your road rage responsibly. Or irresponsibly. We don't judge.
          </p>
        </div>

        {/* Compose */}
        {user ? (
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <Textarea
              placeholder="Got something to say? Or are you just here to lurk?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              maxLength={1000}
            />
            <div className="flex items-center gap-2">
              <Input
                placeholder="Plate tag (optional)"
                value={plateTag}
                onChange={(e) => setPlateTag(e.target.value.toUpperCase())}
                className="h-8 text-xs font-mono uppercase w-36"
                maxLength={10}
              />
              <span className="text-xs text-muted-foreground flex-1 text-right">
                {body.length}/1000
              </span>
              <Button
                size="sm"
                className="gap-1.5 rounded-full"
                disabled={!body.trim() || submitPost.isPending}
                onClick={() => submitPost.mutate()}
              >
                {submitPost.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Post
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-5 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You're reading but not participating. Classic.
            </p>
            <Link to="/auth">
              <Button size="sm" className="rounded-full">Sign in to post</Button>
            </Link>
          </div>
        )}

        {/* Feed */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 space-y-1">
            <p className="text-muted-foreground text-sm">Nothing here yet.</p>
            <p className="text-xs text-muted-foreground">Someone has to go first — might as well be you.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={{ ...post, like_count: likeOverrides.get(post.id) ?? post.like_count }}
                liked={myLikes.has(post.id)}
                onLikeToggle={handleLikeToggle}
                onDelete={handleDelete}
              />
            ))}
            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
