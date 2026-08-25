"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Coins,
  Copy,
  ExternalLink,
  Package,
  Palette,
  Pencil,
  Plus,
  Printer,
  Ruler,
  StickyNote,
  Tags,
  Trash2,
} from "lucide-react";
import type { Filament, FranchiseTag, Prize } from "@/lib/types";
import PrizeCard from "./PrizeCard";
import CatalogFilterBar from "./CatalogFilterBar";
import ActiveFilters from "./ActiveFilters";
import PrizeForm from "./PrizeForm";
import PrizeComments from "./PrizeComments";
import PrizeActivity from "./PrizeActivity";
import ActionButton from "@/components/ActionButton";
import EmptyStateMascot from "@/components/EmptyStateMascot";
import ImageWithFallback from "@/components/ImageWithFallback";
import DetailRow from "@/components/DetailRow";
import PeekTabs from "@/components/PeekTabs";
import { staggerDelay } from "@/lib/stagger";
import SidePeek from "@/components/SidePeek";
import { coinPriceToBreakdown } from "@/lib/coins";
import { formatSize } from "@/lib/requestFormatting";
import { showToast } from "@/components/ToastHost";
import { useProfiles } from "@/components/ProfileContext";
import { updatePrizeInline, deletePrize, duplicatePrize, logPrizeReprint } from "./actions";

// Obsidian/Gold have dedicated coin icons; Silver stays plain text -- same
// treatment as PrizeCard's price display.
const COIN_ICONS: Record<"obsidian" | "gold", string> = {
  obsidian: "/icons/coin-obsidian.png",
  gold: "/icons/coin-gold.png",
};

function PriceBreakdown({ coinPrice }: { coinPrice: number | null }) {
  const b = coinPriceToBreakdown(coinPrice);
  const hasPrice = b.obsidian > 0 || b.gold > 0 || b.silver > 0;
  if (!hasPrice) return <span className="text-muted">No price set</span>;
  return (
    <span className="flex items-center gap-2.5">
      {b.obsidian > 0 && (
        <span className="flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COIN_ICONS.obsidian} alt="Obsidian" className="w-5 h-5 object-contain" />
          <span className="font-medium">{b.obsidian}</span>
        </span>
      )}
      {b.gold > 0 && (
        <span className="flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COIN_ICONS.gold} alt="Gold" className="w-5 h-5 object-contain" />
          <span className="font-medium">{b.gold}</span>
        </span>
      )}
      {b.silver > 0 && <span className="font-medium">{b.silver} Silver</span>}
    </span>
  );
}

