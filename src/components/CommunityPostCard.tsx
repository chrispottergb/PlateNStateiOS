import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface CommunityPost {
  id: string;
  user_id: string;
  body: string;
  plate_tag: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  display_name: string | null;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  display_name: string | null;
}

interface Props {
  post: CommunityPost;
  liked: boolean;
  onLikeToggle: (postId: string, liked: boolean) => void;
  onDelete: (postId: string) => void;
}

export default function CommunityPostCard({ post, liked, onLikeToggle, onDelete }: Props) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initials = (post.display_name ?? "?")[0].toUpperCase();
  const isOwn = user?.id === post.user_id;

  async function loadComments() {
    if (commentsLoaded) return;
    const { data, error } = await supabase
      .from("community_post_comments")
      .select(`
        id, post_id, user_id, parent_id, body, created_at,
        profiles!inner(display_name)
      `)
      .eq("post_id", post.id)
      .is("parent_id", null)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(
        data.map((c: any) => ({
          ...c,
          display_name: c.profiles?.display_name ?? null,
        }))
      );
      setCommentsLoaded(true);
    }
  }

  function toggleComments() {
    if (!showComments) loadComments();
    setShowComments((v) => !v);
  }

  async function handleComment() {
    if (!user) { toast.error("Sign in to comment"); return; }
    const body = newComment.trim();
    if (!body) return;
    if (body.length > 500) { toast.error("Keep it under 500 characters, Tolstoy"); return; }

    setSubmitting(true);
    const { data, error } = await supabase
      .from("community_post_comments")
      .insert({ post_id: post.id, user_id: user.id, body })
      .select(`id, post_id, user_id, parent_id, body, created_at, profiles!inner(display_name)`)
      .single();

    setSubmitting(false);
    if (error) { toast.error("Failed to post comment"); return; }
    setComments((prev) => [
      ...prev,
      { ...(data as any), display_name: (data as any).profiles?.display_name ?? null },
    ]);
    setNewComment("");
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from("community_post_comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleDeletePost() {
    setDeleting(true);
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    setDeleting(false);
    if (error) { toast.error("Couldn't delete post"); return; }
    onDelete(post.id);
    toast.success("Gone. Like it never happened.");
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 space-y-3 transition-colors hover:border-border/60">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{post.display_name ?? "Anonymous"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        {isOwn && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            disabled={deleting}
            onClick={handleDeletePost}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Body */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{post.body}</p>

      {/* Plate tag */}
      {post.plate_tag && (
        <Link
          to={`/plate/${post.plate_tag}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-semibold px-2.5 py-1 hover:bg-primary/20 transition-colors"
        >
          🪪 {post.plate_tag}
        </Link>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-3 gap-1.5 rounded-full text-xs ${
            liked ? "text-rose-500 bg-rose-500/10" : "text-muted-foreground hover:text-rose-500"
          }`}
          onClick={() => {
            if (!user) { toast.error("Sign in to like things"); return; }
            onLikeToggle(post.id, liked);
          }}
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
          <span className="font-mono">{post.like_count}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 gap-1.5 rounded-full text-xs text-muted-foreground hover:text-primary"
          onClick={toggleComments}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="font-mono">{post.comment_count}</span>
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="space-y-3 pt-1 border-t border-border/30">
          {comments.length === 0 && commentsLoaded && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No comments yet. Don't be shy.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5 group">
              <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                  {(c.display_name ?? "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium">{c.display_name ?? "Anonymous"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 mt-0.5 break-words">{c.body}</p>
              </div>
              {user?.id === c.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => handleDeleteComment(c.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {/* Comment input */}
          {user ? (
            <div className="flex gap-2 pt-1">
              <Textarea
                placeholder="Add your take (civility appreciated, but not required)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                rows={1}
                className="text-xs resize-none min-h-[36px] py-2"
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full"
                disabled={!newComment.trim() || submitting}
                onClick={handleComment}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-1">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to join the conversation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
