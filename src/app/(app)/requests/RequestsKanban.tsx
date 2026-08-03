"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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
const PRIORITY_SORTED: RequestStatus[] = ["pending", "printed"];

function sortForColumn(requests: PrizeRequest[], status: RequestStatus) {
  const rows = requests.filter((r) => r.status === status);
  if (!PRIORITY_SORTED.includes(status)) return rows;
  return [...rows].sort((a, b) => {
    if (a.is_print_club !== b.is_print_club) return a.is_print_club ? -1 : 1;
    return a.date_requested.localeCompare(b.date_requested);
  });
}

// "2026-07-29" -> "Jul 29" -- faster to scan than the full ISO date.
function formatShortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const active = requests.find((r) => r.id === activeId) ?? null;
  const router = useRouter();

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted">No requests match yet.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {COLUMNS.map((col) => {
          const rows = sortForColumn(requests, col.status);
          return (
            <div key={col.status}>
              <p className="flex items-center gap-2 text-[15px] font-bold text-ink mb-3">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: col.dotColor }}
                  aria-hidden="true"
                />
                {col.label}
                <span className="text-muted font-medium">{rows.length}</span>
              </p>
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
                    <p className="text-[15px] font-bold text-ink mt-2.5">{r.student_name}</p>
                    <p className="text-xs font-medium text-muted mt-1.5 mb-3.5">
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
