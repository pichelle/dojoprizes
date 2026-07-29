"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

export default function ColorFilterDropdown({
  basePath,
  options,
}: {
  basePath: string;
  options: { value: string; label: string; swatch?: string | null }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = (searchParams.get("color") ?? "").split(",").filter(Boolean);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set("color", next.join(","));
    else params.delete("color");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
          selected.length > 0
            ? "border-sage bg-sage/10 text-ink"
            : "border-border-warm-strong bg-card text-ink hover:bg-page"
        }`}
      >
        Color
        {selected.length > 0 && (
          <span className="text-xs bg-sage text-page rounded-full px-1.5 leading-4">
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} className="text-muted" aria-hidden="true" />
      </button>
      {open && (
        <div className="scroll-warm absolute z-20 mt-1 w-52 max-h-64 overflow-y-auto bg-card border border-border-warm rounded-md shadow-md p-2">
          {options.length === 0 && (
            <p className="text-xs text-muted px-2 py-1">No colors yet.</p>
          )}
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 text-sm text-ink cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-page"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="accent-sage"
              />
              {o.swatch && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full border border-border-warm-strong shrink-0"
                  style={{ background: o.swatch }}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
