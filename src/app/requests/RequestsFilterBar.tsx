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
                ? "bg-neutral-900 text-white border-neutral-900"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-wrap gap-2 items-center text-sm">
        <select
          value={searchParams.get("franchise") ?? ""}
          onChange={(e) => updateParam("franchise", e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
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
          className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
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
          className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
        >
          <option value="">Sort: Date (newest)</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push("/requests")}
            className="text-neutral-500 hover:text-neutral-900 underline ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
