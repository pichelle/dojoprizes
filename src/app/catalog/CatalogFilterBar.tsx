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
    <div className="flex flex-wrap gap-2 items-center text-sm">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search by name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", q);
          }}
          onBlur={() => updateParam("q", q)}
          className="rounded-md border border-border-warm-strong pl-8 pr-3 py-1.5 w-48 bg-card focus:outline-none focus:ring-2 focus:ring-sage"
        />
      </div>
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
    </div>
  );
}
