"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function RequestsFilterBar({
  franchiseOptions,
  colorOptions,
}: {
  franchiseOptions: string[];
  colorOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusValue = searchParams.get("status") ?? "";
  const hasFilters = ["status", "franchise", "color", "sort"].some((k) =>
    searchParams.get(k),
  );

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/requests?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-sm">
        {["", "pending", "printed", "fulfilled", "cancelled"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => updateParam("status", s)}
            className={`px-3 py-1.5 rounded-full border capitalize ${
              statusValue === s
                ? "bg-ink text-page border-ink"
                : "border-border-warm-strong text-muted hover:bg-page"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border-warm rounded-xl p-3 flex flex-wrap gap-2 items-center text-sm">
        <select
          value={searchParams.get("franchise") ?? ""}
          onChange={(e) => updateParam("franchise", e.target.value)}
          className="rounded-md border border-border-warm-strong px-3 py-1.5 bg-card"
        >
          <option value="">All themes</option>
          {franchiseOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get("color") ?? ""}
          onChange={(e) => updateParam("color", e.target.value)}
          className="rounded-md border border-border-warm-strong px-3 py-1.5 bg-card"
        >
          <option value="">All colors</option>
          {colorOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get("sort") ?? ""}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="rounded-md border border-border-warm-strong px-3 py-1.5 bg-card"
        >
          <option value="">Sort: Date (newest)</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push("/requests")}
            className="text-muted hover:text-ink underline ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
