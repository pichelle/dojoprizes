"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleDashed, Clock, Gift, Lightbulb, X as XIcon, type LucideIcon } from "lucide-react";
import type { RequestStatus } from "@/lib/types";
import { coinPriceToBreakdown, breakdownToCoinPrice, type CoinBreakdown } from "@/lib/coins";
import { burstConfetti } from "@/lib/confetti";

const STATUS_META: Record<
  RequestStatus,
  { label: string; bg: string; text: string; icon: LucideIcon }
> = {
  idea: { label: "Idea", bg: "var(--color-idea-bg)", text: "var(--color-idea-text)", icon: Lightbulb },
  pending: { label: "Queue", bg: "var(--color-pending-bg)", text: "var(--color-pending-text)", icon: Clock },
  printed: { label: "Pickup", bg: "var(--color-printed-bg)", text: "var(--color-printed-text)", icon: CircleDashed },
  fulfilled: { label: "Fulfilled", bg: "var(--color-fulfilled-bg)", text: "var(--color-fulfilled-text)", icon: Check },
  cancelled: { label: "Cancelled", bg: "var(--color-cancelled-bg)", text: "var(--color-cancelled-text)", icon: XIcon },
  in_prize_bin: {
    label: "Prize Bin",
    bg: "var(--color-prizebin-bg)",
    text: "var(--color-prizebin-text)",
    icon: Gift,
  },
};

// An idea has no student waiting on it -- once it's printed, it just
// becomes catalog stock, so its menu skips Printed/Fulfilled entirely in
// favor of a single "Prize Bin" step. A real request never shows Prize
// Bin, so the two menus stay unambiguous about what each option means.
const STATUS_ORDER: RequestStatus[] = ["idea", "pending", "printed", "fulfilled", "cancelled"];
const IDEA_STATUS_ORDER: RequestStatus[] = ["idea", "pending", "in_prize_bin", "cancelled"];

