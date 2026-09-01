"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Maximize2,
  MessageCircle,
  Palette,
  Pencil,
  Plus,
  Ruler,
  Coins,
  StickyNote,
  Tags,
  Trash2,
  User,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";
import DetailRow from "@/components/DetailRow";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestStatus } from "@/lib/types";
import { daysAgo, formatRequestedAgo, formatRequestDateDetailed, printTitle } from "@/lib/requestFormatting";
import StatusPill from "./StatusPill";
import RequestForm from "./RequestForm";
import RequestComments from "./RequestComments";
import RequestActivity from "./RequestActivity";
import PeekTabs from "@/components/PeekTabs";
import ActionButton from "@/components/ActionButton";
import ImageWithFallback from "@/components/ImageWithFallback";
import SidePeek from "@/components/SidePeek";
import { createRequestInline, updateRequestInline } from "./actions";
import { showToast } from "@/components/ToastHost";
import {
  formatCoinPriceBreakdown,
  coinPriceToBreakdown,
  breakdownToCoinPrice,
  type CoinBreakdown,
} from "@/lib/coins";
import { formatSize, formatColor } from "@/lib/requestFormatting";
import { staggerDelay } from "@/lib/stagger";
import EmptyStateMascot from "@/components/EmptyStateMascot";
import { useProfiles } from "@/components/ProfileContext";
import ProfileChip from "@/components/ProfileChip";

// "Fulfilled" isn't a visible column -- it's tracked (status still gets
// set to "fulfilled" via the status pill, and still counts toward the
// "Avg. turnaround" stat above) but doesn't clutter the board, since a
// fulfilled print's actual record lives on the Checkouts page instead.
const COLUMNS: { status: RequestStatus; label: string; dot: string }[] = [
  { status: "idea", label: "Ideas", dot: "var(--color-idea-dot)" },
  { status: "pending", label: "Queue", dot: "var(--color-pending-dot)" },
  { status: "printed", label: "Pickup", dot: "var(--color-printed-dot)" },
  { status: "cancelled", label: "Cancelled", dot: "var(--color-cancelled-dot)" },
];

// Only shown when a column is genuinely empty (not just filtered-empty --
// see the filtersActive check at the render site). Ideas and Pickup being
// empty are the rare/odd ones (kids never stop having ideas, and an empty
// Pickup just means nothing's been printed yet), so those get the
// question-mark pose instead of a celebratory one.
const EMPTY_COLUMN_COPY: Record<RequestStatus, { pose: "happy" | "sparkle" | "huh"; message: string }> = {
  idea: { pose: "huh", message: "no ideas pending? add some." },
  pending: { pose: "happy", message: "all caught up, go take a break sensei." },
  printed: { pose: "huh", message: "nothing ready? get to printing" },
  fulfilled: { pose: "happy", message: "all caught up." },
  // Not a visible column (same as fulfilled) -- entry only exists to
  // satisfy Record<RequestStatus, ...>.
  in_prize_bin: { pose: "happy", message: "all caught up." },
  cancelled: { pose: "sparkle", message: "nothing cancelled. not one request lost." },
};

// These three columns bubble 3D Print Club requests to the top -- the same
// split the old Queue page used for "what to print next" -- and are the
// only ones that support manual drag reordering. Fulfilled/cancelled are
// just an archive, so those stay in the newest-first order the page
// already queried in and can't be dragged.
const PRIORITY_SORTED: RequestStatus[] = ["idea", "pending", "printed"];

function canManuallyReorder(status: RequestStatus) {
  return PRIORITY_SORTED.includes(status);
}

const URGENT_DAYS = 14;
const UNDO_WINDOW_MS = 5000;

type SortOverride = "asc" | "desc" | null;

function compareByDate(a: PrizeRequest, b: PrizeRequest) {
  return a.date_requested.localeCompare(b.date_requested);
}

// Ascending by manual sort_order, with never-dragged (null) rows falling to
// the end and falling back to date order among each other -- this is what
// shows with no explicit Oldest/Newest override, so a manual drag is
// immediately visible without having to pick anything first.
function compareBySortOrder(a: PrizeRequest, b: PrizeRequest) {
  if (a.sort_order !== null && b.sort_order !== null) return a.sort_order - b.sort_order;
  if (a.sort_order !== null) return -1;
  if (b.sort_order !== null) return 1;
  return compareByDate(a, b);
}

