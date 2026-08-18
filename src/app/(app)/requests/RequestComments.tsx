"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, SmilePlus, Trash2 } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import type { CommentReaction, RequestComment } from "@/lib/types";
import {
  addRequestComment,
  deleteRequestComment,
  toggleCommentReaction,
  updateRequestComment,
} from "./actions";
import { showToast } from "@/components/ToastHost";
import { useProfiles } from "@/components/ProfileContext";
import ProfileChip from "@/components/ProfileChip";
import ProfileNameField from "@/components/ProfileNameField";
import Tooltip from "@/components/Tooltip";

const LAST_AUTHOR_KEY = "dojoprizes:lastCommentAuthor";
const UNDO_WINDOW_MS = 5000;

// Fast path for the common cases -- clicking one of these skips the full
// picker entirely for the three most-used reactions. The full picker
// (opened via the smiley-plus "More reactions" button) covers everything
// else -- a searchable, categorized emoji grid via emoji-picker-react.
const QUICK_REACTIONS = ["👍", "❤️", "🎉"];

// Maps the app's design-system colors onto emoji-picker-react's CSS custom
// properties so the popover matches the rest of the app instead of the
// library's stock light theme.
const EMOJI_PICKER_THEME_VARS = {
  "--epr-bg-color": "var(--color-card)",
  "--epr-category-label-bg-color": "var(--color-card)",
  "--epr-text-color": "var(--color-ink)",
  "--epr-category-label-text-color": "var(--color-muted)",
  "--epr-picker-border-color": "var(--color-border-warm-strong)",
  "--epr-search-border-color": "var(--color-border-warm-strong)",
  "--epr-search-input-bg-color": "var(--color-nav)",
  "--epr-search-input-bg-color-active": "var(--color-nav)",
  "--epr-search-input-text-color": "var(--color-ink)",
  "--epr-search-input-placeholder-color": "var(--color-muted)",
  "--epr-hover-bg-color": "var(--color-nav-hover)",
  "--epr-focus-bg-color": "var(--color-sage-tint)",
  "--epr-highlight-color": "var(--color-sage)",
  "--epr-category-icon-active-color": "var(--color-sage)",
} as React.CSSProperties;

type ReactionGroup = { emoji: string; count: number; actors: string[]; reactedByMe: boolean };

function groupReactions(reactions: CommentReaction[], myName: string | null): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();
  for (const r of reactions) {
    const g = groups.get(r.emoji) ?? { emoji: r.emoji, count: 0, actors: [], reactedByMe: false };
    g.count += 1;
    g.actors.push(r.actor?.trim() || "Someone");
    if (myName && r.actor?.trim().toLowerCase() === myName.trim().toLowerCase()) {
      g.reactedByMe = true;
    }
    groups.set(r.emoji, g);
  }
  return Array.from(groups.values());
}

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

// Full searchable, categorized emoji picker (emoji-picker-react) for
// anything past the three quick-react options, styled to match the app via
// EMOJI_PICKER_THEME_VARS above.
function EmojiPickerPopover({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-20 top-full right-0 mt-1 rounded-md border border-border-warm-strong shadow-md overflow-hidden"
      style={EMOJI_PICKER_THEME_VARS}
    >
      <EmojiPicker
        theme={Theme.LIGHT}
        onEmojiClick={(data: EmojiClickData) => {
          onPick(data.emoji);
          onClose();
        }}
        autoFocusSearch
        width={300}
        height={360}
        previewConfig={{ showPreview: false }}
      />
    </div>
  );
}

function CommentRow({
  comment,
  onSaved,
  onDeleted,
}: {
  comment: RequestComment;
  onSaved: (comment: RequestComment) => void;
  onDeleted: () => void;
}) {
  const { profiles, activeProfile } = useProfiles();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reactions, setReactions] = useState(comment.reactions ?? []);
  const myName = activeProfile?.name ?? null;

  async function handleReact(emoji: string) {
    const alreadyMine = reactions.some(
      (r) => r.emoji === emoji && (r.actor?.trim().toLowerCase() ?? null) === (myName?.trim().toLowerCase() ?? null),
    );
    // Optimistic toggle -- add/remove immediately, reconcile with the
    // server response after (or roll back on failure).
    const prev = reactions;
    if (alreadyMine) {
      setReactions((rs) =>
        rs.filter(
          (r) =>
            !(r.emoji === emoji && (r.actor?.trim().toLowerCase() ?? null) === (myName?.trim().toLowerCase() ?? null)),
        ),
      );
    } else {
      setReactions((rs) => [
        ...rs,
        { id: `pending-${emoji}-${Date.now()}`, comment_id: comment.id, emoji, actor: myName, created_at: new Date().toISOString() },
      ]);
    }
    try {
      const result = await toggleCommentReaction(comment.id, emoji, myName);
      if (result) {
        // Swap the optimistic placeholder for the real row (real id).
        setReactions((rs) => rs.map((r) => (r.id.startsWith("pending-") && r.emoji === emoji ? result : r)));
      }
    } catch (err) {
      setReactions(prev);
      showToast(err instanceof Error ? err.message : "Couldn't react to that comment");
    }
  }

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

  const groups = groupReactions(reactions, myName);

  return (
    <div className="group relative">
      <div>
        <p className="text-xs flex items-center gap-1">
          <span className="font-bold text-ink">
            <ProfileChip name={comment.author} profiles={profiles} variant="pill" />
          </span>
          <span className="text-muted">· {timeAgo(comment.created_at)}</span>
        </p>
        <p className="text-sm text-ink leading-relaxed mt-1.5 pr-2">{comment.body}</p>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {groups.map((g) => (
              <Tooltip key={g.emoji} label={g.actors.join(", ")}>
                <button
                  type="button"
                  onClick={() => handleReact(g.emoji)}
                  aria-label={`${g.actors.join(", ")} reacted ${g.emoji}`}
                  className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${
                    g.reactedByMe
                      ? "bg-sage-tint border-sage text-ink"
                      : "bg-nav border-border-warm-strong text-ink-soft hover:bg-nav-hover"
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span className="font-medium">{g.count}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
      {/* Floats above the comment instead of sitting inline -- an inline
          toolbar (even hidden via opacity-0) still reserves its own width
          in the flex row, which was quietly narrowing the space left for
          the comment body and making it wrap earlier than it needed to. */}
      <div
        className="absolute -top-3 right-0 z-10 flex items-center gap-2 bg-card border border-border-warm-strong rounded-md shadow-sm px-1.5 py-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-opacity"
      >
        {QUICK_REACTIONS.map((emoji) => (
          <Tooltip key={emoji} label={`React ${emoji}`} align="right">
            <button
              type="button"
              onClick={() => handleReact(emoji)}
              aria-label={`React ${emoji}`}
              className="text-sm hover:scale-110 transition-transform"
            >
              {emoji}
            </button>
          </Tooltip>
        ))}
        <Tooltip label="More reactions" align="right">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              aria-label="More reactions"
              className="text-muted hover:text-ink"
            >
              <SmilePlus size={13} aria-hidden="true" />
            </button>
            {pickerOpen && (
              <EmojiPickerPopover
                onPick={(emoji) => handleReact(emoji)}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        </Tooltip>
        <div className="w-px h-4 bg-border-warm-strong" aria-hidden="true" />
        <Tooltip label="Edit comment" align="right">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit comment"
            className="text-muted hover:text-ink"
          >
            <Pencil size={13} aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip label="Delete comment" align="right">
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete comment"
            className="text-muted hover:text-rust"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </Tooltip>
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
