"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import ColorFilterDropdown from "@/components/ColorFilterDropdown";

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

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
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
          className="rounded-md border border-border-warm-strong pl-8 pr-3 py-1.5 w-56 bg-card focus:outline-none focus:ring-2 focus:ring-sage"
        />
      </div>
      <ColorFilterDropdown basePath="/requests" options={colorOptions} />
    </div>
  );
}