// No override shows the manual drag order (falling back to oldest-first
// for anything never dragged). Explicit Oldest/Newest ignore manual order
// entirely and show plain date order instead -- dragging a card while one
// of those is active clears it (see handleReorder) so what you just did is
// what you immediately see. Pending/printed/idea also bubble 3D Print Club
// requests to the top in every mode -- that split never moves, only the
// order within each side of it does.
function sortForColumn(requests: PrizeRequest[], status: RequestStatus, override: SortOverride) {
  const rows = requests.filter((r) => r.status === status);
  const compare =
    override === "desc" ? (a: PrizeRequest, b: PrizeRequest) => -compareByDate(a, b)
    : override === "asc" ? compareByDate
    : compareBySortOrder;
  if (PRIORITY_SORTED.includes(status)) {
    return [...rows].sort((a, b) => {
      if (a.is_print_club !== b.is_print_club) return a.is_print_club ? -1 : 1;
      return compare(a, b);
    });
  }
  return [...rows].sort(compare);
}

function CardAvatar({ photoUrl }: { photoUrl: string | null }) {
  const smileFallback = (
    <span
      aria-hidden="true"
      className="w-8 h-8 rounded-lg shrink-0 bg-white flex items-center justify-center border border-border-warm p-1.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mascot/smile.png" alt="" className="w-full h-full object-contain" />
    </span>
  );
  if (photoUrl) {
    return (
      <ImageWithFallback
        src={photoUrl}
        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border-warm"
        fallback={smileFallback}
      />
    );
  }
  return smileFallback;
}

type Override = { status: RequestStatus; salePrice: number | null };

