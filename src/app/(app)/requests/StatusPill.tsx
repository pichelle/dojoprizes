"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Loader2, X as XIcon, type LucideIcon } from "lucide-react";
import type { RequestStatus } from "@/lib/types";
import { coinPriceToBreakdown, breakdownToCoinPrice, type CoinBreakdown } from "@/lib/coins";

const STATUS_META: Record<
  RequestStatus,
  { label: string; bg: string; text: string; icon: LucideIcon }
> = {
  pending: { label: "Pending", bg: "var(--color-pending-bg)", text: "var(--color-pending-text)", icon: Clock },
  printed: { label: "Printed", bg: "var(--color-printed-bg)", text: "var(--color-printed-text)", icon: Loader2 },
  fulfilled: { label: "Fulfilled", bg: "var(--color-fulfilled-bg)", text: "var(--color-fulfilled-text)", icon: Check },
  cancelled: { label: "Cancelled", bg: "var(--color-cancelled-bg)", text: "var(--color-cancelled-text)", icon: XIcon },
};

const STATUS_ORDER: RequestStatus[] = ["pending", "printed", "fulfilled", "cancelled"];

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmingPrice(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pick(next: RequestStatus) {
    if (next === "printed") {
      setBreakdown(coinPriceToBreakdown(catalogPrice));
      setConfirmingPrice(true);
      return;
    }
    setOpen(false);
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1"
        style={{ background: meta.bg, color: meta.text }}
      >
        <Icon size={12} aria-hidden="true" />
        {meta.label}
      </button>

      {open && !confirmingPrice && (
        <div className="absolute right-0 z-20 mt-1 w-36 bg-card border border-border-warm-strong rounded-md shadow-md p-1.5 flex flex-col gap-1">
          {STATUS_ORDER.map((s) => {
            const m = STATUS_META[s];
            const OptIcon = m.icon;
            return (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                className="flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 text-left hover:opacity-80"
                style={{ background: m.bg, color: m.text }}
              >
                <OptIcon size={12} aria-hidden="true" />
                {m.label}
                {s === status && <Check size={12} className="ml-auto" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {open && confirmingPrice && (
        <div className="absolute right-0 z-20 mt-1 w-56 bg-card border border-border-warm-strong rounded-md shadow-md p-2.5 space-y-2">
          <p className="text-[11px] text-muted">Price for this print?</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(["silver", "gold", "obsidian"] as const).map((tier) => (
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
        </div>
      )}
    </div>
  );
}
