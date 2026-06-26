import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Send, Trash2, Loader2, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const POST_MAX = 1000;
const COMMENT_MAX = 500;

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string;
  comment_count: number;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string;
}

// Resolve display names for a set of user ids via the public_profiles view.
async function resolveNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from("public_profiles")
    .select("user_id, display_name")
    .in("user_id", userIds);
  return new Map((data ?? []).map((p) => [p.user_id, p.display_name || "Anonymous"]));
}

const timeAgo = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("community_comments")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const rows = data ?? [];
    const names = await resolveNames([...new Set(rows.map((c) => c.user_id))]);
    setComments(rows.map((c) => ({ ...c, display_name: names.get(c.user_id) || "Anonymous" })));
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchComments();
    // Live updates for this post's comments.
    const channel = supabase
      .channel(`community-comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_comments", filter: `post_id=eq.${postId}` },
        () => fetchComments(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId, fetchComments]);

  const submit = async () => {
    if (!user) { toast.error("Sign in to comment"); return; }
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > COMMENT_MAX) { toast.error(`Comments are limited to ${COMMENT_MAX} characters`); return; }
    setSubmitting(true);
    const { error } = await supabase
      .from("community_comments")
      .insert({ post_id: postId, user_id: user.id, content: trimmed });
    setSubmitting(false);
    if (error) { toast.error("Could not post comment"); return; }
    setText("");
    // Realtime will refresh; refetch immediately for snappy feedback.
    fetchComments();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("community_comments").delete().eq("id", id);
    if (error) { toast.error("Could not delete"); return; }
    fetchComments();
  };

  return (
    <div className="mt-3 border-t border-border/40 pt-3 space-y-3">
      {loading ? (
        <Skeleton className="h-4 w-32" />
      ) : (
        comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2 text-sm">
            <div className="flex-1">
              <span className="font-semibold">{c.display_name}</span>{" "}
              <span className="text-muted-foreground text-xs">{timeAgo(c.created_at)}</span>
              <p className="whitespace-pre-wrap break-words">{c.content}</p>
            </div>
            {user?.id === c.user_id && (
              <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Delete comment">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))
      )}

      {user ? (
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            rows={1}
            maxLength={COMMENT_MAX}
            className="min-h-[38px] resize-none text-sm"
          />
          <Button size="sm" onClick={submit} disabled={submitting || !text.trim()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Link to="/auth" className="underline">Sign in</Link> to join the conversation.
        </p>
      )}
    </div>
  );
}

function PostCard({ post, onDeleted }: { post: Post; onDeleted: (id: string) => void }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);

  const remove = async () => {
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (error) { toast.error("Could not delete post"); return; }
    onDeleted(post.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-xl border border-border/50 bg-card/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold">{post.display_name}</span>{" "}
          <span className="text-muted-foreground text-xs">{timeAgo(post.created_at)}</span>
        </div>
        {user?.id === post.user_id && (
          <button onClick={remove} className="text-muted-foreground hover:text-destructive" aria-label="Delete post">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words">{post.content}</p>

      <button
        onClick={() => setShowComments((s) => !s)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {post.comment_count > 0 ? `${post.comment_count} comment${post.comment_count === 1 ? "" : "s"}` : "Comment"}
      </button>

      <AnimatePresence>{showComments && <CommentSection postId={post.id} />}</AnimatePresence>
    </motion.div>
  );
}

const CommunityFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const fetchFeed = useCallback(async () => {
    const { data: rows } = await supabase
      .from("community_posts")
      .select("id, user_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = rows ?? [];

    const [names, counts] = await Promise.all([
      resolveNames([...new Set(list.map((p) => p.user_id))]),
      Promise.all(
        list.map(async (p) => {
          const { count } = await supabase
            .from("community_comments")
            .select("id", { count: "exact", head: true })
            .eq("post_id", p.id);
          return [p.id, count ?? 0] as const;
        }),
      ),
    ]);
    const countMap = new Map(counts);

    setPosts(
      list.map((p) => ({
        ...p,
        display_name: names.get(p.user_id) || "Anonymous",
        comment_count: countMap.get(p.id) ?? 0,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeed();
    // Live scrolling feed: refresh whenever a post is added/removed.
    const channel = supabase
      .channel("community-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => fetchFeed())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchFeed]);

  const post = async () => {
    if (!user) { toast.error("Sign in to post"); return; }
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > POST_MAX) { toast.error(`Posts are limited to ${POST_MAX} characters`); return; }
    setPosting(true);
    const { error } = await supabase
      .from("community_posts")
      .insert({ user_id: user.id, content: trimmed });
    setPosting(false);
    if (error) { toast.error("Could not post"); return; }
    setDraft("");
    fetchFeed();
  };

  const onDeleted = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 space-y-5">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Radio className="h-5 w-5 text-primary" />
            Community
          </h1>
          <p className="text-sm text-muted-foreground">
            A live sounding board — share what's on your mind and weigh in on others.
          </p>
        </div>

        {/* Composer */}
        {user ? (
          <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
            <Textarea
              ref={composerRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What's happening out there?"
              rows={3}
              maxLength={POST_MAX}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{draft.length}/{POST_MAX}</span>
              <Button onClick={post} disabled={posting || !draft.trim()}>
                {posting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                Post
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/60 p-4 text-sm text-muted-foreground">
            <Link to="/auth" className="font-semibold text-foreground underline">Sign in</Link> to post and join the conversation.
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No posts yet — be the first to start the conversation.
          </p>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onDeleted={onDeleted} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default CommunityFeed;
