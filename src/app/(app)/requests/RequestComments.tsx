"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { RequestComment } from "@/lib/types";
import { addRequestComment } from "./actions";
import { showToast } from "@/components/ToastHost";

const LAST_AUTHOR_KEY = "dojoprizes:lastCommentAuthor";

function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// No login system, so the author is whatever name gets typed in -- the
// field just remembers the last name used on this device (localStorage)
// so the same sensei isn't retyping it every time.
export default function RequestComments({
  requestId,
  comments,
}: {
  requestId: string;
  comments: RequestComment[];
}) {
  const [items, setItems] = useState(comments);
  const [author, setAuthor] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(LAST_AUTHOR_KEY) ?? "",
  );
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || submitting) return;
    setSubmitting(true);
    try {
      const saved = await addRequestComment(requestId, author.trim() || null, trimmedBody);
      setItems((prev) => [...prev, saved as RequestComment]);
      setBody("");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_AUTHOR_KEY, author.trim());
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink mb-3">
        <MessageCircle size={15} className="text-muted" aria-hidden="true" />
        Comments
        {items.length > 0 && <span className="text-muted font-medium">{items.length}</span>}
      </p>

      {items.length > 0 && (
        <div className="flex flex-col gap-3 mb-3">
          {items.map((c) => (
            <div key={c.id}>
              <p className="text-xs">
                <span className="font-bold text-ink">{c.author || "Anonymous"}</span>{" "}
                <span className="text-muted">· {daysAgo(c.created_at)}</span>
              </p>
              <p className="text-sm text-ink leading-relaxed mt-0.5">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 items-start border-t border-border-warm pt-3"
      >
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="sensei name"
          aria-label="Your name"
          className="w-24 shrink-0 text-xs px-2 py-2 rounded-lg border border-border-warm-strong"
        />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment"
          aria-label="Comment"
          className="flex-1 min-w-0 text-sm px-2.5 py-2 rounded-lg border border-border-warm-strong"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="shrink-0 bg-ink text-page rounded-lg px-3 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  );
}