// Pure display + picker -- all the optimistic-move / undo / persist logic
// lives in RequestsKanban now, since the card's column placement has to
// react to the pick immediately (not just this pill's own label).
export default function StatusPill({
  status,
  catalogPrice,
  // 3D Print Club prints are always free -- skip the price prompt on the
  // Printed transition entirely when this is set (same rule the kanban
  // board's drag-and-drop path applies).
  isPrintClub = false,
  // True for a request that started life as an idea -- swaps in the
  // Prize Bin path instead of Printed/Fulfilled (see IDEA_STATUS_ORDER).
  originatedAsIdea = false,
  onPick,
}: {
  status: RequestStatus;
  catalogPrice: number | null;
  isPrintClub?: boolean;
  originatedAsIdea?: boolean;
  onPick: (next: RequestStatus, salePrice?: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  // Which status the price prompt is currently confirming for -- both the
  // Printed transition (a real request) and the Prize Bin transition (an
  // idea) ask for a price, but land on different statuses when confirmed.
  const [pendingPriceStatus, setPendingPriceStatus] = useState<RequestStatus | null>(null);
  const [breakdown, setBreakdown] = useState<CoinBreakdown>({ obsidian: 0, gold: 0, silver: 0 });
  // Menu position in viewport coordinates, computed from the trigger
  // button's own bounding box -- the dropdown renders through a portal
  // (see below) rather than as a descendant of this card, so it needs
  // its own fixed position rather than relying on absolute + a
  // positioned ancestor.
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setPendingPriceStatus(null);
    }
    function handleScrollOrResize() {
      setOpen(false);
      setPendingPriceStatus(null);
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  // The initial menuPos guess always opens downward from the trigger. For a
  // card near the bottom of the viewport (e.g. the last card in a kanban
  // column) that pushes the menu off the bottom of the screen -- clipped,
  // with no way to reach options like "Cancelled". Once the menu actually
  // renders, check its real height and flip it to open upward if it
  // overflows the viewport bottom.
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !buttonRef.current) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const overflowBottom = menuRect.bottom - (window.innerHeight - 8);
    if (overflowBottom > 0) {
      const flippedTop = buttonRect.top - menuRect.height - 4;
      setMenuPos((prev) => (prev ? { ...prev, top: Math.max(8, flippedTop) } : prev));
    }
  }, [open, pendingPriceStatus]);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((o) => !o);
  }

  function pick(next: RequestStatus) {
    if (next === "printed") {
      if (isPrintClub) {
        setOpen(false);
        onPick(next, 0);
        return;
      }
      setBreakdown(coinPriceToBreakdown(catalogPrice));
      setPendingPriceStatus(next);
      return;
    }
    // An idea has no student and no print-club perk to skip -- always ask
    // for the price this prize will carry once it's in the catalog.
    if (next === "in_prize_bin") {
      setBreakdown(coinPriceToBreakdown(catalogPrice));
      setPendingPriceStatus(next);
      return;
    }
    setOpen(false);
    // Same celebratory burst as marking a prize sold on the catalog --
    // fulfilled is the equivalent "this is actually done" moment here.
    if (next === "fulfilled" && buttonRef.current) {
      burstConfetti(buttonRef.current);
    }
    onPick(next);
  }

  function confirmPrice() {
    if (!pendingPriceStatus) return;
    setOpen(false);
    const next = pendingPriceStatus;
    setPendingPriceStatus(null);
    if (next === "in_prize_bin" && buttonRef.current) {
      burstConfetti(buttonRef.current);
    }
    onPick(next, breakdownToCoinPrice(breakdown));
  }

  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const menuOrder = originatedAsIdea ? IDEA_STATUS_ORDER : STATUS_ORDER;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="flex items-center leading-none text-xs font-medium rounded-full px-2.5 py-2 hover:brightness-95 transition-[filter]"
        style={{ background: meta.bg, color: meta.text }}
      >
        <span className="flex items-center gap-1">
          <Icon size={13} className="shrink-0" aria-hidden="true" />
          <span>{meta.label}</span>
        </span>
        <ChevronDown size={13} className="shrink-0 ml-[5px] opacity-60" aria-hidden="true" />
      </button>

      {/* Portaled straight to <body> -- a card that's part of a hoverable
          grid (transform on :hover) creates its own stacking context the
          instant a sibling card is hovered, which was momentarily
          shuffling this dropdown behind whatever card the mouse passed
          over. Rendering it outside the card tree entirely sidesteps
          that regardless of sibling hover state. */}
      {open &&
        !pendingPriceStatus &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-50 w-36 bg-card border border-border-warm-strong rounded-md shadow-md p-1.5 flex flex-col gap-1"
          >
            {menuOrder.map((s) => {
              const m = STATUS_META[s];
              const OptIcon = m.icon;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => pick(s)}
                  className="flex items-center gap-1.5 leading-none text-[11px] font-medium rounded-full px-2.5 py-1.5 text-left hover:brightness-95 transition-[filter]"
                  style={{ background: m.bg, color: m.text }}
                >
                  <OptIcon size={12} className="shrink-0" aria-hidden="true" />
                  <span>{m.label}</span>
                  {s === status && <Check size={12} className="ml-auto shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      {open &&
        pendingPriceStatus &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-50 w-56 bg-card border border-border-warm-strong rounded-md shadow-md p-2.5 space-y-2"
          >
            <p className="text-[11px] text-muted">
              {pendingPriceStatus === "in_prize_bin" ? "Price for this prize?" : "Price for this print?"}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["gold", "obsidian"] as const).map((tier) => (
                <div key={tier}>
                  <label className="block text-[10px] text-muted capitalize">{tier}</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={breakdown[tier] || ""}
                    onChange={(e) =>
                      setBreakdown((prev) => ({ ...prev, [tier]: Number(e.target.value) || 0 }))
                    }
                    placeholder="0"
                    className="w-full rounded-md border border-border-warm-strong px-1.5 py-1 text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setPendingPriceStatus(null)}
                className="text-[11px] text-muted hover:text-ink px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPrice}
                className="text-[11px] font-medium rounded-md px-2.5 py-1"
                style={
                  pendingPriceStatus === "in_prize_bin"
                    ? { background: "var(--color-prizebin-bg)", color: "var(--color-prizebin-text)" }
                    : { background: "var(--color-printed-bg)", color: "var(--color-printed-text)" }
                }
              >
                Confirm
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
