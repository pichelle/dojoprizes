"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/Select";

// Mobile-only twin of the Sort control embedded in CatalogFilterBar --
// rendered instead in FilterSidebar's mobile row (next to the "Filters"
// button) so mobile reads as "Filters + Sort" on one line, "Search + Add
// a prize" on the next, rather than everything piling into a single
// wrapping row. Desktop keeps the original combined Search+Sort bar as-is
// (this component is hidden there via the `sm:hidden` on its call site).
export default function CatalogSortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/catalog?${params.toString()}`);
  }

  return (
    <Select
      value={searchParams.get("sort") ?? "date_desc"}
      onValueChange={(v) => updateParam("sort", v === "date_desc" ? "" : v)}
      className="flex-1 min-w-0 sm:w-40"
      options={[
        { value: "date_desc", label: "Sort: Newest to oldest" },
        { value: "date_asc", label: "Sort: Oldest to newest" },
        { value: "price_asc", label: "Price: low to high" },
        { value: "price_desc", label: "Price: high to low" },
      ]}
    />
  );
}
