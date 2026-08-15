"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Clock, Coins, ExternalLink, Palette, Ruler, Tags, User, type LucideIcon } from "lucide-react";
import { formatCoinPriceBreakdown } from "@/lib/coins";
import { formatSize } from "@/lib/requestFormatting";
import ActionButton from "@/components/ActionButton";
import ImageWithFallback from "@/components/ImageWithFallback";
import { staggerDelay } from "@/lib/stagger";
import SidePeek from "@/components/SidePeek";
import Tooltip from "@/components/Tooltip";
import EmptyStateMascot from "@/components/EmptyStateMascot";

// Same row layout as the Requests side peek's DetailRow (icon + label +
// value) -- duplicated locally rather than imported since RequestsKanban
// doesn't export it, matching how RequestsTable already keeps its own
// isolated copy instead of reaching into the board component.
function DetailRow({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: React.ReactNode }) {
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

export type MergedCheckoutRow = {
  id: string;
  rawId: string;
  source: "bin" | "request";
  date: string;
  itemName: string;
  who: string | null;
  requestedBy: string | null;
  size: string | null;
  colors: { id: string; color_name: string; swatch_hex: string | null }[];
  themeTags: { id: string; name: string }[];
  price: number | null;
  makerworldLink: string | null;
  photoUrl: string | null;
  isPrintClub: boolean;
};

// "Request" reuses the accent tint/hover now that the standalone
// print-club-bg/text tokens have been removed (they were only ever used
// here) -- keeps the two source pills visually distinct without
// introducing a color that exists nowhere else in the app.
const SOURCE_META = {
  bin: { label: "Prize bin", bg: "var(--color-pending-bg)", text: "var(--color-pending-text)" },
  request: { label: "Request", bg: "var(--color-sage-tint)", text: "var(--color-sage-hover)" },
};

const SIZE_RANK: Record<string, number> = { small: 0, medium: 1, large: 2, xlarge: 3, true_to_size: 4 };

type Period = "month" | "year" | "all";
const PERIOD_LABEL: Record<Period, string> = { month: "Past month", year: "Past year", all: "All time" };
const PERIOD_DAYS: Record<Period, number> = { month: 30, year: 365, all: Infinity };

type SortKey = "date" | "item" | "size" | "price";
type SortDir = "asc" | "desc" | null;

function daysAgo(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function topCounts(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function SortHeader({
  label,
  sortKeyName,
  ascLabel,
  descLabel,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  sortKeyName: SortKey;
  ascLabel: string;
  descLabel: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey, dir: SortDir) => void;
}) {
  const isActive = sortKey === sortKeyName && sortDir !== null;
  return (
    <th className="px-3 py-2.5 font-medium text-muted text-xs">
      <span className="flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col leading-none">
          <Tooltip label={ascLabel}>
            <button
              type="button"
              onClick={() => onSort(sortKeyName, "asc")}
              aria-label={`Sort ${label}: ${ascLabel}`}
              className={isActive && sortDir === "asc" ? "text-ink" : "text-muted hover:text-ink"}
            >
              <ChevronUp size={11} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip label={descLabel}>
            <button
              type="button"
              onClick={() => onSort(sortKeyName, "desc")}
              aria-label={`Sort ${label}: ${descLabel}`}
              className={isActive && sortDir === "desc" ? "text-ink" : "text-muted hover:text-ink"}
            >
              <ChevronDown size={11} aria-hidden="true" />
            </button>
          </Tooltip>
        </span>
      </span>
    </th>
  );
}

export default function CheckoutsTable({
  rows,
  colorOptions,
  onRemove,
}: {
  rows: MergedCheckoutRow[];
  colorOptions: { id: string; color_name: string; swatch_hex: string | null }[];
  onRemove: (row: { source: "bin" | "request"; rawId: string }) => Promise<void>;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("month");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [sourceFilter, setSourceFilter] = useState<"" | "bin" | "request">("");
  const [colorFilter, setColorFilter] = useState("");
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());

  const active = rows.find((r) => r.id === activeId) ?? null;

  function hideForDelete(id: string) {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
  }

  const trending = useMemo(() => {
    const cutoff = PERIOD_DAYS[period];
    const inPeriod = rows.filter((r) => {
      const age = daysAgo(r.date);
      return age !== null && age <= cutoff;
    });
    const themes = topCounts(inPeriod.flatMap((r) => r.themeTags.map((t) => t.name)), 3);
    const colors = topCounts(inPeriod.flatMap((r) => r.colors.map((c) => c.color_name)), 3);
    const sizes = topCounts(inPeriod.map((r) => r.size).filter((s): s is string => Boolean(s)), 3);
    return { themes, colors, sizes };
  }, [rows, period]);

  function setSort(key: SortKey, dir: SortDir) {
    setSortKey(key);
    setSortDir((prev) => (sortKey === key && prev === dir ? null : dir));
  }

  const filtered = useMemo(() => {
    let list = rows.filter((r) => !pendingDeleteIds.has(r.id));
    if (sourceFilter) list = list.filter((r) => r.source === sourceFilter);
    if (colorFilter) list = list.filter((r) => r.colors.some((c) => c.id === colorFilter));
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter((r) =>
        [r.itemName, r.who, r.requestedBy].filter(Boolean).join(" ").toLowerCase().includes(term),
      );
    }
    return list;
  }, [rows, sourceFilter, colorFilter, q, pendingDeleteIds]);

  const sorted = useMemo(() => {
    if (!sortDir) return filtered;
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "item") cmp = a.itemName.localeCompare(b.itemName);
      else if (sortKey === "size") cmp = (SIZE_RANK[a.size ?? ""] ?? -1) - (SIZE_RANK[b.size ?? ""] ?? -1);
      else if (sortKey === "price") cmp = (a.price ?? -1) - (b.price ?? -1);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1">
        {(["month", "year", "all"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
              period === p ? "bg-ink text-page" : "text-muted hover:bg-nav-hover"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs text-muted mb-2">Trending — {PERIOD_LABEL[period]}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-nav border border-border-warm rounded-xl p-3.5">
            <p className="text-xs text-muted mb-2">Top themes</p>
            {trending.themes.length === 0 && <p className="text-xs text-muted">Not enough data yet.</p>}
            {trending.themes.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm py-0.5">
                <span className="text-ink">{name}</span>
                <span className="text-muted">{count}</span>
              </div>
            ))}
          </div>
          <div className="bg-nav border border-border-warm rounded-xl p-3.5">
            <p className="text-xs text-muted mb-2">Top colors</p>
            {trending.colors.length === 0 && <p className="text-xs text-muted">Not enough data yet.</p>}
            {trending.colors.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm py-0.5">
                <span className="text-ink">{name}</span>
                <span className="text-muted">{count}</span>
              </div>
            ))}
          </div>
          <div className="bg-nav border border-border-warm rounded-xl p-3.5">
            <p className="text-xs text-muted mb-2">Top sizes</p>
            {trending.sizes.length === 0 && <p className="text-xs text-muted">Not enough data yet.</p>}
            {trending.sizes.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm py-0.5">
                <span className="text-ink">{formatSize(name)}</span>
                <span className="text-muted">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as "" | "bin" | "request")}
          className="rounded-md border border-border-warm-strong bg-card px-3 py-1.5 text-sm w-36"
        >
          <option value="">Source</option>
          <option value="bin">Prize bin</option>
          <option value="request">Request</option>
        </select>
        <select
          value={colorFilter}
          onChange={(e) => setColorFilter(e.target.value)}
          className="rounded-md border border-border-warm-strong bg-card px-3 py-1.5 text-sm w-36"
        >
          <option value="">Color</option>
          {colorOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.color_name}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by ninja or prize..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-md border border-border-warm-strong bg-card pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>
      </div>

      <div className="bg-card border border-border-warm rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-nav text-left">
            <tr>
              <SortHeader label="Date" sortKeyName="date" ascLabel="Oldest" descLabel="Most recent" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <SortHeader label="Item" sortKeyName="item" ascLabel="A–Z" descLabel="Z–A" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <th className="px-3 py-2.5 font-medium text-muted text-xs">Who</th>
              <SortHeader label="Size" sortKeyName="size" ascLabel="Small to large" descLabel="Large to small" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <th className="px-3 py-2.5 font-medium text-muted text-xs">Color</th>
              <SortHeader label="Price" sortKeyName="price" ascLabel="Low to high" descLabel="High to low" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <th className="px-3 py-2.5 font-medium text-muted text-xs">Source</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const meta = SOURCE_META[r.source];
              const priceTag = formatCoinPriceBreakdown(r.price);
              return (
                <tr
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  style={{ "--stagger-delay": staggerDelay(i) } as React.CSSProperties}
                  className="stagger-fade-in border-t border-border-warm cursor-pointer hover:bg-nav/40"
                >
                  <td className="px-3 py-2.5 text-muted whitespace-nowrap">{formatShortDate(r.date)}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">{r.itemName}</td>
                  <td className="px-3 py-2.5 text-muted">{r.who ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted">{formatSize(r.size) ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {r.colors.map((c) => c.color_name).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{priceTag ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className="text-[10px] font-medium rounded-full px-2.5 py-1"
                      style={{ background: meta.bg, color: meta.text }}
                    >
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && rows.length === 0 && (
          <EmptyStateMascot
            pose="sparkle"
            message="nothing checked out yet — it'll show up here the first time a prize leaves the shelf"
          />
        )}
        {sorted.length === 0 && rows.length > 0 && (
          <p className="p-4 text-sm text-muted">Nothing matches yet.</p>
        )}
      </div>

      <SidePeek open={Boolean(active)} onClose={() => setActiveId(null)} maxWidth="max-w-md">
        {active && (
          <>
            {active.photoUrl && (
              <ImageWithFallback
                src={active.photoUrl}
                className="w-full h-40 rounded-xl border border-border-warm object-cover"
              />
            )}

            <div className="flex items-center gap-2 min-w-0 pr-8">
              <h2 className="font-serif text-xl text-ink truncate">{active.itemName}</h2>
              {active.isPrintClub && (
                <span className="shrink-0 flex items-center gap-1.5 ml-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/print-club.png" alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
                  <span className="text-xs font-semibold text-ink">3D Print Club</span>
                </span>
              )}
            </div>

            <span
              className="inline-block text-[10px] font-medium rounded-full px-2.5 py-1"
              style={{ background: SOURCE_META[active.source].bg, color: SOURCE_META[active.source].text }}
            >
              {SOURCE_META[active.source].label}
            </span>

            <div className="text-sm">
              <DetailRow label="Date" icon={Clock}>{formatShortDate(active.date)}</DetailRow>
              {active.who && (
                <DetailRow label={active.source === "request" ? "Requested by" : "Bought by"} icon={User}>
                  {active.who}
                </DetailRow>
              )}
              {active.requestedBy && (
                <DetailRow label="Sensei" icon={User}>{active.requestedBy}</DetailRow>
              )}
              {active.size && <DetailRow label="Size" icon={Ruler}>{formatSize(active.size)}</DetailRow>}
              {active.colors.length > 0 && (
                <DetailRow label="Color" icon={Palette}>
                  {active.colors.map((c) => c.color_name).join(", ")}
                </DetailRow>
              )}
              {active.themeTags.length > 0 && (
                <DetailRow label="Theme" icon={Tags}>{active.themeTags.map((t) => t.name).join(", ")}</DetailRow>
              )}
              {formatCoinPriceBreakdown(active.price) && (
                <DetailRow label="Price" icon={Coins}>{formatCoinPriceBreakdown(active.price)}</DetailRow>
              )}
              {active.makerworldLink && (
                <DetailRow label="Link" icon={ExternalLink}>
                  <a
                    href={active.makerworldLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:text-link-hover underline underline-offset-2"
                  >
                    Open ↗
                  </a>
                </DetailRow>
              )}
            </div>

            <ActionButton
              action={async () => {
                await onRemove({ source: active.source, rawId: active.rawId });
                router.refresh();
              }}
              toastMessage="Checkout removed"
              confirmMessage={`Remove this checkout of ${active.itemName}? This can't be undone.`}
              undoable={false}
              onStart={() => {
                setActiveId(null);
                hideForDelete(active.id);
              }}
              className="text-sm text-rust hover:underline"
            >
              Remove this checkout
            </ActionButton>
          </>
        )}
      </SidePeek>
    </div>
  );
}
