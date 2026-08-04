"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestStatus } from "@/lib/types";
import StatusSelect from "./StatusSelect";
import RequestForm from "./RequestForm";
import ActionButton from "@/components/ActionButton";
import { updateRequestInline } from "./actions";

// Punchier, more distinct dot colors than the shared status palette used
// elsewhere -- easier to tell the columns apart at a glance.
const COLUMNS: { status: RequestStatus; label: string; dotColor: string }[] = [
  { status: "pending", label: "Pending", dotColor: "#c9700f" },
  { status: "printed", label: "Printed", dotColor: "#2f6fb0" },
  { status: "fulfilled", label: "Fulfilled", dotColor: "#3f7a2e" },
  { status: "cancelled", label: "Cancelled", dotColor: "#b54b3a" },
];

// Requests carrying a priority sort (pending/printed) show 3D Print Club
// first, then oldest-waiting first -- the same order the old Queue page
// used for "what to print next". Fulfilled/cancelled are just an archive,
// so those stay in the newest-first order the page already queried in.
// A manual sort override (from the up/down carats) replaces this entirely
// while it's active.
const PRIORITY_SORTED: RequestStatus[] = ["pending", "printed"];

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

// "2026-07-29" -> "Jul 29" -- faster to scan than the raw ISO date.
function formatShortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      className="w-8 h-8 rounded-full shrink-0 bg-tape/60 text-ink text-[11px] font-bold flex items-center justify-center border border-border-warm"
    >
      {initials(name)}
    </span>
  );
}

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
  onStatusChange: (requestId: string, status: RequestStatus) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<RequestStatus>>(new Set());
  const [sortOverrides, setSortOverrides] = useState<Partial<Record<RequestStatus, SortOverride>>>({});
  const active = requests.find((r) => r.id === activeId) ?? null;
  const router = useRouter();

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

  if (requests.length === 0) {
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
              onClick={() =>
                setHidden((prev) => {
                  const next = new Set(prev);
                  next.delete(c.status);
                  return next;
                })
              }
              className="text-xs font-medium text-ink bg-nav rounded px-2.5 py-1 hover:opacity-80"
            >
              + {c.label}
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
          const rows = sortForColumn(requests, col.status, override);
          return (
            <div key={col.status}>
              <div className="flex items-center justify-between mb-3">
                <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: col.dotColor }}
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
                    aria-pressed={override === "asc"}
                    className={`p-0.5 rounded hover:bg-page ${override === "asc" ? "text-ink" : "text-muted"}`}
                  >
                    <ChevronUp size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSort(col.status, "desc")}
                    aria-label={`Sort ${col.label} newest first`}
                    aria-pressed={override === "desc"}
                    className={`p-0.5 rounded hover:bg-page ${override === "desc" ? "text-ink" : "text-muted"}`}
                  >
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHidden((prev) => new Set(prev).add(col.status))}
                    aria-label={`Hide ${col.label} column`}
                    className="p-0.5 rounded text-muted hover:bg-page hover:text-ink ml-1"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="space-y-2.5">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setActiveId(r.id)}
                    className="card-hover cursor-pointer bg-card border border-border-warm rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-medium text-muted whitespace-nowrap">
                        Requested {formatShortDate(r.date_requested)}
                      </span>
                      {r.is_print_club && (
                        <span className="shrink-0 text-[11px] font-semibold text-sage bg-sage/15 rounded px-2 py-0.5">
                          Print club
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 mt-2.5">
                      <CardAvatar
                        photoUrl={r.photo_url || r.prize?.photo_url || null}
                        name={r.student_name}
                      />
                      <p className="text-[15px] font-bold text-ink">{r.student_name}</p>
                    </div>
                    <p className="text-xs font-medium text-muted mt-2 mb-3.5">
                      {[
                        r.prize?.name ?? r.free_text_prize,
                        r.size,
                        (r.colorFilaments ?? []).map((c) => c.color_name).join(", ") || null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No details yet"}
                    </p>
                    <div
                      className="flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[11px] font-medium text-muted truncate">
                        {r.requested_by ?? "—"}
                      </span>
                      <StatusSelect
                        key={`${r.id}-${r.status}`}
                        requestId={r.id}
                        status={r.status}
                        onChange={onStatusChange}
                      />
                    </div>
                  </div>
                ))}
                {rows.length === 0 && (
                  <p className="text-xs text-muted border border-dashed border-border-warm rounded-xl p-3 text-center">
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
