"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";

// Shared mobile-only bottom sheet -- the nav's "More" menu and the Prize
// Bin filter drawer both use this rather than each hand-rolling their own
// overlay/animation/swipe-to-close. Mirrors SidePeek's mount-through-close
// animation pattern (keep rendering frozen content through the slide-down,
// so it doesn't go blank mid-close), just anchored to the bottom edge
// with a swipe-down gesture instead of swipe-right.
const CLOSE_DURATION_MS = 220;

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  swipeToClose = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // Off by default for sheets whose own content needs vertical touch
  // scrolling (e.g. a long filter list) -- with swipe-down-to-close also
  // live on the same surface, a scroll attempt kept getting misread as a
  // dismiss. Leaving this on elsewhere (the nav's "More" menu) is fine
  // since that content doesn't scroll.
  swipeToClose?: boolean;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [frozenChildren, setFrozenChildren] = useState(children);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }

  if (open && frozenChildren !== children) {
    setFrozenChildren(children);
  }

  useEffect(() => {
    if (!closing) return;
    const timeoutId = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CLOSE_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [closing]);

  const { panelRef, style: swipeStyle } = useSwipeDismiss<HTMLDivElement>({
    direction: "down",
    onDismiss: onClose,
    disabled: closing || !swipeToClose,
  });

  if (!mounted) return null;

  return (
    <div className="sm:hidden fixed inset-0 z-40">
      <div
        className={`absolute inset-0 bg-ink/20 ${closing ? "overlay-fade-out" : "overlay-fade-in"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        style={swipeStyle}
        className={`${closing ? "slide-down" : "slide-up"} absolute left-0 right-0 bottom-0 max-h-[80vh] bg-card border-t border-border-warm-strong rounded-t-[24px] shadow-[0_-8px_28px_rgba(58,58,56,0.16)] flex flex-col`}
      >
        {/* Grab handle -- also the clearest hint that this sheet drags,
            for anyone who doesn't discover the swipe on their own. */}
        <div className="shrink-0 pt-2.5 flex justify-center">
          <div className="w-9 h-1 rounded-full bg-border-warm-strong" aria-hidden="true" />
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 pt-1.5 pb-2">
          <span className="font-serif text-lg text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink rounded-full p-1.5 hover:bg-nav"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-warm px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-1">
          {frozenChildren}
        </div>
      </div>
    </div>
  );
}
