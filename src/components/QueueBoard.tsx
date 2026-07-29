"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import Select from "@/components/Select";
import { showToast } from "@/components/ToastHost";
import type { PrizeRequest, RequestSize, RequestStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "printed", label: "Printed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

const SIZE_LABELS: Record<RequestSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "X-Large",
};

export type QueueRequest = PrizeRequest & {
  franchiseTags: { id: string; name: string }[];
  colorFilaments: { id: string; color_name: string; swatch_hex: string | null }[];
};

export default function QueueBoard({
  requests,
  onStatusChange,
}: {
  requests: QueueRequest[];
  onStatusChange: (requestId: string, status: RequestStatus) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openRequest = requests.find((r) => r.id === openId) ?? null;

  function changeStatus(requestId: string, status: RequestStatus) {
    showToast(status === "printed" ? "Marked as printed" : "Status updated");
    onStatusChange(requestId, status);
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing in the queue right now. Logged requests will show up here.
      </p>
    );
  }

  return (
    <>
      <div className="columns-2 md:columns-3 gap-3 [column-fill:_balance]">
        {requests.map((r) => (
          <div
            key={r.id}
            onClick={() => setOpenId(r.id)}
            className="card-hover break-inside-avoid mb-3 bg-card border border-border-warm rounded-xl overflow-hidden cursor-pointer"
          >
            {r.prize?.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.prize.photo_url}
                alt={r.prize.name}
                className="w-full object-cover"
              />
            )}
            <div className="p-3 flex flex-col gap-1.5">
              {r.is_print_club && (
                <span className="self-start text-xs px-2 py-0.5 rounded-full bg-amber/10 text-amber">
                  3D Print Club
                </span>
              )}
              <span className="text-sm font-medium text-ink">{r.student_name}</span>
              <span className="text-xs text-muted">
                {r.prize?.name ?? r.free_text_prize ?? "Prize not specified"}
              </span>
              {r.franchiseTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {r.franchiseTags.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs px-2 py-0.5 rounded-full bg-page text-muted"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
              <div onClick={(e) => e.stopPropagation()} className="pt-1">
                <Select
                  value={r.status}
                  onValueChange={(v) => changeStatus(r.id, v as RequestStatus)}
                  className="text-xs px-2 py-1 w-full"
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {openRequest && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-ink/20"
            onClick={() => setOpenId(null)}
          />
          <div className="relative w-full max-w-sm bg-card border-l border-border-warm h-full overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="font-serif text-xl text-ink pr-4">
                {openRequest.student_name}
              </h2>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                aria-label="Close"
                className="text-muted hover:text-ink shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <Link
              href={`/requests/${openRequest.id}`}
              className="inline-block text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-page"
            >
              Edit details
            </Link>

            {openRequest.prize?.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={openRequest.prize.photo_url}
                alt={openRequest.prize.name}
                className="w-full rounded-lg object-cover"
              />
            )}

            <div className="space-y-3 text-sm">
              <Detail
                label="Prize"
                value={openRequest.prize?.name ?? openRequest.free_text_prize ?? "Not specified"}
              />
              <Detail label="Requested by" value={openRequest.requested_by ?? "-"} />
              <Detail
                label="Size"
                value={openRequest.size ? SIZE_LABELS[openRequest.size] : "Not specified"}
              />
              <Detail
                label="Color"
                value={
                  openRequest.colorFilaments.length > 0
                    ? openRequest.colorFilaments.map((c) => c.color_name).join(", ")
                    : "Not specified"
                }
              />
              <Detail label="Date requested" value={openRequest.date_requested} />
              {openRequest.franchiseTags.length > 0 && (
                <div>
                  <div className="text-xs text-muted mb-1">Theme</div>
                  <div className="flex flex-wrap gap-1">
                    {openRequest.franchiseTags.map((t) => (
                      <span
                        key={t.id}
                        className="text-xs px-2 py-0.5 rounded-full bg-page text-muted"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted mb-1">Status</div>
                <Select
                  value={openRequest.status}
                  onValueChange={(v) => changeStatus(openRequest.id, v as RequestStatus)}
                  className="w-full"
                  options={STATUS_OPTIONS}
                />
              </div>
              {openRequest.links && (
                <div>
                  <div className="text-xs text-muted mb-1">Links</div>
                  <div className="flex flex-col gap-1">
                    {openRequest.links
                      .split("\n")
                      .filter(Boolean)
                      .map((link, i) => (
                        <a
                          key={i}
                          href={link.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sage hover:underline break-all"
                        >
                          {link.trim()}
                        </a>
                      ))}
                  </div>
                </div>
              )}
              {openRequest.notes && <Detail label="Notes" value={openRequest.notes} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted mb-0.5">{label}</div>
      <div className="text-ink">{value}</div>
    </div>
  );
}
