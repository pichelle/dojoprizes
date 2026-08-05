"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Eye, EyeOff, Maximize2, X } from "lucide-react";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestStatus } from "@/lib/types";
import StatusPill from "./StatusPill";
import RequestForm from "./RequestForm";
import ActionButton from "@/components/ActionButton";
import { updateRequestInline } from "./actions";
import { showToast } from "@/components/ToastHost";
import { formatCoinPriceBreakdown } from "@/lib/coins";

const COLUMNS: { status: RequestStatus; label: string; dot: string }[] = [
  { status: "pending", label: "Pending", dot: "var(--color-pending-dot)" },
  { status: "printed", label: "Printed", dot: "var(--color-printed-dot)" },
  { status: "fulfilled", label: "Fulfilled", dot: "var(--color-fulfilled-dot)" },
  { status: "cancelled", label: "Cancelled", dot: "var(--color-cancelled-dot)" },
];

// Requests carrying a priority sort (pending/printed) show 3D Print Club
// first, then oldest-waiting first -- the same order the old Queue page
// used for "what to print next". Fulfilled/cancelled are just an archive,
// so those stay in the newest-first order the page already queried in.
// A manual sort override (from the up/down carats) replaces this entirely
// while it's active.
const PRIORITY_SORTED: RequestStatus[] = ["pending", "printed"];

const URGENT_DAYS = 14;
const UNDO_WINDOW_MS = 5000;

type SortOverride = "asc" | "desc" | null;

function sortForColumn(requests: PrizeRequest[], status: RequestStatus, override: SortOverride) {
  const rows = requests.filter((r) => r.status === status);
  if (override === "asc") {
    return [...rows].sort((a, b) => a.date_requested.localeCompare(b.date_requested));
  }
  if (override === "desc") {
    return [...rows].sort((a, b) => b.date_requested.localeCompare(a.date_requested));
  }
  if (!PRIORITY_SORTED.includes(status)) return rows;
  return [...rows].sort((a, b) => {
    if (a.is_print_club !== b.is_print_club) return a.is_print_club ? -1 : 1;
    return a.date_requested.localeCompare(b.date_requested);
  });
}

