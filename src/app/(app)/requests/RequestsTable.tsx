"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Clock,
  Coins,
  ExternalLink,
  Palette,
  Pencil,
  Ruler,
  StickyNote,
  Tags,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestStatus } from "@/lib/types";
import StatusPill from "./StatusPill";
import RequestForm from "./RequestForm";
import RequestComments from "./RequestComments";
import ActionButton from "@/components/ActionButton";
import ImageWithFallback from "@/components/ImageWithFallback";
import SidePeek from "@/components/SidePeek";
import { updateRequestInline } from "./actions";
import { showToast } from "@/components/ToastHost";
import { formatCoinPriceBreakdown } from "@/lib/coins";
import { useProfiles } from "@/components/ProfileContext";
import ProfileChip from "@/components/ProfileChip";
import { formatColor, formatRequestedAgo, formatRequestDateDetailed, formatSize, printTitle } from "@/lib/requestFormatting";
import { staggerDelay } from "@/lib/stagger";

const UNDO_WINDOW_MS = 5000;

type Override = { status: RequestStatus; salePrice: number | null };

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

export default function RequestsTable({
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
  const { profiles } = useProfiles();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [peekMode, setPeekMode] = useState<"view" | "edit">("view");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const effectiveRequests = useMemo(
    () =>
      requests
        .filter((r) => !pendingDeleteIds.has(r.id))
        .map((r) => {
          const o = overrides[r.id];
          if (!o) return r;
          return { ...r, status: o.status, sale_price: o.salePrice };
        }),
    [requests, overrides, pendingDeleteIds],
  );

  // Clears an optimistic override once the server `requests` prop already
  // reflects it -- see the matching comment in RequestsKanban's handlePick
  // for why this can't just happen right after router.refresh() is called.
  // Adjusted during render (React's documented pattern for reacting to a
  // changed prop) rather than in a useEffect, so there's no extra frame
  // where the override is already gone but `requests` hasn't caught up.
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
  }

  const sortedRequests = useMemo(() => {
    const rows = [...effectiveRequests];
    rows.sort((a, b) =>
      sortDir === "asc"
        ? a.date_requested.localeCompare(b.date_requested)
        : b.date_requested.localeCompare(a.date_requested),
    );
    return rows;
  }, [effectiveRequests, sortDir]);

  const active = effectiveRequests.find((r) => r.id === activeId) ?? null;

  function handlePick(requestId: string, next: RequestStatus, salePrice?: number | null) {
    const current = effectiveRequests.find((r) => r.id === requestId);
    if (!current) return;
    const previous: Override = { status: current.status, salePrice: current.sale_price };
    const resolvedPrice = salePrice !== undefined ? salePrice : current.sale_price;

    setOverrides((prev) => ({ ...prev, [requestId]: { status: next, salePrice: resolvedPrice } }));

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      (async () => {
        await onStatusChange(requestId, next, salePrice);
        router.refresh();
        // Not clearing the override here -- see the effect above.
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

  if (effectiveRequests.length === 0) {
    return <p className="text-sm text-muted">No requests match yet.</p>;
  }

  return (
    <>
      <div className="scroll-warm border border-border-warm rounded-2xl bg-nav overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-border-warm">
              <th className="sticky left-0 z-10 bg-nav text-left text-xs font-bold text-muted px-3 py-2.5 shadow-[3px_0_6px_-3px_rgba(0,0,0,0.15)]">
                Prize
              </th>
              <th className="text-left text-xs font-bold text-muted px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  Requested
                  {sortDir === "asc" ? (
                    <ArrowUp size={12} aria-hidden="true" />
                  ) : (
                    <ArrowDown size={12} aria-hidden="true" />
                  )}
                </button>
              </th>
              <th className="text-left text-xs font-bold text-muted px-3 py-2.5">Student</th>
              <th className="text-left text-xs font-bold text-muted px-3 py-2.5">Status</th>
              <th className="text-left text-xs font-bold text-muted px-3 py-2.5">Link</th>
              <th className="text-left text-xs font-bold text-muted px-3 py-2.5">Size</th>
              <th className="text-left text-xs font-bold text-muted px-3 py-2.5">Color</th>
            </tr>
          </thead>
          <tbody>
            {sortedRequests.map((r, i) => {
              const catalogPrice = r.prize?.coin_price ?? null;
              const colors = r.colorFilaments ?? [];
              return (
                <tr
                  key={r.id}
                  onClick={() => {
                    setActiveId(r.id);
                    setPeekMode("view");
                  }}
                  style={{ "--stagger-delay": staggerDelay(i) } as React.CSSProperties}
                  className="group stagger-fade-in border-b border-border-warm/50 last:border-b-0 bg-card hover:bg-nav-hover cursor-pointer transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-card group-hover:bg-nav-hover font-semibold text-ink px-3 py-2.5 shadow-[3px_0_6px_-3px_rgba(0,0,0,0.15)] transition-colors">
                    {printTitle(r)}
                  </td>
                  <td className="text-muted px-3 py-2.5 whitespace-nowrap">
                    {formatRequestedAgo(r.date_requested, r.status).replace(/^(Requested|Added) /, "")}
                  </td>
                  <td className="text-muted px-3 py-2.5">{r.originated_as_idea ? "—" : r.student_name}</td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <StatusPill
                      status={r.status}
                      catalogPrice={catalogPrice}
                      isPrintClub={r.is_print_club}
                      originatedAsIdea={r.originated_as_idea}
                      onPick={(next, salePrice) => handlePick(r.id, next, salePrice)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {r.links ? (
                      <a
                        href={r.links}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-link hover:text-link-hover underline underline-offset-2"
                      >
                        Link
                      </a>
                    ) : (
                      <span className="text-taupe">—</span>
                    )}
                  </td>
                  <td className="text-muted px-3 py-2.5">{formatSize(r.size) ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {r.color_any || colors.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.color_any && <span className="text-xs text-muted">Any color</span>}
                        {colors.map((c) => (
                          <span key={c.id} className="flex items-center gap-1 text-xs text-muted">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full border border-border-warm-strong shrink-0"
                              style={{ background: c.swatch_hex ?? "var(--color-taupe)" }}
                              aria-hidden="true"
                            />
                            {c.color_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-taupe">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setPeekMode("edit")}
                      className="flex items-center gap-1.5 text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-nav"
                    >
                      <Pencil size={13} aria-hidden="true" />
                      Edit
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
                      className="flex items-center gap-1.5 text-sm text-rust"
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
                    <DetailRow label="Color" icon={Palette}>
                      {formatColor(active)}
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

                <RequestComments requestId={active.id} comments={active.comments ?? []} />
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
    </>
  );
}
