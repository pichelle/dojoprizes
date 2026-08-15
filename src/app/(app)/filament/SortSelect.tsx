"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/Select";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "hue", label: "Color" },
  { value: "name", label: "Name (A-Z)" },
  { value: "most_used", label: "Most used" },
  { value: "least_used", label: "Least used" },
];

export default function SortSelect({ sort }: { sort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort by</span>
      <Select
        value={sort}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", value);
          router.push(`/filament?${params.toString()}`);
        }}
        className="w-44"
        options={SORT_OPTIONS}
      />
    </div>
  );
}
