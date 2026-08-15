"use client";

import { useMemo, useRef, useState } from "react";

// Multiselect picker with chips, restricted to a fixed set of options (no
// creating new ones -- for that, see TagInput). Selected options are
// submitted as multiple hidden inputs sharing the same `name`, using each
// option's value.
export default function MultiSelect({
  name,
  options,
  initialValues = [],
  placeholder = "Select...",
  onChange,
  // Optional pinned entry shown at the top of the dropdown, above the
  // searchable option list, kept separate from `options`/`selected`
  // because it isn't a real value from the same set (e.g. "Any color" is
  // a separate boolean on the request, not a filament id) -- but it's
  // still meant to coexist with real picks, not replace them, so it
  // renders as its own removable chip alongside whatever else is chosen.
  anyOption,
  anySelected = false,
  onAnyToggle,
}: {
  name: string;
  options: { value: string; label: string; swatch?: string | null }[];
  initialValues?: string[];
  placeholder?: string;
  onChange?: (values: string[]) => void;
  anyOption?: { label: string };
  anySelected?: boolean;
  onAnyToggle?: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialValues);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedOptions = useMemo(
    () => selected.map((v) => options.find((o) => o.value === v)).filter(Boolean) as typeof options,
    [selected, options],
  );

  const filtered = options
    .filter((o) => !selected.includes(o.value))
    .filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));

  function addValue(value: string) {
    setSelected((prev) => {
      const next = prev.includes(value) ? prev : [...prev, value];
      onChange?.(next);
      return next;
    });
    setQuery("");
  }

  function removeValue(value: string) {
    setSelected((prev) => {
      const next = prev.filter((v) => v !== value);
      onChange?.(next);
      return next;
    });
  }

  function handleBlur() {
    closeTimeout.current = setTimeout(() => setOpen(false), 150);
  }

  function handleFocus() {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setOpen(true);
  }

  return (
    <div className="relative">
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <div className="flex flex-wrap gap-1 items-center rounded-md border border-border-warm-strong bg-card px-2 py-1.5 transition-colors hover:border-border-hover focus-within:ring-2 focus-within:ring-sage">
        {anyOption && anySelected && (
          <span className="chip-hover inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-page text-ink">
            {anyOption.label}
            <button
              type="button"
              onClick={onAnyToggle}
              className="text-muted hover:text-ink"
              aria-label={`Remove ${anyOption.label}`}
            >
              ×
            </button>
          </span>
        )}
        {selectedOptions.map((o) => (
          <span
            key={o.value}
            className="chip-hover inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-page text-ink"
          >
            {o.swatch && (
              <span
                className="inline-block w-2 h-2 rounded-full border border-border-warm-strong shrink-0"
                style={{ background: o.swatch }}
                aria-hidden="true"
              />
            )}
            {o.label}
            <button
              type="button"
              onClick={() => removeValue(o.value)}
              className="text-muted hover:text-ink"
              aria-label={`Remove ${o.label}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) addValue(filtered[0].value);
            } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
              removeValue(selected[selected.length - 1]);
            }
          }}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[8rem] text-sm outline-none py-0.5 bg-transparent"
        />
      </div>

      {open && (anyOption && !anySelected ? true : filtered.length > 0) && (
        <div className="absolute z-20 mt-1 w-full bg-card border border-border-warm rounded-md shadow-md max-h-48 overflow-y-auto text-sm">
          {anyOption && !anySelected && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onAnyToggle}
              className={`w-full text-left px-3 py-1.5 text-ink hover:bg-page flex items-center gap-2 font-medium ${
                filtered.length > 0 ? "border-b border-border-warm" : ""
              }`}
            >
              {anyOption.label}
            </button>
          )}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addValue(o.value)}
              className="w-full text-left px-3 py-1.5 text-ink hover:bg-page flex items-center gap-2"
            >
              {o.swatch && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full border border-border-warm-strong shrink-0"
                  style={{ background: o.swatch }}
                  aria-hidden="true"
                />
              )}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