function daysAgo(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

// "Requested 5 days ago" -- more actionable at a glance than a raw date.
function formatRequestedAgo(iso: string) {
  const age = daysAgo(iso);
  if (age === null) return `Requested ${iso}`;
  if (age === 0) return "Requested today";
  if (age === 1) return "Requested 1 day ago";
  return `Requested ${age} days ago`;
}

// Requests are logged under whichever staff name is on duty -- most people
// just type their first name, so this prefixes "sensei" for display without
// changing what's actually stored.
function formatSensei(name: string | null) {
  if (!name) return "—";
  return /^sensei\b/i.test(name.trim()) ? name : `sensei ${name}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function CardAvatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        aria-hidden="true"
        className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-warm"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="w-8 h-8 rounded-full shrink-0 bg-white text-ink text-[11px] font-bold flex items-center justify-center border border-border-warm"
    >
      {initials(name)}
    </span>
  );
}

type Override = { status: RequestStatus; salePrice: number | null };

export default function RequestsKanban({
  requests,
  prizes,
  filaments,
  allFranchiseTags,
  onStatusChange,
  onDelete,
}: {
  requests: PrizeRequest[];
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  onStatusChange: (requestId: string, status: RequestStatus, salePrice?: number | null) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<RequestStatus>>(new Set());
  const [expanded, setExpanded] = useState<RequestStatus | null>(null);
  const [sortOverrides, setSortOverrides] = useState<Partial<Record<RequestStatus, SortOverride>>>({});
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const router = useRouter();

  // Effective requests: server data with any not-yet-persisted optimistic
  // status/price changes applied, so cards move columns the instant a new
  // status is picked instead of waiting for the undo window to elapse.
  const effectiveRequests = useMemo(
    () =>
      requests.map((r) => {
        const o = overrides[r.id];
        if (!o) return r;
        return { ...r, status: o.status, sale_price: o.salePrice };
      }),
    [requests, overrides],
  );

  const active = effectiveRequests.find((r) => r.id === activeId) ?? null;

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
        await onStatusChange(requestId, next, salePrice);
        router.refresh();
        setOverrides((prev) => {
          const rest = { ...prev };
          delete rest[requestId];
          return rest;
        });
      })();
    }, UNDO_WINDOW_MS);

    showToast("Status updated", {
      onUndo: () => {
        cancelled = true;
        clearTimeout(timeoutId);
        setOverrides((prev) => ({ ...prev, [requestId]: previous }));
      },
    });
  }

  if (effectiveRequests.length === 0) {
    return (
      <p className="text-sm text-muted">No requests match yet.</p>
    );
  }

  return (
    <>
      {hiddenColumns.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
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
        className="grid items-start gap-5"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))` }}
      >
        {visibleColumns.map((col) => {
          const override = sortOverrides[col.status] ?? null;
          const rows = sortForColumn(effectiveRequests, col.status, override);
          const isExpanded = expanded === col.status;
          return (
            <div
              key={col.status}
              className="rounded-2xl p-3 bg-nav border border-border-warm"
              style={{ gridColumn: isExpanded ? "1 / -1" : undefined }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: col.dot }}
                    aria-hidden="true"
                  />
                  {col.label}
                  <span className="text-muted font-medium">{rows.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleSort(col.status, "asc")}
                    aria-label={`Sort ${col.label} oldest first`}
                    title="Oldest"
                    aria-pressed={override === "asc"}
                    className={`p-0.5 rounded hover:bg-[#f0ede3] ${override === "asc" ? "text-ink" : "text-muted"}`}
                  >
                    <ChevronUp size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSort(col.status, "desc")}
                    aria-label={`Sort ${col.label} newest first`}
                    title="Most recent"
                    aria-pressed={override === "desc"}
                    className={`p-0.5 rounded hover:bg-[#f0ede3] ${override === "desc" ? "text-ink" : "text-muted"}`}
                  >
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(col.status)}
                    aria-label={`Expand ${col.label} column`}
                    title="Expand"
                    aria-pressed={isExpanded}
                    className={`p-0.5 rounded hover:bg-[#f0ede3] ml-1 ${isExpanded ? "text-ink" : "text-muted"}`}
                  >
                    <Maximize2 size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleHide(col.status)}
                    aria-label={`Hide ${col.label} column`}
                    title="Hide"
                    className="p-0.5 rounded text-muted hover:bg-[#f0ede3] hover:text-ink"
                  >
                    <EyeOff size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div
                className={isExpanded ? "grid gap-2.5" : "space-y-2.5"}
                style={isExpanded ? { gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" } : undefined}
              >
                {rows.map((r) => {
                  const catalogPrice = r.prize?.coin_price ?? null;
                  const priceTag = formatCoinPriceBreakdown(r.sale_price);
                  const estTag = formatCoinPriceBreakdown(catalogPrice);
                  const age = daysAgo(r.date_requested);
                  const urgent = age !== null && age > URGENT_DAYS && r.status === "pending";
                  const printName = r.prize?.name ?? r.free_text_prize ?? "Untitled print";
                  return (
                    <div
                      key={r.id}
                      onClick={() => setActiveId(r.id)}
                      className="card-hover cursor-pointer bg-card border border-border-warm rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[11px] font-medium whitespace-nowrap ${urgent ? "text-rust font-semibold" : "text-muted"}`}
                        >
                          {formatRequestedAgo(r.date_requested)}
                        </span>
                        {r.is_print_club && (
                          <span
                            className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5"
                            style={{ background: "var(--color-print-club-bg)", color: "var(--color-print-club-text)" }}
                          >
                            Print club
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 mt-2.5">
                        <CardAvatar
                          photoUrl={r.photo_url || r.prize?.photo_url || null}
                          name={r.student_name}
                        />
                        <p className="text-[15px] font-bold text-ink">{printName}</p>
                      </div>
                      <p className="text-xs font-medium text-muted mt-2">
                        {[
                          r.student_name,
                          r.size,
                          (r.colorFilaments ?? []).map((c) => c.color_name).join(", ") || null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No details yet"}
                      </p>
                      {(r.status === "printed" || r.status === "fulfilled") && priceTag ? (
                        <p className="text-xs font-semibold mt-1" style={{ color: "var(--color-printed-text)" }}>
                          {priceTag}
                        </p>
                      ) : (
                        r.status === "pending" &&
                        estTag && (
                          <p className="text-xs font-medium text-muted mt-1">
                            {estTag} est.
                          </p>
                        )
                      )}
                      <div
                        className="flex items-center justify-between gap-2 mt-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] font-medium text-muted truncate">
                          {formatSensei(r.requested_by)}
                        </span>
                        <StatusPill
                          status={r.status}
                          catalogPrice={catalogPrice}
                          onPick={(next, salePrice) => handlePick(r.id, next, salePrice)}
                        />
                      </div>
                    </div>
                  );
                })}
                {rows.length === 0 && (
                  <p className="text-xs text-muted border border-dashed border-border-warm-strong rounded-xl p-3 text-center bg-card/60">
                    Nothing here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-ink/20"
            onClick={() => setActiveId(null)}
            aria-hidden="true"
          />
          <div className="slide-in-right relative w-full max-w-lg bg-card h-full overflow-y-auto shadow-xl border-l border-border-warm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-ink">Edit request</h2>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="text-muted hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <RequestForm
              key={active.id}
              action={updateRequestInline.bind(null, active.id)}
              onCancel={() => setActiveId(null)}
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
              confirmMessage={`Delete ${active.student_name}'s request? This can't be undone.`}
              className="text-sm text-rust hover:underline"
            >
              Delete this request
            </ActionButton>
          </div>
        </div>
      )}
    </>
  );
}
