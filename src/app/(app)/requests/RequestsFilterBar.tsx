"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import FiltersDropdown, { type FilterSection } from "@/components/FiltersDropdown";

const SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
  { value: "true_to_size", label: "True to size" },
];

const STATUS_OPTIONS = [
  { value: "idea", label: "Idea" },
  { value: "pending", label: "Pending" },
  { value: "printed", label: "Printed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

export default function RequestsFilterBar({
  colorOptions,
  // Status only makes sense to filter by in the table view -- the board
  // already separates by status via its columns, so showing a redundant
  // (and partially misleading, since Fulfilled isn't a board column)
  // status filter there would just be confusing.
  showStatus,
}: {
  colorOptions: { value: string; label: string; swatch?: string | null }[];
  showStatus: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/requests?${params.toString()}`);
  }

  const hasActiveFilters =
    Boolean(searchParams.get("color")) ||
    Boolean(searchParams.get("size")) ||
    Boolean(searchParams.get("status")) ||
    Boolean(searchParams.get("q"));

  function clearFilters() {
    setQ("");
    router.push("/requests");
  }

  const sections: FilterSection[] = [
    { key: "color", label: "Color", options: colorOptions },
    { key: "size", label: "Size", options: SIZE_OPTIONS },
    ...(showStatus ? [{ key: "status", label: "Status", options: STATUS_OPTIONS }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 text-sm">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search by ninja or prize..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", q);
          }}
          onBlur={() => updateParam("q", q)}
          className="rounded-md border border-border-warm-strong pl-9 pr-3 py-2 w-56 bg-card focus:outline-none focus:ring-2 focus:ring-sage"
        />
      </div>
      <FiltersDropdown basePath="/requests" sections={sections} />
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="flex items-center gap-1 text-muted hover:text-ink transition-colors"
        >
          <X size={14} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
