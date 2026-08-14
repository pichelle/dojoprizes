"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Filter } from "lucide-react";

export type FilterSection = {
  key: string;
  label: string;
  options: { value: string; label: string; swatch?: string | null }[];
};

// A single "Filters" button that drills into one category at a time
// (Color / Size / Status, etc.) instead of a separate chip per category --
// keeps the toolbar from growing a new button every time a filterable
// field is added, and the color list in particular can scroll as long as
// it needs to without widening the row. Drilling in reuses the same
// back-arrow pattern already used elsewhere in the app (e.g. leaving edit
// mode on a request), rather than introducing a new interaction.
export default function FiltersDropdown({
  basePath,
  sections,
}: {
  basePath: string;
  sections: FilterSection[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [drilledKey, setDrilledKey] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setDrilledKey(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectedFor(key: string) {
    return (searchParams.get(key) ?? "").split(",").filter(Boolean);
  }

  const totalSelected = sections.reduce((sum, s) => sum + selectedFor(s.key).length, 0);

  function toggle(key: string, value: string) {
    const selected = selectedFor(key);
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set(key, next.join(","));
    else params.delete(key);
    router.push(`${basePath}?${params.toString()}`);
  }

  const drilled = sections.find((s) => s.key === drilledKey) ?? null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setDrilledKey(null);
        }}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
          totalSelected > 0
            ? "border-ink bg-ink/5 text-ink"
            : "border-border-warm-strong bg-card text-ink hover:bg-page"
        }`}
      >
        <Filter size={14} className="text-muted" aria-hidden="true" />
        Filters
        {totalSelected > 0 && (
          <span className="text-xs bg-ink text-page rounded-full px-1.5 leading-4">
            {totalSelected}
          </span>
        )}
        <ChevronDown size={14} className="text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-56 bg-card border border-border-warm rounded-md shadow-md p-2">
          {!drilled ? (
            sections.map((s) => {
              const count = selectedFor(s.key).length;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setDrilledKey(s.key)}
                  className="w-full flex items-center justify-between text-sm text-ink rounded-md px-2 py-2 hover:bg-nav-hover transition-colors"
                >
                  {s.label}
                  <span className="flex items-center gap-1.5">
                    {count > 0 && (
                      <span className="text-xs bg-ink text-page rounded-full px-1.5 leading-4">
                        {count}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-muted" aria-hidden="true" />
                  </span>
                </button>
              );
            })
          ) : (
            <div className="scroll-warm max-h-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => setDrilledKey(null)}
                className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink rounded-md px-2 py-1.5 mb-1"
              >
                <ChevronLeft size={14} aria-hidden="true" />
                {drilled.label}
              </button>
              {drilled.options.length === 0 && (
                <p className="text-xs text-muted px-2 py-1">No options yet.</p>
              )}
              {drilled.options.map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-2 text-sm text-ink cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-page"
                >
                  <input
                    type="checkbox"
                    checked={selectedFor(drilled.key).includes(o.value)}
                    onChange={() => toggle(drilled.key, o.value)}
                    className="accent-ink"
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
      )}
    </div>
  );
}
