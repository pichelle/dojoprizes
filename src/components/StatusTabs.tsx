"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUS_TABS: { value: string; label: string; dot: string }[] = [
  { value: "", label: "All", dot: "" },
  { value: "pending", label: "Pending", dot: "bg-amber" },
  { value: "printed", label: "Printed", dot: "bg-slate" },
  { value: "fulfilled", label: "Fulfilled", dot: "bg-sage" },
  { value: "cancelled", label: "Cancelled", dot: "bg-rust" },
];

export default function StatusTabs({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("status") ?? "";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-border-warm">
      {STATUS_TABS.map((t) => {
        const isActive = active === t.value;
        return (
          <button
            key={t.value || "all"}
            type="button"
            onClick={() => select(t.value)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.dot && (
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${t.dot}`}
                aria-hidden="true"
              />
            )}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
