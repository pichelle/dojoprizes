"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/Select";

export default function RequestsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/requests?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Select
        value={searchParams.get("sort") ?? "date"}
        onValueChange={(v) => updateParam("sort", v === "date" ? "" : v)}
        className="w-52"
        options={[
          { value: "date", label: "Sort: Date (newest)" },
          { value: "price_asc", label: "Price: low to high" },
          { value: "price_desc", label: "Price: high to low" },
        ]}
      />
    </div>
  );
}
