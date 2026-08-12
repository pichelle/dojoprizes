"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  Link2,
  Maximize2,
  Palette,
  Pencil,
  Plus,
  Ruler,
  Coins,
  StickyNote,
  Tags,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestStatus } from "@/lib/types";
import StatusPill from "./StatusPill";
import RequestForm from "./RequestForm";
import ActionButton from "@/components/ActionButton";
import { createRequestInline, updateRequestInline } from "./actions";
import { showToast } from "@/components/ToastHost";
import { formatCoinPriceBreakdown } from "@/lib/coins";

// "Fulfilled" isn't a visible column -- it's tracked (status still gets
// set to "fulfilled" via the status pill, and still counts toward the
// "Total fulfilled" stat above) but doesn't clutter the board, since a
// fulfilled print's actual record lives on the Checkouts page instead.
const COLUMNS: { status: RequestStatus; label: string; dot: string }[] = [
  { status: "idea", label: "Ideas", dot: "var(--color-idea-dot)" },
  { status: "pending", label: "Queue", dot: "var(--color-pending-dot)" },
  { status: "printed", label: "Pickup", dot: "var(--color-printed-dot)" },
  { status: "cancelled", label: "Cancelled", dot: "var(--color-cancelled-dot)" },
];

// Requests carrying a priority sort (pending/printed) show 3D Print Club
// first, then oldest-waiting first -- the same order the old Queue page
// used for "what to print next". Fulfilled/cancelled are just an archive,
// so those stay in the newest-first order the page already queried in.
// A manual sort override (from the up/down carats) replaces this entirely
// while it's active.
const PRIORITY_SORTED: RequestStatus[] = ["idea", "pending", "printed"];

const URGENT_DAYS = 14;
const UNDO_WINDOW_MS = 5000;

type SortOverride = "asc" | "desc" | null;

