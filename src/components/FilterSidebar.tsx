"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type FilterGroup = {
  key: string;
  label: string;
  type: "checkbox" | "radio";
  options: { value: string; label: string; swatch?: string | null }[];
};

export default function FilterSidebar({
  groups,
  basePath,
  extraParams = [],
}: {
  groups: FilterGroup[];
  basePath: string;
  // param keys managed outside this component (e.g. a search box) that
  // should be preserved across Apply/Clear instead of being wiped.
  extraParams?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of groups) {
      const raw = searchParams.get(g.key);
      init[g.key] = raw ? raw.split(",").filter(Boolean) : [];
    }
    return init;
  });

  function toggle(group: FilterGroup, value: string) {
    setSelected((prev) => {
      const current = prev[group.key] ?? [];
      if (group.type === "radio") {
        return { ...prev, [group.key]: current[0] === value ? [] : [value] };
      }
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [group.key]: next };
    });
  }

  function apply() {
    const params = new URLSearchParams();
    for (const key of extraParams) {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    }
    for (const g of groups) {
      const vals = selected[g.key] ?? [];
      if (vals.length > 0) params.set(g.key, vals.join(","));
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function clearAll() {
    setSelected(() => {
      const cleared: Record<string, string[]> = {};
      for (const g of groups) cleared[g.key] = [];
      return cleared;
    });
    const params = new URLSearchParams();
    for (const key of extraParams) {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    }
    router.push(params.toString() ? `${basePath}?${params.toString()}` : basePath);
  }

  const hasAny = Object.values(selected).some((v) => v.length > 0);

  return (
    <div className="bg-card border border-border-warm rounded-xl p-4 h-fit min-w-0 sm:sticky sm:top-6 sm:max-h-[min(28rem,calc(100vh-3rem))] flex flex-col">
      {/* The group list scrolls on its own so the Apply/Clear footer below
          always stays on screen -- it never gets pushed past the fold by a
          long list of filter options. */}
      <div className="scroll-warm space-y-4 overflow-y-auto min-h-0">
        {groups.map((g) => (
          <div key={g.key} className="min-w-0">
            <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              {g.label}
            </div>
            {g.options.length === 0 ? (
              <p className="text-xs text-muted">Nothing to filter by yet.</p>
            ) : (
              <div className="scroll-warm space-y-1.5 max-h-28 overflow-y-auto overflow-x-hidden pr-1">
                {g.options.map((opt) => {
                  const checked = (selected[g.key] ?? []).includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm text-ink cursor-pointer rounded-md px-1.5 py-1 -mx-1.5 transition-colors hover:bg-page min-w-0"
                    >
                      <input
                        type={g.type}
                        name={g.key}
                        checked={checked}
                        onChange={() => toggle(g, opt.value)}
                        className="accent-sage shrink-0"
                      />
                      {opt.swatch && (
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full border border-border-warm-strong shrink-0"
                          style={{ background: opt.swatch }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 pt-3 mt-4 border-t border-border-warm shrink-0">
        <button
          type="button"
          onClick={apply}
          className="rounded-md bg-ink text-page text-sm font-medium px-3 py-2 hover:opacity-90"
        >
          Apply filters
        </button>
        {hasAny && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted hover:text-ink underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
