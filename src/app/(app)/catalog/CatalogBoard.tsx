"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Filament, FranchiseTag, Prize } from "@/lib/types";
import PrizeCard from "./PrizeCard";
import CatalogFilterBar from "./CatalogFilterBar";
import ActiveFilters from "./ActiveFilters";
import PrizeForm from "./PrizeForm";
import ActionButton from "@/components/ActionButton";
import EmptyStateMascot from "@/components/EmptyStateMascot";
import { staggerDelay } from "@/lib/stagger";
import SidePeek from "@/components/SidePeek";
import { updatePrizeInline, deletePrize } from "./actions";

type CheckoutsByPrize = Record<string, string>;

export default function CatalogBoard({
  prizes,
  allFilaments,
  allFranchiseTags,
  latestCheckoutByPrize,
  onCheckout,
  filtersActive,
}: {
  prizes: Prize[];
  allFilaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  latestCheckoutByPrize: CheckoutsByPrize;
  onCheckout: (prizeId: string, boughtBy: string | null) => Promise<void>;
  // See RequestsKanban for why this matters: a theme/color/size/status
  // filter narrowing prizes to zero is not the same as the catalog
  // genuinely being empty, and only the latter should get the
  // "add your first prize" invitational mascot treatment.
  filtersActive: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | { id: string }>(null);
  // Same optimistic-hide pattern as Requests: instant removal on delete,
  // restored if Undo is clicked, actually gone once the undo window
  // elapses and prizes stops including it anyway.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const visiblePrizes = prizes.filter((p) => !pendingDeleteIds.has(p.id));

  // Derived from the current `prizes` prop by id (not stored directly) so
  // that after a delete + router.refresh(), the prize disappearing from
  // this list automatically closes the peek instead of showing stale data.
  const active = mode ? prizes.find((p) => p.id === mode.id) ?? null : null;
  const open = Boolean(active);

  function close() {
    setMode(null);
  }

  function hideForDelete(id: string) {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
  }

  function restoreFromDelete(id: string) {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const inStockPrizes = visiblePrizes.filter((p) => p.status === "in_stock");
  const printOnRequestPrizes = visiblePrizes.filter((p) => p.status !== "in_stock");

  function renderCard(prize: Prize, index: number) {
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
        staggerDelay={staggerDelay(index)}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CatalogFilterBar />
        <Link
          href="/catalog/new"
          className="flex items-center gap-1.5 rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90 shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          Add a prize
        </Link>
      </div>

      <ActiveFilters colorOptions={allFilaments} />

      {/* In stock first, then a divider, then Print-on-request -- each
          group keeps whatever secondary sort (name/price) was picked. */}
      {inStockPrizes.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inStockPrizes.map((prize, i) => renderCard(prize, i))}
        </div>
      )}

      {inStockPrizes.length > 0 && printOnRequestPrizes.length > 0 && (
        <div className="flex items-center gap-3 mt-8 mb-2">
          <div className="h-px flex-1 bg-border-warm" />
          <p className="text-xs font-medium text-muted uppercase tracking-wide shrink-0">
            Print-on-request
          </p>
          <div className="h-px flex-1 bg-border-warm" />
        </div>
      )}

      {printOnRequestPrizes.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {printOnRequestPrizes.map((prize, i) => renderCard(prize, i))}
        </div>
      )}

      {prizes.length === 0 && !filtersActive && (
        <EmptyStateMascot
          pose="sparkle"
          message="the shelf's bare for now. add your first prize to get started."
        />
      )}
      {prizes.length === 0 && filtersActive && (
        <p className="text-sm text-muted">Nothing matches those filters.</p>
      )}

      <SidePeek open={open} onClose={close}>
        <h2 className="font-serif text-xl text-ink pr-8">Edit prize</h2>

        {active && (
          <>
            <PrizeForm
              key={active.id}
              action={updatePrizeInline.bind(null, active.id)}
              initial={active}
              allFilaments={allFilaments}
              linkedFilamentIds={(active.filaments ?? []).map((f) => f.id)}
              allFranchiseTags={allFranchiseTags}
              initialFranchiseTags={(active.franchiseTags ?? []).map((t) => t.name)}
              submitLabel="Save changes"
              onCancel={close}
              onSuccess={() => {
                close();
                router.refresh();
              }}
            />

            <ActionButton
              action={deletePrize.bind(null, active.id)}
              toastMessage="Prize deleted"
              confirmMessage={`Delete ${active.name}? This can't be undone.`}
              onStart={() => {
                close();
                hideForDelete(active.id);
              }}
              onUndo={() => restoreFromDelete(active.id)}
              className="text-sm text-rust hover:underline"
            >
              Delete this prize
            </ActionButton>
          </>
        )}
      </SidePeek>
    </>
  );
}
