"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  print_on_request: "Print-on-request",
};

export default function CatalogFilterBar({
  franchiseOptions,
  colorOptions,
}: {
  franchiseOptions: string[];
  colorOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const hasFilters = ["q", "status", "franchise", "color", "sort"].some((k) =>
    searchParams.get(k),
  );

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/catalog?${params.toString()}`);
  }

  function clearAll() {
    setQ("");
    router.push("/catalog");
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-wrap gap-2 items-center text-sm">
      <input
        type="text"
        placeholder="Search by name..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParam("q", q);
        }}
        onBlur={() => updateParam("q", q)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 w-40"
      />
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
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
      >
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("sort") ?? ""}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
      >
        <option value="">Sort: Name (A–Z)</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="text-neutral-500 hover:text-neutral-900 underline ml-auto"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
