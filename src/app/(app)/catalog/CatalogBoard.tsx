"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { Filament, FranchiseTag, Prize } from "@/lib/types";
import PrizeCard from "./PrizeCard";
import CatalogFilterBar from "./CatalogFilterBar";
import ActiveFilters from "./ActiveFilters";
import PrizeForm from "./PrizeForm";
import ActionButton from "@/components/ActionButton";
import { createPrizeInline, updatePrizeInline, deletePrize } from "./actions";

type CheckoutsByPrize = Record<string, string>;

export default function CatalogBoard({
  prizes,
  allFilaments,
  allFranchiseTags,
  latestCheckoutByPrize,
  onCheckout,
}: {
  prizes: Prize[];
  allFilaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  latestCheckoutByPrize: CheckoutsByPrize;
  onCheckout: (prizeId: string, boughtBy: string | null) => Promise<void>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "new" | { id: string }>(null);

  // Derived from the current `prizes` prop by id (not stored directly) so
  // that after a delete + router.refresh(), the prize disappearing from
  // this list automatically closes the peek instead of showing stale data.
  const active =
    mode && typeof mode === "object" ? prizes.find((p) => p.id === mode.id) ?? null : null;
  const isCreating = mode === "new";
  const open = isCreating || Boolean(active);

  function close() {
    setMode(null);
  }

  const inStockPrizes = prizes.filter((p) => p.status === "in_stock");
  const printOnRequestPrizes = prizes.filter((p) => p.status !== "in_stock");

  function renderCard(prize: Prize) {
    return (
      <PrizeCard
        key={prize.id}
        prize={prize}
        onCheckout={onCheckout}
        onEdit={() => setMode({ id: prize.id })}
        addedOrSoldDate={
          prize.stock_count === 0 ? latestCheckoutByPrize[prize.id] : prize.created_at
        }
        soldDateKnown={prize.stock_count === 0 && Boolean(latestCheckoutByPrize[prize.id])}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMode("new")}
          className="flex items-center gap-1.5 rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90 shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          Add a prize
        </button>
        <CatalogFilterBar />
      </div>

      <ActiveFilters colorOptions={allFilaments} />

      {/* In stock first, then a divider, then Print-on-request -- each
          group keeps whatever secondary sort (name/price) was picked. */}
      {inStockPrizes.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inStockPrizes.map((prize) => renderCard(prize))}
        </div>
      )}

      {inStockPrizes.length > 0 && printOnRequestPrizes.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border-warm" />
          <p className="text-xs font-medium text-muted uppercase tracking-wide shrink-0">
            Print-on-request
          </p>
          <div className="h-px flex-1 bg-border-warm" />
        </div>
      )}

      {printOnRequestPrizes.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {printOnRequestPrizes.map((prize) => renderCard(prize))}
        </div>
      )}

      {prizes.length === 0 && (
        <p className="text-sm text-muted">
          Nothing here yet. Add your first prize to get started.
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-ink/20"
            onClick={close}
            aria-hidden="true"
          />
          <div className="slide-in-right relative w-full max-w-lg bg-card h-full overflow-y-auto shadow-xl border-l border-border-warm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-ink">
                {isCreating ? "Add a prize" : "Edit prize"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-muted hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <PrizeForm
              key={isCreating ? "new" : active!.id}
              action={
                isCreating ? createPrizeInline : updatePrizeInline.bind(null, active!.id)
              }
              initial={isCreating ? undefined : active!}
              allFilaments={allFilaments}
              linkedFilamentIds={
                isCreating ? [] : (active!.filaments ?? []).map((f) => f.id)
              }
              allFranchiseTags={allFranchiseTags}
              initialFranchiseTags={
                isCreating ? [] : (active!.franchiseTags ?? []).map((t) => t.name)
              }
              submitLabel={isCreating ? "Add prize" : "Save changes"}
              onCancel={close}
              onSuccess={() => {
                close();
                router.refresh();
              }}
            />

            {!isCreating && (
              <ActionButton
                action={deletePrize.bind(null, active!.id)}
                toastMessage="Prize deleted"
                confirmMessage={`Delete ${active!.name}? This can't be undone.`}
                className="text-sm text-rust hover:underline"
              >
                Delete this prize
              </ActionButton>
            )}
          </div>
        </div>
      )}
    </>
  );
}
