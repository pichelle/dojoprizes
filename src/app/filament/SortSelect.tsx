"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "most_used", label: "Most used" },
  { value: "least_used", label: "Least used" },
];

export default function SortSelect({ sort }: { sort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="sort" className="text-muted">
        Sort by
      </label>
      <select
        id="sort"
        value={sort}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", e.target.value);
          router.push(`/filament?${params.toString()}`);
        }}
        className="rounded-md border border-border-warm-strong px-3 py-1.5 bg-card"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
