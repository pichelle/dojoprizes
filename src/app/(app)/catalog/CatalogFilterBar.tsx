"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import Select from "@/components/Select";

export default function CatalogFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/catalog?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <Select
        value={searchParams.get("sort") ?? "name"}
        onValueChange={(v) => updateParam("sort", v === "name" ? "" : v)}
        className="w-48"
        options={[
          { value: "name", label: "Sort: Name (A–Z)" },
          { value: "price_asc", label: "Price: low to high" },
          { value: "price_desc", label: "Price: high to low" },
        ]}
      />
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name..."
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
    </div>
  );
}
