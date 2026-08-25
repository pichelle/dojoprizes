"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Shared swipe-to-dismiss gesture for the side peek (swipe right) and every
// bottom sheet (swipe down -- the "More" nav menu, the Prize Bin filter
// drawer). Purely additive: whatever already closes the panel (the X
// button, tapping the overlay) keeps working exactly as before, this just
// adds a second way in for a thumb that finds dragging more natural.
//
// The tricky part isn't the drag math, it's telling a real swipe apart
// from two other gestures that share the same touch surface:
//   - side peek: a swipe right vs. the user scrolling the peek's own
//     content up/down.
//   - bottom sheet: a swipe down vs. a tap on one of the sheet's own rows
//     (MakerWorld, log out, a filter option...).
// Both are solved the same way -- nothing commits to being "a swipe"
// until the finger has moved far enough, in a direction that actually
// matches this panel's dismiss axis, and until then movement is left
// alone (so a vertical scroll or a plain tap never gets hijacked).
//
// Listeners are attached natively (not via React's onTouch* props) on
// purpose: React registers its synthetic touchmove handler as a passive
// listener, which means `preventDefault()` inside it is silently ignored
// (and logs a console warning) -- and preventDefault is exactly what
// stops the page/content underneath from scrolling along with a
// committed drag. A plain `addEventListener(..., { passive: false })`
// doesn't have that limitation.
type Direction = "right" | "down";

const AXIS_LOCK_PX = 8; // movement needed before deciding swipe vs. scroll/tap
const COMMIT_RATIO = 0.35; // drag past 35% of the panel's size -> auto-close
const COMMIT_VELOCITY_PX_MS = 0.55; // or a fast-enough flick, regardless of distance

export function useSwipeDismiss<T extends HTMLElement>({
  direction,
  onDismiss,
  disabled = false,
}: {
  direction: Direction;
  onDismiss: () => void;
  disabled?: boolean;
}) {
  // A state-backed ref (not a plain useRef) so the effect below re-runs
  // and re-binds listeners whenever the underlying DOM node itself
  // changes -- e.g. the panel unmounts and remounts on a later open,
  // which a plain ref object wouldn't notify us about.
  const [node, setNode] = useState<T | null>(null);
  const panelRef = useCallback((n: T | null) => setNode(n), []);

  const [offset, setOffsetState] = useState(0);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);

  const onDismissRef = useRef(onDismiss);
  // Refs are for use outside render (event handlers, effects) -- keep this
  // one current via its own effect rather than writing it during render.
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!node || disabled) return;

    const gesture: { startX: number; startY: number; startTime: number; axis: "swipe" | "reject" | null } = {
      startX: 0,
      startY: 0,
      startTime: 0,
      axis: null,
    };

    function setOffset(v: number) {
      offsetRef.current = v;
      setOffsetState(v);
    }

    function reset() {
      gesture.axis = null;
      setDragging(false);
      setOffset(0);
    }

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      gesture.startX = t.clientX;
      gesture.startY = t.clientY;
      gesture.startTime = Date.now();
      gesture.axis = null;
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      const dx = t.clientX - gesture.startX;
      const dy = t.clientY - gesture.startY;

      if (gesture.axis === null) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        const movedMostlyHorizontal = Math.abs(dx) > Math.abs(dy);
        const matches = direction === "right" ? movedMostlyHorizontal : !movedMostlyHorizontal;
        gesture.axis = matches ? "swipe" : "reject";
      }
      if (gesture.axis !== "swipe") return;

      const delta = direction === "right" ? dx : dy;
      if (delta <= 0) {
        setDragging(true);
        setOffset(0);
        return;
      }
      e.preventDefault();
      setDragging(true);
      setOffset(delta);
    }

    function onTouchEnd() {
      const wasSwipe = gesture.axis === "swipe";
      const elapsed = Math.max(1, Date.now() - gesture.startTime);
      const velocity = offsetRef.current / elapsed;
      const panelSize = direction === "right" ? node!.offsetWidth : node!.offsetHeight;
      const commitByDistance = panelSize > 0 && offsetRef.current > panelSize * COMMIT_RATIO;
      const commitByFlick = velocity > COMMIT_VELOCITY_PX_MS;

      if (wasSwipe && (commitByDistance || commitByFlick)) {
        reset();
        onDismissRef.current();
        return;
      }
      // Below threshold -- snap back. `offset` drops to 0 and `dragging`
      // to false here, so the panel's own CSS transition class (the same
      // one used for open/close) takes over for the snap animation.
      reset();
    }

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", reset);
      // Clears any in-progress drag's visual offset when this active
      // session ends (node/disabled changes, or unmount) -- runs in the
      // cleanup, not synchronously in the effect body, so a stale
      // transform can't linger into the panel's own close animation.
      setDragging(false);
      offsetRef.current = 0;
      setOffsetState(0);
    };
  }, [node, direction, disabled]);

  return {
    panelRef,
    dragging,
    offset,
    style: dragging
      ? {
          transform: direction === "right" ? `translateX(${offset}px)` : `translateY(${offset}px)`,
          transition: "none",
        }
      : undefined,
  };
}