type CheckoutsByPrize = Record<string, string>;
type PeekMode = "view" | "edit";

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
  const { activeProfile } = useProfiles();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [peekMode, setPeekMode] = useState<PeekMode>("view");
  const [peekTab, setPeekTab] = useState<"comments" | "activity">("comments");
  const [loggingReprint, setLoggingReprint] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  // Set right after a duplicate is created, since the new prize doesn't
  // exist in the `prizes` prop yet -- the effect below opens its edit view
  // as soon as router.refresh() brings it in, instead of trying to guess
  // when that's happened.
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  // Same optimistic-hide pattern as Requests: instant removal on delete,
  // restored if Undo is clicked, actually gone once the undo window
  // elapses and prizes stops including it anyway.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const visiblePrizes = prizes.filter((p) => !pendingDeleteIds.has(p.id));

  // Derived from the current `prizes` prop by id (not stored directly) so
  // that after a delete + router.refresh(), the prize disappearing from
  // this list automatically closes the peek instead of showing stale data.
  const active = activeId ? prizes.find((p) => p.id === activeId) ?? null : null;
  const open = Boolean(active);

  function openPeek(id: string) {
    setActiveId(id);
    setPeekMode("view");
    setPeekTab("comments");
  }

  function close() {
    setActiveId(null);
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

  // Opens a just-duplicated prize's edit view as soon as it shows up in the
  // `prizes` prop after router.refresh() -- adjusted during render (React's
  // documented pattern for reacting to a changed prop) rather than in a
  // useEffect, so there's no extra frame where pendingOpenId is already set
  // but `prizes` hasn't caught up yet.
  const [prevPrizesForOpen, setPrevPrizesForOpen] = useState(prizes);
  if (prizes !== prevPrizesForOpen) {
    setPrevPrizesForOpen(prizes);
    if (pendingOpenId && prizes.some((p) => p.id === pendingOpenId)) {
      setActiveId(pendingOpenId);
      setPeekMode("edit");
      setPendingOpenId(null);
    }
  }

  async function handleDuplicate() {
    if (!active || duplicating) return;
    setDuplicating(true);
    try {
      const newId = await duplicatePrize(active.id, activeProfile?.name ?? null);
      showToast("Prize duplicated");
      setPendingOpenId(newId);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't duplicate that prize");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleLogReprint() {
    if (!active || loggingReprint) return;
    setLoggingReprint(true);
    try {
      await logPrizeReprint(active.id, activeProfile?.name ?? null);
      showToast("Reprint logged");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't log that reprint");
    } finally {
      setLoggingReprint(false);
    }
  }

  const inStockPrizes = visiblePrizes.filter((p) => p.status === "in_stock");
  const printOnRequestPrizes = visiblePrizes.filter((p) => p.status !== "in_stock");

  function renderCard(prize: Prize, index: number) {
    return (
      <PrizeCard
        key={prize.id}
        prize={prize}
        onCheckout={onCheckout}
        onEdit={() => openPeek(prize.id)}
        addedOrSoldDate={
          prize.stock_count === 0 ? latestCheckoutByPrize[prize.id] : prize.created_at
        }
        soldDateKnown={prize.stock_count === 0 && Boolean(latestCheckoutByPrize[prize.id])}
        staggerDelay={staggerDelay(index)}
      />
    );
  }

  const reprintCount = (active?.activity ?? []).filter((a) => a.event_type === "reprinted").length;

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
        {active && (
          <>
            {active.photo_url && (
              <ImageWithFallback
                src={active.photo_url}
                className="w-full h-40 rounded-xl border border-border-warm object-cover"
              />
            )}
            {/* Title always gets its own row now, exactly like the
                Requests/Checkouts peeks -- Edit/Duplicate/Delete on the row
                below, right-aligned. pr-8 here (not on the button row)
                clears the peek's floating close button, which only ever
                overlaps this first row. */}
            <div className="flex items-center gap-2 min-w-0 pr-8">
              {peekMode === "edit" && (
                <button
                  type="button"
                  onClick={() => setPeekMode("view")}
                  aria-label="Back"
                  className="shrink-0 text-muted hover:text-ink -ml-1 p-1 rounded hover:bg-nav"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
              )}
              <h2 className="font-serif text-xl text-ink truncate">
                {peekMode === "edit" ? "Edit prize" : active.name}
              </h2>
            </div>
            {peekMode === "view" && (
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPeekMode("edit")}
                  className="flex items-center gap-1.5 text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-nav"
                >
                  <Pencil size={13} aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  title="Duplicate this prize -- opens the copy for editing"
                  className="flex items-center gap-1.5 text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-nav disabled:opacity-60"
                >
                  <Copy size={13} aria-hidden="true" />
                  Duplicate
                </button>
                <ActionButton
                  action={deletePrize.bind(null, active.id)}
                  toastMessage="Prize deleted"
                  confirmMessage={`Delete ${active.name}? This can't be undone.`}
                  onStart={() => {
                    close();
                    hideForDelete(active.id);
                  }}
                  onUndo={() => restoreFromDelete(active.id)}
                  className="flex items-center gap-1.5 text-sm text-rust rounded-md px-2 py-1.5 hover:bg-rust/10 transition-colors"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Delete
                </ActionButton>
              </div>
            )}

            {peekMode === "view" ? (
              <>
                <div className="text-sm">
                  <DetailRow label="Price" icon={Coins}>
                    <PriceBreakdown coinPrice={active.coin_price} />
                  </DetailRow>
                  <DetailRow label="Stock" icon={Package}>
                    {active.status === "in_stock" ? `${active.stock_count} in stock` : "Print-on-request"}
                  </DetailRow>
                  {active.size && (
                    <DetailRow label="Size" icon={Ruler}>{formatSize(active.size)}</DetailRow>
                  )}
                  {(active.filaments ?? []).length > 0 && (
                    <DetailRow label="Color" icon={Palette}>
                      {(active.filaments ?? []).map((f) => f.color_name).join(", ")}
                    </DetailRow>
                  )}
                  {(active.franchiseTags ?? []).length > 0 && (
                    <DetailRow label="Theme" icon={Tags}>
                      {(active.franchiseTags ?? []).map((t) => t.name).join(", ")}
                    </DetailRow>
                  )}
                  {active.makerworld_link && (
                    <DetailRow label="Link" icon={ExternalLink}>
                      <a
                        href={active.makerworld_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link hover:text-link-hover underline underline-offset-2"
                      >
                        Open ↗
                      </a>
                    </DetailRow>
                  )}
                  {active.notes && (
                    <DetailRow label="Notes" icon={StickyNote}>{active.notes}</DetailRow>
                  )}
                  <DetailRow label="Reprints" icon={Printer}>
                    <span className="flex items-center gap-2">
                      <span>
                        {reprintCount === 0
                          ? "Never reprinted"
                          : `Reprinted ${reprintCount} time${reprintCount === 1 ? "" : "s"}`}
                      </span>
                      <button
                        type="button"
                        onClick={handleLogReprint}
                        disabled={loggingReprint}
                        className="text-xs font-medium text-link hover:text-link-hover disabled:opacity-50"
                      >
                        + Log a reprint
                      </button>
                    </span>
                  </DetailRow>
                </div>

                <div className="pt-1">
                  <PeekTabs
                    tabs={[
                      { value: "comments" as const, label: "Comments", count: (active.comments ?? []).length },
                      { value: "activity" as const, label: "Activity", count: (active.activity ?? []).length },
                    ]}
                    active={peekTab}
                    onChange={setPeekTab}
                  />
                  <div className="pt-4">
                    {peekTab === "comments" ? (
                      <PrizeComments prizeId={active.id} comments={active.comments ?? []} />
                    ) : (
                      <PrizeActivity activity={active.activity ?? []} />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <PrizeForm
                key={active.id}
                action={updatePrizeInline.bind(null, active.id)}
                initial={active}
                allFilaments={allFilaments}
                linkedFilamentIds={(active.filaments ?? []).map((f) => f.id)}
                allFranchiseTags={allFranchiseTags}
                initialFranchiseTags={(active.franchiseTags ?? []).map((t) => t.name)}
                submitLabel="Save changes"
                onCancel={() => setPeekMode("view")}
                onSuccess={() => {
                  setPeekMode("view");
                  router.refresh();
                }}
              />
            )}
          </>
        )}
      </SidePeek>
    </>
  );
}
