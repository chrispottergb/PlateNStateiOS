import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send, Reply, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  display_name?: string;
}

interface CommentThreadProps {
  reportId: string;
}

const CommentThread = ({ reportId }: CommentThreadProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("report_comments")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      // Fetch display names for comment authors
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
      setComments(data.map(c => ({ ...c, display_name: nameMap.get(c.user_id) || "Anonymous" })));
    } else {
      setComments([]);
    }
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (parentId: string | null, text: string) => {
    if (!user) { toast.error("Sign in to comment"); return; }
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) { toast.error("Comment must be 1-500 characters"); return; }

    setSubmitting(true);
    const { error } = await supabase.from("report_comments").insert({
      report_id: reportId,
      user_id: user.id,
      parent_id: parentId,
      content: trimmed,
    });

    if (error) {
      toast.error("Failed to post comment");
    } else {
      if (parentId) { setReplyText(""); setReplyTo(null); }
      else setNewComment("");
      await fetchComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("report_comments").delete().eq("id", commentId);
    if (error) toast.error("Failed to delete");
    else await fetchComments();
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const repliesMap = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {});

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderComment = (comment: Comment, depth: number) => {
    const replies = repliesMap[comment.id] || [];
    const isCollapsed = collapsed.has(comment.id);
    const isOwn = user?.id === comment.user_id;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${depth > 0 ? "ml-4 pl-3 border-l-2 border-primary/10" : ""}`}
      >
        <div className="py-2 group/comment">
          <div className="flex items-start gap-2">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center text-[9px] shrink-0 mt-0.5 ring-1 ring-foreground/5">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-foreground">{comment.display_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-foreground/80 mt-0.5 break-words">{comment.content}</p>
              <div className="flex items-center gap-2 mt-1">
                {user && depth < 3 && (
                  <button
                    onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyText(""); }}
                    className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
                  >
                    <Reply className="h-2.5 w-2.5" /> Reply
                  </button>
                )}
                {isOwn && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-all"
                  >
                    <Trash2 className="h-2.5 w-2.5" /> Delete
                  </button>
                )}
                {replies.length > 0 && (
                  <button
                    onClick={() => toggleCollapse(comment.id)}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                  >
                    {isCollapsed ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />}
                    {replies.length} {replies.length === 1 ? "reply" : "replies"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reply input */}
          <AnimatePresence>
            {replyTo === comment.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-7 mt-2"
              >
                <div className="flex gap-1.5">
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Reply to ${comment.display_name}...`}
                    maxLength={500}
                    className="flex-1 rounded-full px-3 py-1.5 text-xs bg-muted/30 border border-foreground/5 outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(comment.id, replyText); } }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSubmit(comment.id, replyText)}
                    disabled={submitting || !replyText.trim()}
                    className="rounded-full h-7 w-7 p-0"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nested replies */}
        {!isCollapsed && replies.map(r => renderComment(r, depth + 1))}
      </motion.div>
    );
  };

  return (
    <div className="px-4 pb-3 space-y-2">
      {/* Comment input */}
      <div className="flex gap-1.5">
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder={user ? "Add a comment..." : "Sign in to comment"}
          maxLength={500}
          disabled={!user}
          className="flex-1 rounded-full px-3 py-1.5 text-xs bg-muted/30 border border-foreground/5 outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(null, newComment); } }}
        />
        <Button
          size="sm"
          onClick={() => handleSubmit(null, newComment)}
          disabled={submitting || !newComment.trim() || !user}
          className="rounded-full h-7 w-7 p-0"
        >
          <Send className="h-3 w-3" />
        </Button>
      </div>

      {/* Comments list */}
      {loading ? (
        <p className="text-[10px] text-muted-foreground text-center py-2">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-1">No comments yet — be the first!</p>
      ) : (
        <div className="max-h-64 overflow-y-auto scrollbar-hide space-y-0.5">
          {topLevel.map(c => renderComment(c, 0))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
