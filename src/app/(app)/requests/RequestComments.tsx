"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { RequestComment } from "@/lib/types";
import { addRequestComment, deleteRequestComment, updateRequestComment } from "./actions";
import { showToast } from "@/components/ToastHost";
import { useProfiles } from "@/components/ProfileContext";
import ProfileChip from "@/components/ProfileChip";
import ProfileNameField from "@/components/ProfileNameField";

const LAST_AUTHOR_KEY = "dojoprizes:lastCommentAuthor";
const UNDO_WINDOW_MS = 5000;

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Same primary/plain-link button styling as the rest of the app's forms
// (RequestForm's "Save changes" / "Cancel"), reused here so Post/Save and
// both Cancels don't introduce a one-off button size.
const PRIMARY_BUTTON =
  "rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60";
const PLAIN_CANCEL = "text-sm text-muted hover:text-ink";

function CommentRow({
  comment,
  onSaved,
  onDeleted,
}: {
  comment: RequestComment;
  onSaved: (comment: RequestComment) => void;
  onDeleted: () => void;
}) {
  const { profiles } = useProfiles();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = body.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await updateRequestComment(comment.id, trimmed);
      onSaved({ ...comment, body: trimmed });
      setEditing(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't save comment");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    onDeleted();
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) deleteRequestComment(comment.id).catch(() => {});
    }, UNDO_WINDOW_MS);
    showToast("Comment deleted", {
      onUndo: () => {
        cancelled = true;
        clearTimeout(timeoutId);
        onSaved(comment);
      },
    });
  }

  if (editing) {
    return (
      <div>
        <p className="text-xs flex items-center gap-1">
          <span className="font-bold text-ink">
            <ProfileChip name={comment.author} profiles={profiles} variant="pill" />
          </span>
          <span className="text-muted">· {timeAgo(comment.created_at)}</span>
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="w-full mt-1.5 text-sm px-2.5 py-2 rounded-lg border border-border-warm-strong resize-none"
        />
        <div className="flex items-center justify-end gap-4 mt-1.5">
          <button
            type="button"
            onClick={() => {
              setBody(comment.body);
              setEditing(false);
            }}
            className={PLAIN_CANCEL}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !body.trim()}
            className={PRIMARY_BUTTON}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start justify-between gap-2">
      <div>
        <p className="text-xs flex items-center gap-1">
          <span className="font-bold text-ink">
            <ProfileChip name={comment.author} profiles={profiles} variant="pill" />
          </span>
          <span className="text-muted">· {timeAgo(comment.created_at)}</span>
        </p>
        <p className="text-sm text-ink leading-relaxed mt-1.5">{comment.body}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 pt-px opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit comment"
          className="text-muted hover:text-ink"
        >
          <Pencil size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete comment"
          className="text-muted hover:text-rust"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
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
  const { activeProfile } = useProfiles();
  const [items, setItems] = useState(comments);
  const [composerOpen, setComposerOpen] = useState(false);
  // Whatever was last typed on this device wins (someone may have
  // deliberately overridden it), falling back to the active profile's name
  // so first-time use is already filled in, and finally blank.
  const [author, setAuthor] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem(LAST_AUTHOR_KEY) ?? activeProfile?.name ?? "",
  );
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function replaceComment(next: RequestComment) {
    setItems((prev) => {
      const exists = prev.some((c) => c.id === next.id);
      return exists ? prev.map((c) => (c.id === next.id ? next : c)) : [...prev, next];
    });
  }

  function removeComment(id: string) {
    setItems((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || submitting) return;
    setSubmitting(true);
    try {
      const saved = await addRequestComment(requestId, author.trim() || null, trimmedBody);
      setItems((prev) => [...prev, saved as RequestComment]);
      setBody("");
      setComposerOpen(false);
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
      {items.length > 0 && (
        <div className="flex flex-col gap-4 mb-3">
          {items.map((c) => (
            <CommentRow key={c.id} comment={c} onSaved={replaceComment} onDeleted={() => removeComment(c.id)} />
          ))}
        </div>
      )}

      {!composerOpen ? (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex items-center justify-center gap-1.5 w-full text-sm text-muted hover:text-ink border border-dashed border-border-warm-strong rounded-lg py-2 hover:bg-nav"
        >
          <Plus size={13} aria-hidden="true" />
          Add a comment
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="border-t border-border-warm pt-3">
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="comment-author">
            Your name
          </label>
          <div id="comment-author" className="w-48">
            <ProfileNameField value={author} onChange={setAuthor} />
          </div>
          <label className="block text-sm font-medium text-ink mt-3" htmlFor="comment-body">
            Add a comment
          </label>
          <textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="w-full mt-1 text-sm px-2.5 py-2 rounded-lg border border-border-warm-strong resize-none"
          />
          <div className="flex items-center justify-end gap-4 mt-2">
            <button
              type="button"
              onClick={() => {
                setComposerOpen(false);
                setBody("");
              }}
              className={PLAIN_CANCEL}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting || !body.trim()} className={PRIMARY_BUTTON}>
              Post
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
