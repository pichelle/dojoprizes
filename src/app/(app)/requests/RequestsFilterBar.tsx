"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import ColorFilterDropdown from "@/components/ColorFilterDropdown";

const SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
];

export default function RequestsFilterBar({
  colorOptions,
}: {
  colorOptions: { value: string; label: string; swatch?: string | null }[];
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
    Boolean(searchParams.get("q"));

  function clearFilters() {
    setQ("");
    router.push("/requests");
  }

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 text-sm">
      <ColorFilterDropdown basePath="/requests" options={colorOptions} />
      <ColorFilterDropdown
        basePath="/requests"
        options={SIZE_OPTIONS}
        paramName="size"
        label="Size"
      />
      <div className="relative">
        <input
          type="text"
          placeholder="Search by ninja or prize..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", q);
          }}
          onBlur={() => updateParam("q", q)}
          className="rounded-md border border-border-warm-strong pl-3 pr-8 py-1.5 w-56 bg-card focus:outline-none focus:ring-2 focus:ring-sage"
        />
        <Search
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          aria-hidden="true"
        />
      </div>
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
