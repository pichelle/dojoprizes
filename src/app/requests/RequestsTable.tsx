"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestStatus } from "@/lib/types";
import StatusSelect from "./StatusSelect";
import RequestForm from "./RequestForm";
import ActionButton from "@/components/ActionButton";

export default function RequestsTable({
  requests,
  prizes,
  filaments,
  allFranchiseTags,
  onStatusChange,
  onUpdate,
  onDelete,
}: {
  requests: PrizeRequest[];
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  onStatusChange: (requestId: string, status: RequestStatus) => Promise<void>;
  onUpdate: (requestId: string, formData: FormData) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = requests.find((r) => r.id === activeId) ?? null;

  return (
    <>
      <div className="bg-card border border-border-warm rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-page text-muted text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Ninja name</th>
              <th className="px-4 py-2 font-medium">Requested by</th>
              <th className="px-4 py-2 font-medium">Prize</th>
              <th className="px-4 py-2 font-medium">Theme</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Color</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">MakerWorld / Notes</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted">
                  No requests match yet.
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className="border-t border-border-warm align-top cursor-pointer hover:bg-page/60 transition-colors"
              >
                <td className="px-4 py-2 font-medium text-ink">
                  {r.student_name}
                  {r.is_print_club && (
                    <span className="ml-1.5 inline-block text-[10px] uppercase tracking-wide text-sage bg-sage/10 rounded px-1.5 py-0.5">
                      Print club
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted">{r.requested_by ?? "—"}</td>
                <td className="px-4 py-2 text-ink">
                  {r.prize?.name ?? r.free_text_prize ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted">
                  {(r.franchiseTags ?? []).map((t) => t.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-2 text-muted capitalize">{r.size ?? "—"}</td>
                <td className="px-4 py-2 text-muted">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(r.colorFilaments ?? []).length === 0 && "—"}
                    {(r.colorFilaments ?? []).map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1">
                        {c.swatch_hex && (
                          <span
                            className="inline-block w-2 h-2 rounded-full border border-border-warm-strong"
                            style={{ background: c.swatch_hex }}
                            aria-hidden="true"
                          />
                        )}
                        {c.color_name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-muted whitespace-nowrap">{r.date_requested}</td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <StatusSelect requestId={r.id} status={r.status} onChange={onStatusChange} />
                </td>
                <td className="px-4 py-2 text-muted max-w-[220px] truncate">
                  {r.links ?? r.notes ?? "—"}
                </td>
                <td
                  className="px-4 py-2 text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionButton
                    action={onDelete.bind(null, r.id)}
                    toastMessage="Request deleted"
                    confirmMessage={`Delete ${r.student_name}'s request? This can't be undone.`}
                    className="text-xs text-rust hover:underline"
                  >
                    Delete
                  </ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-ink/20"
            onClick={() => setActiveId(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg bg-card h-full overflow-y-auto shadow-xl border-l border-border-warm p-6 space-y-4">
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
              action={async (formData) => {
                setActiveId(null);
                await onUpdate(active.id, formData);
              }}
              onCancel={() => setActiveId(null)}
              initial={active}
              initialFranchiseTags={(active.franchiseTags ?? []).map((t) => t.name)}
              initialColorFilamentIds={(active.colorFilaments ?? []).map((c) => c.id)}
              prizes={prizes}
              filaments={filaments}
              allFranchiseTags={allFranchiseTags}
              submitLabel="Save changes"
            />
          </div>
        </div>
      )}
    </>
  );
}
