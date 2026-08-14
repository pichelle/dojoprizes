"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleDashed, Clock, Lightbulb, X as XIcon, type LucideIcon } from "lucide-react";
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
};

const STATUS_ORDER: RequestStatus[] = ["idea", "pending", "printed", "fulfilled", "cancelled"];

// Pure display + picker -- all the optimistic-move / undo / persist logic
// lives in RequestsKanban now, since the card's column placement has to
// react to the pick immediately (not just this pill's own label).
export default function StatusPill({
  status,
  catalogPrice,
  onPick,
}: {
  status: RequestStatus;
  catalogPrice: number | null;
  onPick: (next: RequestStatus, salePrice?: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingPrice, setConfirmingPrice] = useState(false);
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
      setConfirmingPrice(false);
    }
    function handleScrollOrResize() {
      setOpen(false);
      setConfirmingPrice(false);
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

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((o) => !o);
  }

  function pick(next: RequestStatus) {
    if (next === "printed") {
      setBreakdown(coinPriceToBreakdown(catalogPrice));
      setConfirmingPrice(true);
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
    setOpen(false);
    setConfirmingPrice(false);
    onPick("printed", breakdownToCoinPrice(breakdown));
  }

  const meta = STATUS_META[status];
  const Icon = meta.icon;

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
        !confirmingPrice &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-50 w-36 bg-card border border-border-warm-strong rounded-md shadow-md p-1.5 flex flex-col gap-1"
          >
            {STATUS_ORDER.map((s) => {
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
        confirmingPrice &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-50 w-56 bg-card border border-border-warm-strong rounded-md shadow-md p-2.5 space-y-2"
          >
            <p className="text-[11px] text-muted">Price for this print?</p>
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
                onClick={() => setConfirmingPrice(false)}
                className="text-[11px] text-muted hover:text-ink px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPrice}
                className="text-[11px] font-medium rounded-md px-2.5 py-1"
                style={{ background: "var(--color-printed-bg)", color: "var(--color-printed-text)" }}
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
