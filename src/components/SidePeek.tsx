"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// Shared slide-in-right/slide-out-right panel used by every side peek in
// the app (requests, catalog, filament, checkouts). Keeps the panel
// mounted for the duration of the slide-out animation on close instead of
// yanking it off screen instantly -- the closing state stays in sync with
// the CSS animation durations in globals.css (slide-out-right is 0.26s).
const CLOSE_DURATION_MS = 260;

export default function SidePeek({
  open,
  onClose,
  maxWidth = "max-w-lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  // Keeps rendering whatever content was showing right before close was
  // triggered -- otherwise the parent typically clears its "active" state
  // the instant close fires, and the panel would go blank mid slide-out
  // instead of sliding the content itself away.
  const [frozenChildren, setFrozenChildren] = useState(children);
  const [prevOpen, setPrevOpen] = useState(open);

  // Adjust mount/closing state during render (not in an effect) when the
  // open prop actually changes -- the standard React pattern for
  // deriving state from a prop transition without an extra render pass.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }

  // While genuinely open, keep the frozen snapshot in sync with the
  // latest children (bails out once they match, so this can't loop).
  if (open && frozenChildren !== children) {
    setFrozenChildren(children);
  }

  // The actual unmount-after-animation is a real side effect (a timer),
  // so it belongs in an effect -- but the state updates happen inside the
  // timeout callback, not synchronously in the effect body.
  useEffect(() => {
    if (!closing) return;
    const timeoutId = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CLOSE_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [closing]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className={`absolute inset-0 bg-ink/20 ${closing ? "overlay-fade-out" : "overlay-fade-in"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Flush to the edge on mobile (same as before -- a floating panel
          with margin on all sides gets cramped on a small screen), but
          floats free on sm+: pulled off the edges with margin, rounded
          corners, and a soft shadow, echoing the nav pill's own floating
          treatment rather than sitting flush like a plain drawer. */}
      <div
        className={`${closing ? "slide-out-right" : "slide-in-right"} relative w-full ${maxWidth} h-full sm:h-[calc(100%-2rem)] sm:m-4 bg-card overflow-hidden flex flex-col shadow-xl border-l sm:border border-border-warm sm:rounded-[28px] sm:shadow-[0_8px_28px_rgba(58,58,56,0.16)]`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 bg-card/90 text-muted hover:text-ink rounded-full p-1.5 shadow-sm"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div className="flex-1 overflow-y-auto scroll-warm p-6 space-y-4">{frozenChildren}</div>
      </div>
    </div>
  );
}