// Default (no manual override) is oldest-first everywhere -- that's the
// order things actually need attention in. Pending/printed/idea also
// bubble Print Club requests to the top within that.
function sortForColumn(requests: PrizeRequest[], status: RequestStatus, override: SortOverride) {
  const rows = requests.filter((r) => r.status === status);
  if (override === "desc") {
    return [...rows].sort((a, b) => b.date_requested.localeCompare(a.date_requested));
  }
  if (override !== "asc" && PRIORITY_SORTED.includes(status)) {
    return [...rows].sort((a, b) => {
      if (a.is_print_club !== b.is_print_club) return a.is_print_club ? -1 : 1;
      return a.date_requested.localeCompare(b.date_requested);
    });
  }
  return [...rows].sort((a, b) => a.date_requested.localeCompare(b.date_requested));
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

function formatCalendarDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Same relative time as formatRequestedAgo, but without the "Requested"
// prefix and with the calendar date alongside it -- used only in the
// peek's Request date row, not on the card.
function formatRequestDateDetailed(iso: string) {
  const age = daysAgo(iso);
  const relative = age === null ? iso : age === 0 ? "Today" : age === 1 ? "1 day ago" : `${age} days ago`;
  return `${relative} (${formatCalendarDate(iso)})`;
}

// Requests are logged under whichever staff name is on duty -- most people
// just type their first name, so this prefixes "sensei" for display without
// changing what's actually stored.
function formatSensei(name: string | null) {
  if (!name) return "—";
  return /^sensei\b/i.test(name.trim()) ? name : `sensei ${name}`;
}

// Ideas don't have a prize/free-text title -- the "idea title" field
// captured at creation is stored in student_name instead, so use that
// as the display title for idea-status cards.
function printTitle(r: PrizeRequest) {
  if (r.status === "idea") return r.student_name || "Untitled idea";
  return r.prize?.name ?? r.free_text_prize ?? "Untitled print";
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

function DetailRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-border-warm/50 last:border-b-0 text-left">
      <span className="flex items-center gap-1.5 text-muted w-32 shrink-0 pt-px">
        <Icon size={13} className="shrink-0" aria-hidden="true" />
        {label}
      </span>
      <span className="text-ink leading-relaxed">{children}</span>
    </div>
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
  const [peekMode, setPeekMode] = useState<"view" | "edit">("view");
  const [creatingStatus, setCreatingStatus] = useState<RequestStatus | null>(null);
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
                  <Tooltip label="Most recent">
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
                className={isExpanded ? "grid gap-2.5" : "space-y-2.5"}
                style={isExpanded ? { gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" } : undefined}
              >
                {rows.map((r) => {
                  const catalogPrice = r.prize?.coin_price ?? null;
                  const priceTag = formatCoinPriceBreakdown(r.sale_price);
                  const estTag = formatCoinPriceBreakdown(catalogPrice);
                  const age = daysAgo(r.date_requested);
                  const urgent = age !== null && age > URGENT_DAYS && r.status === "pending";
                  const printName = printTitle(r);
                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        setActiveId(r.id);
                        setPeekMode("view");
                      }}
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
                          r.status === "idea" ? null : r.student_name,
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
              <button
                type="button"
                onClick={() => setCreatingStatus(col.status)}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted hover:text-ink border border-dashed border-border-warm-strong rounded-xl py-2 hover:bg-card/60"
              >
                <Plus size={13} aria-hidden="true" />
                Add new
              </button>
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
            {(active.photo_url || active.prize?.photo_url) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.photo_url || active.prize?.photo_url || ""}
                alt=""
                className="w-full h-40 object-cover rounded-xl border border-border-warm"
              />
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {peekMode === "edit" && (
                  <button
                    type="button"
                    onClick={() => setPeekMode("view")}
                    aria-label="Back"
                    className="shrink-0 text-muted hover:text-ink -ml-1 p-1 rounded hover:bg-page"
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                )}
                <h2 className="font-serif text-xl text-ink truncate">
                  {peekMode === "edit" ? "Edit request" : printTitle(active)}
                </h2>
                {peekMode === "view" && active.is_print_club && (
                  <span
                    className="shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1"
                    style={{ background: "var(--color-print-club-bg)", color: "var(--color-print-club-text)" }}
                  >
                    Print club
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="shrink-0 text-muted hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {peekMode === "view" ? (
              <>
                <div className="flex items-center justify-between">
                  <StatusPill
                    status={active.status}
                    catalogPrice={active.prize?.coin_price ?? null}
                    onPick={(next, salePrice) => handlePick(active.id, next, salePrice)}
                  />
                  <button
                    type="button"
                    onClick={() => setPeekMode("edit")}
                    className="flex items-center gap-1.5 text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-page"
                  >
                    <Pencil size={13} aria-hidden="true" />
                    Edit
                  </button>
                </div>

                <div className="text-sm">
                  {active.status !== "idea" && (
                    <DetailRow label="Ninja" icon={User}>{active.student_name}</DetailRow>
                  )}
                  <DetailRow label="Requested by" icon={User}>{formatSensei(active.requested_by)}</DetailRow>
                  <DetailRow label="Request date" icon={Clock}>{formatRequestDateDetailed(active.date_requested)}</DetailRow>
                  {active.size && <DetailRow label="Size" icon={Ruler}>{active.size}</DetailRow>}
                  {(active.colorFilaments ?? []).length > 0 && (
                    <DetailRow label="Color" icon={Palette}>
                      {(active.colorFilaments ?? []).map((c) => c.color_name).join(", ")}
                    </DetailRow>
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
                    <DetailRow label="Link" icon={Link2}>
                      <a
                        href={active.links}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sage underline underline-offset-2"
                      >
                        Open ↗
                      </a>
                    </DetailRow>
                  )}
                  {active.notes && (
                    <DetailRow label="Notes" icon={StickyNote}>{active.notes}</DetailRow>
                  )}
                </div>

                <ActionButton
                  action={onDelete.bind(null, active.id)}
                  toastMessage="Request deleted"
                  confirmMessage={`Delete ${printTitle(active)}? This can't be undone.`}
                  className="text-sm text-rust hover:underline"
                >
                  Delete this request
                </ActionButton>
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
                  className="text-sm text-rust hover:underline"
                >
                  Delete this request
                </ActionButton>
              </>
            )}
          </div>
        </div>
      )}

      {creatingStatus && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-ink/20"
            onClick={() => setCreatingStatus(null)}
            aria-hidden="true"
          />
          <div className="slide-in-right relative w-full max-w-lg bg-card h-full overflow-y-auto shadow-xl border-l border-border-warm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-ink">Add to {COLUMNS.find((c) => c.status === creatingStatus)?.label}</h2>
              <button
                type="button"
                onClick={() => setCreatingStatus(null)}
                className="shrink-0 text-muted hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <RequestForm
              key={creatingStatus}
              action={createRequestInline}
              presetStatus={creatingStatus}
              onCancel={() => setCreatingStatus(null)}
              onSuccess={() => {
                setCreatingStatus(null);
                router.refresh();
              }}
              prizes={prizes}
              filaments={filaments}
              allFranchiseTags={allFranchiseTags}
            />
          </div>
        </div>
      )}
    </>
  );
}
