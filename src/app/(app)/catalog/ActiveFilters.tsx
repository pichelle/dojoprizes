"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { Filament } from "@/lib/types";

const SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "X-Large",
  true_to_size: "True to size",
};

const STATUS_LABELS: Record<string, string> = {
  in_stock: "In stock",
  print_on_request: "Print-on-request",
};

const FILTER_KEYS = ["theme", "color", "size", "status"] as const;

// Shows a chip per applied filter (independent of whatever's checked but
// not-yet-applied in the sidebar) so it's obvious at a glance what's
// actually narrowing the results below -- with a one-click "x" per chip
// and a "Clear filters" button for all of them at once.
export default function ActiveFilters({
  colorOptions,
}: {
  colorOptions: Pick<Filament, "id" | "color_name">[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const colorLabels = Object.fromEntries(colorOptions.map((f) => [f.id, f.color_name]));

  function labelFor(key: (typeof FILTER_KEYS)[number], value: string) {
    if (key === "theme") return value;
    if (key === "color") return colorLabels[value] ?? value;
    if (key === "size") return SIZE_LABELS[value] ?? value;
    return STATUS_LABELS[value] ?? value;
  }

  const chips: { key: (typeof FILTER_KEYS)[number]; value: string; label: string }[] = [];
  for (const key of FILTER_KEYS) {
    const raw = searchParams.get(key);
    if (!raw) continue;
    for (const value of raw.split(",").filter(Boolean)) {
      chips.push({ key, value, label: labelFor(key, value) });
    }
  }

  if (chips.length === 0) return null;

  function removeChip(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const remaining = (params.get(key) ?? "").split(",").filter((v) => v && v !== value);
    if (remaining.length > 0) params.set(key, remaining.join(","));
    else params.delete(key);
    router.push(params.toString() ? `/catalog?${params.toString()}` : "/catalog");
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_KEYS) params.delete(key);
    router.push(params.toString() ? `/catalog?${params.toString()}` : "/catalog");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={`${c.key}-${c.value}`}
          type="button"
          onClick={() => removeChip(c.key, c.value)}
          className="flex items-center gap-1 text-xs font-medium bg-nav border border-border-warm-strong rounded-full pl-2.5 pr-1.5 py-1 text-ink hover:bg-nav-hover shrink-0 max-w-full"
        >
          <span className="truncate">{c.label}</span>
          <X size={11} className="shrink-0" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs text-muted hover:text-ink underline"
      >
        Clear filters
      </button>
    </div>
  );
}
