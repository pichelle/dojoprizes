"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { submitFeedback, type FeedbackFormState } from "@/lib/feedbackActions";
import { showToast } from "./ToastHost";
import Select from "./Select";

const BUG_CATEGORIES = [
  { value: "display", label: "Display issue" },
  { value: "broken_action", label: "Something's broken" },
  { value: "data", label: "Data looks wrong" },
  { value: "other", label: "Other" },
];

const DESCRIPTION_MAX = 2000;

const initialState: FeedbackFormState = { error: null };

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<"bug" | "feature">("bug");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [state, formAction, isPending] = useActionState(submitFeedback, initialState);
  const closedRef = useRef(false);

  useEffect(() => {
    if (state?.success && !closedRef.current) {
      closedRef.current = true;
      showToast(type === "bug" ? "Bug report sent" : "Feature request sent");
      onClose();
    }
  }, [state, type, onClose]);

  // Rendered via portal straight to <body> -- this modal is opened from a
  // button inside the sticky sidebar, and position:sticky always creates
  // its own stacking context, which was trapping the modal underneath
  // the main page content instead of on top of it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} aria-hidden="true" />
      <div className="modal-in relative w-full max-w-md bg-card border border-border-warm rounded-xl shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">
            {type === "bug" ? "Report a bug" : "Suggest a feature"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex rounded-md border border-border-warm-strong p-1 bg-nav">
          <button
            type="button"
            onClick={() => setType("bug")}
            className={`flex-1 text-sm font-medium rounded px-3 py-1.5 transition-colors ${
              type === "bug" ? "bg-card text-ink shadow-sm" : "text-muted"
            }`}
          >
            Report a bug
          </button>
          <button
            type="button"
            onClick={() => setType("feature")}
            className={`flex-1 text-sm font-medium rounded px-3 py-1.5 transition-colors ${
              type === "feature" ? "bg-card text-ink shadow-sm" : "text-muted"
            }`}
          >
            Suggest a feature
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="page" value={typeof window !== "undefined" ? window.location.href : ""} />
          <input
            type="hidden"
            name="userAgent"
            value={typeof navigator !== "undefined" ? navigator.userAgent : ""}
          />
          <input
            type="hidden"
            name="screenSize"
            value={typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : ""}
          />

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Name (optional)</label>
            <input
              name="name"
              placeholder="Sensei..."
              className="w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>

          {type === "bug" && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Category <span className="text-rust">*</span>
              </label>
              <Select
                name="category"
                className="w-full"
                placeholder="Select a category"
                options={BUG_CATEGORIES}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              {type === "bug" ? "What happened?" : "What's the idea?"} <span className="text-rust">*</span>
            </label>
            <textarea
              name="description"
              required
              rows={5}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === "bug"
                  ? "What did you expect, and what happened instead?"
                  : "What would this feature let you do?"
              }
              className="w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage resize-none"
            />
            <p className="text-right text-xs text-muted mt-0.5">
              {description.length}/{DESCRIPTION_MAX}
            </p>
          </div>

          {type === "bug" && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Screenshot (optional)</label>
              <input
                type="file"
                name="screenshot"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border-warm-strong file:bg-nav file:px-3 file:py-1.5 file:text-sm file:text-ink file:hover:bg-nav-hover"
              />
              {screenshot && <p className="text-xs text-muted mt-1">{screenshot.name}</p>}
            </div>
          )}

          {state?.error && <p className="text-sm text-rust">{state.error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-warm-strong px-4 py-2 text-sm text-ink hover:bg-nav"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Sending..." : type === "bug" ? "Send report" : "Send idea"}
            </button>
          </div>

          <p className="text-xs text-muted">
            We&apos;ll include your current page, browser, and screen size automatically.
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
}