export default function RequestsKanban({
  requests,
  prizes,
  filaments,
  allFranchiseTags,
  onStatusChange,
  onDelete,
  onDuplicate,
  onClearCancelled,
  onReorder,
  filtersActive,
}: {
  requests: PrizeRequest[];
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  onStatusChange: (
    requestId: string,
    status: RequestStatus,
    salePrice?: number | null,
    actor?: string | null,
  ) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
  onDuplicate: (requestId: string, actor: string | null) => Promise<string>;
  onClearCancelled: () => Promise<void>;
  // Persists a manual drag reorder -- orderedIds is one column's whole
  // Print Club (or regular) partition in its new order.
  onReorder: (orderedIds: string[]) => Promise<void>;
  // True if a color/size/search filter is currently narrowing `requests`.
  // A column reading empty because of an active filter is not the same
  // thing as a column that's genuinely empty -- only the latter should
  // get the celebratory mascot copy ("all caught up!"), since showing
  // that over a filter side-effect would just be wrong.
  filtersActive: boolean;
}) {
  const { profiles, activeProfile } = useProfiles();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [peekMode, setPeekMode] = useState<"view" | "edit">("view");
  const [peekTab, setPeekTab] = useState<"comments" | "activity">("comments");
  const [creatingStatus, setCreatingStatus] = useState<RequestStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<RequestStatus | null>(null);
  // Which card a within-column drag is currently hovering, and which half
  // of it -- drives the insertion-line preview. Separate from dragOverStatus
  // (that one's for the cross-column drop highlight, which still applies
  // even while hovering a specific card).
  const [dragOverCard, setDragOverCard] = useState<{ id: string; edge: "before" | "after" } | null>(null);
  const [hidden, setHidden] = useState<Set<RequestStatus>>(new Set());
  const [expanded, setExpanded] = useState<RequestStatus | null>(null);
  const [sortOverrides, setSortOverrides] = useState<Partial<Record<RequestStatus, SortOverride>>>({});
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  // Optimistic sort_order values from a just-completed drag reorder, keyed
  // by request id -- same idea as `overrides`, but kept separate since one
  // reorder touches a whole partition's worth of rows at once rather than
  // a single card.
  const [sortOrderOverrides, setSortOrderOverrides] = useState<Record<string, number>>({});
  // The card that should play its pop-in animation, if any. Previously
  // this was set automatically on create and paired with an effect that
  // tried to auto-scroll to it -- that turned out unreliable in practice
  // (see git history), so now it's set only when the person clicks
  // "View" on the "New request added" toast, tying the animation to the
  // moment they're actually looking rather than trying to guess it.
  const [revealId, setRevealId] = useState<string | null>(null);
  // Cards mid-delete: hidden immediately (optimistic), restored if Undo
  // is clicked, actually gone once the undo window elapses and the
  // server delete + refresh completes (at which point the id just stops
  // existing in `requests` anyway).
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [duplicating, setDuplicating] = useState(false);
  // Set right after a duplicate is created, since the new request doesn't
  // exist in the `requests` prop yet -- the effect below opens its edit
  // view as soon as router.refresh() brings it in.
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  // A card dropped onto the Printed column needs the same price confirm
  // the status-pill dropdown already asks for -- drag-and-drop bypassed
  // StatusPill entirely, so it skipped that prompt. Null unless a
  // non-print-club card was just dropped onto Printed and is waiting on
  // this modal (print club prints are always free, so those skip straight
  // through in handleDrop instead of opening this).
  const [pendingPrintedDrop, setPendingPrintedDrop] = useState<{
    requestId: string;
    breakdown: CoinBreakdown;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const addedToastFired = useRef(false);

  // Effective requests: server data with any not-yet-persisted optimistic
  // status/price changes applied, so cards move columns the instant a new
  // status is picked instead of waiting for the undo window to elapse.
  // Anything mid-delete is filtered out here too, for the same reason.
  const effectiveRequests = useMemo(
    () =>
      requests
        .filter((r) => !pendingDeleteIds.has(r.id))
        .map((r) => {
          const o = overrides[r.id];
          const withStatus = o ? { ...r, status: o.status, sale_price: o.salePrice } : r;
          const sortOverride = sortOrderOverrides[r.id];
          return sortOverride === undefined ? withStatus : { ...withStatus, sort_order: sortOverride };
        }),
    [requests, overrides, sortOrderOverrides, pendingDeleteIds],
  );

  // Clears an optimistic override once the server `requests` prop already
  // reflects it -- see the comment in handlePick for why this can't just
  // happen right after router.refresh() is called instead. Adjusting state
  // during render (React's documented pattern for reacting to a changed
  // prop) rather than in a useEffect, so there's no extra frame where the
  // override is already gone but `requests` hasn't caught up yet.
  const [prevRequests, setPrevRequests] = useState(requests);
  if (requests !== prevRequests) {
    setPrevRequests(requests);
    setOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [id, override] of Object.entries(prev)) {
        const serverRow = requests.find((r) => r.id === id);
        if (serverRow && serverRow.status === override.status && serverRow.sale_price === override.salePrice) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setSortOrderOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [id, sortOrder] of Object.entries(prev)) {
        const serverRow = requests.find((r) => r.id === id);
        if (serverRow && serverRow.sort_order === sortOrder) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // Opens a just-duplicated request's edit view as soon as it shows up
    // here -- same render-time adjustment as the override-clearing above.
    if (pendingOpenId && requests.some((r) => r.id === pendingOpenId)) {
      setActiveId(pendingOpenId);
      setPeekMode("edit");
      setPendingOpenId(null);
    }
  }

  const active = effectiveRequests.find((r) => r.id === activeId) ?? null;

  // Same "New request added" toast used by the inline "+ Add new" flow's
  // onSuccess below -- factored out because the dedicated /requests/new
  // page also needs to trigger it, but can't call onSuccess directly
  // (it redirects server-side before any client code here would run).
  // Instead createRequest carries the new id through as ?added=<id>,
  // and the effect right after this picks it up on arrival.
  function showAddedToast(id: string) {
    showToast("New request added", {
      action: {
        label: "View",
        onClick: () => {
          const el = document.getElementById(`request-card-${id}`);
          if (!el) return;
          setRevealId(id);
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        },
      },
    });
  }

  useEffect(() => {
    if (addedToastFired.current) return;
    const addedId = searchParams.get("added");
    if (!addedId) return;
    addedToastFired.current = true;
    showAddedToast(addedId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("added");
    router.replace(params.size > 0 ? `?${params.toString()}` : "/requests", { scroll: false });
  }, [searchParams, router]);

  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => !hidden.has(c.status)),
    [hidden],
  );
  const hiddenColumns = useMemo(
    () => COLUMNS.filter((c) => hidden.has(c.status)),
    [hidden],
  );

  function toggleSort(status: RequestStatus, direction: "asc" | "desc") {
    setSortOverrides((prev) => ({
      ...prev,
      [status]: prev[status] === direction ? null : direction,
    }));
  }

  function toggleExpand(status: RequestStatus) {
    if (expanded === status) {
      setExpanded(null);
      setHidden(new Set());
    } else {
      setExpanded(status);
      setHidden(new Set(COLUMNS.filter((c) => c.status !== status).map((c) => c.status)));
    }
  }

  function toggleHide(status: RequestStatus) {
    setExpanded(null);
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  // Drag-and-drop is mouse/trackpad only (native HTML5 DnD doesn't reach
  // touch devices) -- the status pill dropdown on each card remains the
  // way to change status on mobile.
  function handleDrop(status: RequestStatus) {
    setDragOverStatus(null);
    const requestId = draggingId;
    setDraggingId(null);
    if (!requestId) return;
    const current = effectiveRequests.find((r) => r.id === requestId);
    if (!current || current.status === status) return;
    // An idea has no Printed step of its own -- Prize Bin isn't a board
    // column to drag onto, so an idea-origin card sitting in Queue can't
    // be dropped on Printed. It still has to go through the status pill,
    // where the Prize Bin option (and its price prompt) actually lives.
    if (status === "printed" && current.originated_as_idea) {
      showToast("Ideas skip Printed -- use the status pill's “Prize Bin” option instead.");
      return;
    }
    if (status === "printed") {
      // 3D Print Club prints are always free -- skip straight through
      // instead of asking. Everything else gets the same price prompt
      // the status-pill dropdown already shows for this same transition.
      if (current.is_print_club) {
        handlePick(requestId, status, 0);
        return;
      }
      setPendingPrintedDrop({
        requestId,
        breakdown: coinPriceToBreakdown(current.prize?.coin_price ?? null),
      });
      return;
    }
    handlePick(requestId, status);
  }

  // Drops `draggedId` next to `targetId` within one column. Print
  // Club/regular is a hard split -- a card only ever reorders among its
  // own partition, so dropping near a card on the other side just settles
  // at that boundary (top of the regular group, or bottom of the Print
  // Club group) instead of doing nothing.
  function handleReorder(status: RequestStatus, draggedId: string, targetId: string, edge: "before" | "after") {
    const dragged = effectiveRequests.find((r) => r.id === draggedId);
    const target = effectiveRequests.find((r) => r.id === targetId);
    if (!dragged || !target || dragged.id === target.id) return;

    const partitionRows = sortForColumn(effectiveRequests, status, sortOverrides[status] ?? null).filter(
      (r) => r.is_print_club === dragged.is_print_club && r.id !== draggedId,
    );

    let insertAt: number;
    if (target.is_print_club === dragged.is_print_club) {
      const targetIndex = partitionRows.findIndex((r) => r.id === targetId);
      insertAt = edge === "before" ? targetIndex : targetIndex + 1;
    } else {
      insertAt = dragged.is_print_club ? partitionRows.length : 0;
    }

    const reordered = [...partitionRows];
    reordered.splice(insertAt, 0, dragged);

    // Optimistic: show the new order immediately, and drop any
    // Oldest/Newest override on this column -- a fresh drag is a clearer
    // signal of intent than a toggle picked earlier, and leaving the
    // override active would hide the very change just made.
    setSortOrderOverrides((prev) => {
      const next = { ...prev };
      reordered.forEach((r, i) => {
        next[r.id] = (i + 1) * 1024;
      });
      return next;
    });
    setSortOverrides((prev) => ({ ...prev, [status]: null }));

    onReorder(reordered.map((r) => r.id)).then(() => router.refresh());
  }

  function handlePick(requestId: string, next: RequestStatus, salePrice?: number | null) {
    const current = effectiveRequests.find((r) => r.id === requestId);
    if (!current) return;
    const previous: Override = { status: current.status, salePrice: current.sale_price };
    const resolvedPrice = salePrice !== undefined ? salePrice : current.sale_price;

    // Move the card to its new column right away.
    setOverrides((prev) => ({ ...prev, [requestId]: { status: next, salePrice: resolvedPrice } }));

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      (async () => {
        await onStatusChange(requestId, next, salePrice, activeProfile?.name ?? null);
        router.refresh();
        // Deliberately NOT clearing the override here -- router.refresh()
        // schedules a re-fetch but doesn't resolve once the new `requests`
        // prop has actually landed. Clearing right away left a gap frame
        // where the override was gone but `requests` still had the old
        // status, so the card would snap back then snap forward again a
        // moment later. The effect below clears it once the server data
        // actually agrees, so there's never a frame showing stale state.
      })();
    }, UNDO_WINDOW_MS);

    showToast(next === "fulfilled" ? "Marked fulfilled!" : "Status updated", {
      onUndo: () => {
        cancelled = true;
        clearTimeout(timeoutId);
        setOverrides((prev) => ({ ...prev, [requestId]: previous }));
      },
    });
  }

  function hideForDelete(requestId: string) {
    setPendingDeleteIds((prev) => new Set(prev).add(requestId));
  }

  function restoreFromDelete(requestId: string) {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
  }

  async function handleDuplicate() {
    if (!active || duplicating) return;
    setDuplicating(true);
    try {
      const newId = await onDuplicate(active.id, activeProfile?.name ?? null);
      showToast("Request duplicated");
      setPendingOpenId(newId);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't duplicate that request");
    } finally {
      setDuplicating(false);
    }
  }

  if (effectiveRequests.length === 0) {
    return (
      <p className="text-sm text-muted">No requests match yet.</p>
    );
  }

  return (
    <>
      {/* This wrapper (not the grid itself) is what actually fills the
          sm:flex-1/min-h-0 space RequestsView hands down -- the grid gets
          sm:flex-1 within it, so the "Hidden: ..." bar above stays its
          natural height instead of being squeezed by the grid's growth. */}
      <div className="sm:flex sm:flex-col sm:h-full sm:min-h-0">
        {hiddenColumns.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 mb-3">
            <span className="text-xs text-muted">Hidden:</span>
            {hiddenColumns.map((c) => (
              <button
                key={c.status}
                type="button"
                onClick={() => toggleHide(c.status)}
                className="flex items-center gap-1 text-xs font-medium text-ink bg-[#f3f3f0] rounded px-2.5 py-1 hover:opacity-80"
              >
                <Eye size={12} aria-hidden="true" />
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div
          className="grid items-start sm:items-stretch gap-5 sm:flex-1 sm:min-h-0"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))` }}
        >
          {visibleColumns.map((col) => {
          const override = sortOverrides[col.status] ?? null;
          const rows = sortForColumn(effectiveRequests, col.status, override);
          const isExpanded = expanded === col.status;
          // Shown only while a manual drag arrangement is actually what's
          // on screen (no Oldest/Newest override active, and at least one
          // card here has actually been dragged) -- otherwise it'd be
          // claiming a custom order that isn't really visible.
          const hasCustomOrder =
            override === null && canManuallyReorder(col.status) && rows.some((r) => r.sort_order !== null);
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                if (!draggingId) return;
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCard(null);
                handleDrop(col.status);
              }}
              className={`rounded-2xl p-3 bg-nav border transition-colors sm:flex sm:flex-col sm:min-h-0 ${
                dragOverStatus === col.status ? "border-sage bg-sage/5" : "border-border-warm"
              }`}
              style={{ gridColumn: isExpanded ? "1 / -1" : undefined }}
            >
              <div className="flex items-center justify-between mb-3 px-1 sm:shrink-0">
                <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: col.dot }}
                    aria-hidden="true"
                  />
                  {col.label}
                  <span className="text-muted font-medium">{rows.length}</span>
                  {hasCustomOrder && (
                    <span className="text-[10px] font-medium text-muted">Custom order</span>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <Tooltip label="Oldest">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.status, "asc")}
                      aria-label={`Sort ${col.label} oldest first`}
                      aria-pressed={override === "asc"}
                      className={`p-0.5 rounded hover:bg-nav-hover ${override === "asc" ? "text-ink" : "text-muted"}`}
                    >
                      <ChevronUp size={14} aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Newest">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.status, "desc")}
                      aria-label={`Sort ${col.label} newest first`}
                      aria-pressed={override === "desc"}
                      className={`p-0.5 rounded hover:bg-nav-hover ${override === "desc" ? "text-ink" : "text-muted"}`}
                    >
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Expand">
                    <button
                      type="button"
                      onClick={() => toggleExpand(col.status)}
                      aria-label={`Expand ${col.label} column`}
                      aria-pressed={isExpanded}
                      className={`p-0.5 rounded hover:bg-nav-hover ml-1 ${isExpanded ? "text-ink" : "text-muted"}`}
                    >
                      <Maximize2 size={13} aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Hide">
                    <button
                      type="button"
                      onClick={() => toggleHide(col.status)}
                      aria-label={`Hide ${col.label} column`}
                      className="p-0.5 rounded text-muted hover:bg-nav-hover hover:text-ink"
                    >
                      <EyeOff size={14} aria-hidden="true" />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div
                className={`scroll-warm sm:flex-1 sm:overflow-y-auto sm:min-h-0 sm:pr-1 pt-1 -mt-1 ${
                  isExpanded ? "grid content-start items-start gap-2.5" : "space-y-2.5"
                }`}
                style={
                  isExpanded
                    ? { gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gridAutoRows: "min-content" }
                    : undefined
                }
              >
                {rows.map((r, i) => {
                  const catalogPrice = r.prize?.coin_price ?? null;
                  // Actual sale price (once printed/fulfilled) renders as
                  // icon + bold black number, matching the Prize Bin card
                  // treatment, rather than plain colored text.
                  const saleBreakdown = coinPriceToBreakdown(r.sale_price);
                  const hasSalePrice =
                    saleBreakdown.obsidian > 0 || saleBreakdown.gold > 0 || saleBreakdown.silver > 0;
                  const estTag = formatCoinPriceBreakdown(catalogPrice);
                  // An idea's date_requested is when the idea was jotted
                  // down, not when it actually joined the queue -- once it's
                  // out of the Ideas column, that date no longer means
                  // "waiting since", so it's misleading to show it (and
                  // doubly so to flag it urgent off of it). Shown as an
                  // origin tag instead, below.
                  const isIdeaInQueue = r.originated_as_idea && r.status !== "idea";
                  const age = daysAgo(r.date_requested);
                  const urgent = !isIdeaInQueue && age !== null && age > URGENT_DAYS && r.status === "pending";
                  const printName = printTitle(r);
                  return (
                    <div
                      key={r.id}
                      id={`request-card-${r.id}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggingId(r.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStatus(null);
                        setDragOverCard(null);
                      }}
                      onDragOver={(e) => {
                        if (!draggingId || draggingId === r.id) return;
                        const draggedRow = effectiveRequests.find((x) => x.id === draggingId);
                        if (!draggedRow || draggedRow.status !== r.status || !canManuallyReorder(r.status)) return;
                        // Only preventDefault (which is what allows onDrop
                        // to fire here at all) once this is actually a
                        // valid same-column reorder target -- otherwise
                        // leave it alone so the drop bubbles to the column
                        // itself as a normal cross-column status change.
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const edge: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                        setDragOverCard((prev) =>
                          prev?.id === r.id && prev.edge === edge ? prev : { id: r.id, edge },
                        );
                      }}
                      onDragLeave={() => setDragOverCard((c) => (c?.id === r.id ? null : c))}
                      onDrop={(e) => {
                        const draggedId = draggingId;
                        setDraggingId(null);
                        setDragOverStatus(null);
                        setDragOverCard(null);
                        if (!draggedId || draggedId === r.id) return;
                        const draggedRow = effectiveRequests.find((x) => x.id === draggedId);
                        if (draggedRow && draggedRow.status === r.status && canManuallyReorder(r.status)) {
                          // Same column as the card being dragged -- reorder
                          // instead of the column's own onDrop (which only
                          // handles a status change), so stop it there.
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const edge: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                          handleReorder(r.status, draggedId, r.id, edge);
                        }
                        // Otherwise let it bubble to the column's onDrop for
                        // the usual cross-column status-change handling.
                      }}
                      onClick={() => {
                        setActiveId(r.id);
                        setPeekMode("view");
                        setPeekTab("comments");
                      }}
                      style={{ "--stagger-delay": staggerDelay(i) } as React.CSSProperties}
                      onAnimationEnd={() => {
                        if (r.id === revealId) setRevealId(null);
                      }}
                      className={`relative card-hover cursor-pointer bg-card border border-border-warm rounded-xl p-4 ${
                        r.id === revealId ? "card-added-in" : "stagger-in"
                      } ${draggingId === r.id ? "opacity-40" : ""} ${
                        dragOverCard?.id === r.id && dragOverCard.edge === "before" ? "border-t-2 border-t-sage"
                        : dragOverCard?.id === r.id && dragOverCard.edge === "after" ? "border-b-2 border-b-sage"
                        : ""
                      }`}
                    >
                      {r.is_print_club && (
                        <div className="absolute top-2 right-2 z-10">
                          <Tooltip label="3D Print Club" align="right" placement="bottom">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/icons/print-club.png"
                              alt=""
                              className="w-9 h-9 object-contain"
                              style={{ filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.22))" }}
                              aria-hidden="true"
                            />
                          </Tooltip>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        {isIdeaInQueue ? (
                          <span className="text-[11px] font-medium whitespace-nowrap text-muted">
                            From ideas
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-medium whitespace-nowrap ${urgent ? "text-rust font-semibold" : "text-muted"}`}
                          >
                            {formatRequestedAgo(r.date_requested, r.status)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 mt-2.5">
                        <CardAvatar photoUrl={r.photo_url || r.prize?.photo_url || null} />
                        <p className="text-[15px] font-bold text-ink">{printName}</p>
                      </div>
                      <p className="text-xs font-medium text-muted mt-2">
                        {[
                          r.originated_as_idea ? null : r.student_name,
                          formatSize(r.size),
                          formatColor(r),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No details yet"}
                      </p>
                      {(r.status === "printed" || r.status === "fulfilled") && hasSalePrice ? (
                        <div className="flex items-center gap-2 mt-1">
                          {saleBreakdown.obsidian > 0 && (
                            <span className="flex items-center gap-1">
                              <img src="/icons/coin-obsidian.png" alt="Obsidian" className="w-4 h-4 object-contain" />
                              <span className="text-xs font-semibold text-ink">{saleBreakdown.obsidian}</span>
                            </span>
                          )}
                          {saleBreakdown.gold > 0 && (
                            <span className="flex items-center gap-1">
                              <img src="/icons/coin-gold.png" alt="Gold" className="w-4 h-4 object-contain" />
                              <span className="text-xs font-semibold text-ink">{saleBreakdown.gold}</span>
                            </span>
                          )}
                          {saleBreakdown.silver > 0 && (
                            <span className="text-xs font-semibold text-ink">{saleBreakdown.silver} Silver</span>
                          )}
                        </div>
                      ) : (
                        r.status === "pending" &&
                        estTag && (
                          <p className="text-xs font-medium text-muted mt-1">
                            {estTag} est.
                          </p>
                        )
                      )}
                      <div className="flex items-center justify-between gap-2 mt-3">
                        <span className="text-[11px] flex-1 min-w-0 truncate">
                          <ProfileChip name={r.requested_by} profiles={profiles} variant="compact" />
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {(r.comments ?? []).length > 0 && (
                            <span className="flex items-center gap-1.5 leading-none text-[11px] font-semibold text-muted">
                              <MessageCircle size={13} className="shrink-0" aria-hidden="true" />
                              <span>{(r.comments ?? []).length}</span>
                            </span>
                          )}
                          {/* Only the status pill itself needs to stop the
                              click from bubbling up to the card's onClick
                              (which would open the peek) -- the rest of this
                              row (sensei name, comment count) should behave
                              like the rest of the card and open it. */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <StatusPill
                              status={r.status}
                              catalogPrice={catalogPrice}
                              isPrintClub={r.is_print_club}
                              originatedAsIdea={r.originated_as_idea}
                              onPick={(next, salePrice) => handlePick(r.id, next, salePrice)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {rows.length === 0 && !filtersActive && (
                  <EmptyStateMascot
                    pose={EMPTY_COLUMN_COPY[col.status].pose}
                    message={EMPTY_COLUMN_COPY[col.status].message}
                    className="border border-dashed border-border-warm-strong rounded-xl bg-card/60"
                  />
                )}
                {rows.length === 0 && filtersActive && (
                  <p className="text-xs text-muted border border-dashed border-border-warm-strong rounded-xl p-3 text-center bg-card/60">
                    Nothing here
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCreatingStatus(col.status)}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted hover:text-ink border border-dashed border-border-warm-strong rounded-xl py-2 hover:bg-nav/60 sm:shrink-0"
              >
                <Plus size={13} aria-hidden="true" />
                Add new
              </button>
              {col.status === "cancelled" && rows.length > 0 && (
                <ActionButton
                  action={onClearCancelled}
                  toastMessage="Cancelled requests cleared"
                  confirmMessage={`Delete all ${rows.length} cancelled request${rows.length === 1 ? "" : "s"}? This can't be undone.`}
                  className="mt-2 w-full text-xs font-medium text-rust hover:underline sm:shrink-0"
                >
                  Clear cancelled
                </ActionButton>
              )}
            </div>
          );
        })}
        </div>
      </div>

      <SidePeek open={Boolean(active)} onClose={() => setActiveId(null)}>
        {active && (
          <>
            {(active.photo_url || active.prize?.photo_url) && (
              <ImageWithFallback
                src={active.photo_url || active.prize?.photo_url || ""}
                className="w-full h-40 rounded-xl border border-border-warm object-cover"
              />
            )}
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
                {peekMode === "edit" ? "Edit request" : printTitle(active)}
              </h2>
              {peekMode === "view" && active.is_print_club && (
                <span className="shrink-0 flex items-center gap-1.5 ml-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/print-club.png" alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
                  <span className="text-xs font-semibold text-ink">3D Print Club</span>
                </span>
              )}
            </div>

            {peekMode === "view" ? (
              <>
                <div className="flex items-center justify-between">
                  <StatusPill
                    status={active.status}
                    catalogPrice={active.prize?.coin_price ?? null}
                    isPrintClub={active.is_print_club}
                    originatedAsIdea={active.originated_as_idea}
                    onPick={(next, salePrice) => handlePick(active.id, next, salePrice)}
                  />
                  <div className="flex items-center gap-3">
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
                      title="Duplicate this request -- opens the copy for editing"
                      className="flex items-center gap-1.5 text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-nav disabled:opacity-60"
                    >
                      <Copy size={13} aria-hidden="true" />
                      Duplicate
                    </button>
                    <ActionButton
                      action={onDelete.bind(null, active.id)}
                      toastMessage="Request deleted"
                      confirmMessage={`Delete ${printTitle(active)}? This can't be undone.`}
                      onStart={() => {
                        setActiveId(null);
                        hideForDelete(active.id);
                      }}
                      onUndo={() => restoreFromDelete(active.id)}
                      className="flex items-center gap-1.5 text-sm text-rust rounded-md px-2 py-1.5 hover:bg-rust/10 transition-colors"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      Delete
                    </ActionButton>
                  </div>
                </div>

                <div className="text-sm">
                  {!active.originated_as_idea && (
                    <DetailRow label="Ninja" icon={User}>{active.student_name}</DetailRow>
                  )}
                  <DetailRow label="Requested by" icon={User}>
                    <ProfileChip name={active.requested_by} profiles={profiles} />
                  </DetailRow>
                  <DetailRow label="Request date" icon={Clock}>{formatRequestDateDetailed(active.date_requested)}</DetailRow>
                  {active.size && <DetailRow label="Size" icon={Ruler}>{formatSize(active.size)}</DetailRow>}
                  {((active.colorFilaments ?? []).length > 0 || active.color_any) && (
                    <DetailRow label="Color" icon={Palette}>{formatColor(active)}</DetailRow>
                  )}
                  {(active.franchiseTags ?? []).length > 0 && (
                    <DetailRow label="Theme" icon={Tags}>
                      {(active.franchiseTags ?? []).map((t) => t.name).join(", ")}
                    </DetailRow>
                  )}
                  {formatCoinPriceBreakdown(active.sale_price) && (
                    <DetailRow label="Price" icon={Coins}>{formatCoinPriceBreakdown(active.sale_price)}</DetailRow>
                  )}
                  {active.links && (
                    <DetailRow label="Link" icon={ExternalLink}>
                      <a
                        href={active.links}
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
                      <RequestComments requestId={active.id} comments={active.comments ?? []} />
                    ) : (
                      <RequestActivity activity={active.activity ?? []} />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <RequestForm
                  key={active.id}
                  action={updateRequestInline.bind(null, active.id)}
                  onCancel={() => setPeekMode("view")}
                  onSuccess={() => {
                    setActiveId(null);
                    router.refresh();
                  }}
                  initial={active}
                  initialFranchiseTags={(active.franchiseTags ?? []).map((t) => t.name)}
                  initialColorFilamentIds={(active.colorFilaments ?? []).map((c) => c.id)}
                  prizes={prizes}
                  filaments={filaments}
                  allFranchiseTags={allFranchiseTags}
                  submitLabel="Save changes"
                />
                <ActionButton
                  action={onDelete.bind(null, active.id)}
                  toastMessage="Request deleted"
                  confirmMessage={`Delete ${printTitle(active)}? This can't be undone.`}
                  onStart={() => {
                    setActiveId(null);
                    hideForDelete(active.id);
                  }}
                  onUndo={() => restoreFromDelete(active.id)}
                  className="text-sm text-rust hover:underline"
                >
                  Delete this request
                </ActionButton>
              </>
            )}
          </>
        )}
      </SidePeek>

      <SidePeek open={Boolean(creatingStatus)} onClose={() => setCreatingStatus(null)}>
        {creatingStatus && (
          <>
            <h2 className="font-serif text-xl text-ink pr-8">Add to {COLUMNS.find((c) => c.status === creatingStatus)?.label}</h2>
            <RequestForm
              key={creatingStatus}
              action={createRequestInline}
              presetStatus={creatingStatus}
              onCancel={() => setCreatingStatus(null)}
              onSuccess={(result) => {
                setCreatingStatus(null);
                router.refresh();
                if (result?.requestId) showAddedToast(result.requestId);
              }}
              prizes={prizes}
              filaments={filaments}
              allFranchiseTags={allFranchiseTags}
            />
          </>
        )}
      </SidePeek>

      {pendingPrintedDrop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20"
          onClick={() => setPendingPrintedDrop(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-64 bg-card border border-border-warm-strong rounded-md shadow-md p-3 space-y-2"
          >
            <p className="text-xs text-muted">Price for this print?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["gold", "obsidian"] as const).map((tier) => (
                <div key={tier}>
                  <label className="block text-[10px] text-muted capitalize">{tier}</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={pendingPrintedDrop.breakdown[tier] || ""}
                    onChange={(e) =>
                      setPendingPrintedDrop((prev) =>
                        prev
                          ? { ...prev, breakdown: { ...prev.breakdown, [tier]: Number(e.target.value) || 0 } }
                          : prev,
                      )
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
                onClick={() => setPendingPrintedDrop(null)}
                className="text-[11px] text-muted hover:text-ink px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePick(pendingPrintedDrop.requestId, "printed", breakdownToCoinPrice(pendingPrintedDrop.breakdown));
                  setPendingPrintedDrop(null);
                }}
                className="text-[11px] font-medium rounded-md px-2.5 py-1"
                style={{ background: "var(--color-printed-bg)", color: "var(--color-printed-text)" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
