"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, X as XIcon, type LucideIcon } from "lucide-react";
import type { RequestStatus } from "@/lib/types";
import { showToast } from "@/components/ToastHost";

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

// Same undo grace period as delete (ActionButton) -- the actual server
// update is delayed rather than fired immediately, so Undo on the toast
// can cancel it. Since the pill shows the new value optimistically the
// moment it's picked, undoing also has to revert the displayed value, not
// just cancel the pending request -- that's why this holds its own local
// state instead of just using the `status` prop directly.
const UNDO_WINDOW_MS = 5000;

export default function StatusPill({
  requestId,
  status,
  catalogPrice,
  onChange,
}: {
  requestId: string;
  status: RequestStatus;
  catalogPrice: number | null;
  onChange: (requestId: string, status: RequestStatus, salePrice?: number | null) => Promise<void>;
}) {
  const [displayed, setDisplayed] = useState<RequestStatus>(status);
  const [open, setOpen] = useState(false);
  const [confirmingPrice, setConfirmingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  function commit(next: RequestStatus, salePrice?: number | null) {
    const previous = displayed;
    setDisplayed(next);
    setOpen(false);
    setConfirmingPrice(false);

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      startTransition(async () => {
        await onChange(requestId, next, salePrice);
        router.refresh();
      });
    }, UNDO_WINDOW_MS);

    showToast("Status updated", {
      onUndo: () => {
        cancelled = true;
        clearTimeout(timeoutId);
        setDisplayed(previous);
      },
    });
  }

  function pick(next: RequestStatus) {
    if (next === "fulfilled") {
      setPriceInput(catalogPrice != null ? String(catalogPrice) : "");
      setConfirmingPrice(true);
      return;
    }
    commit(next);
  }

  const meta = STATUS_META[displayed];
  const Icon = meta.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 disabled:opacity-60"
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
                {s === displayed && <Check size={12} className="ml-auto" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {open && confirmingPrice && (
        <div className="absolute right-0 z-20 mt-1 w-48 bg-card border border-border-warm-strong rounded-md shadow-md p-2.5 space-y-2">
          <p className="text-[11px] text-muted">Sold for how much?</p>
          <input
            type="number"
            step="0.01"
            autoFocus
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-border-warm-strong px-2 py-1 text-xs"
          />
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
              onClick={() =>
                commit("fulfilled", priceInput.trim() === "" ? null : Number(priceInput))
              }
              className="text-[11px] font-medium rounded-md px-2.5 py-1"
              style={{ background: "var(--color-fulfilled-bg)", color: "var(--color-fulfilled-text)" }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
