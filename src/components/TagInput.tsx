"use client";

import { useMemo, useRef, useState } from "react";

// Notion-style multi-select "creatable" tag picker. Selected tags are
// submitted as multiple hidden inputs sharing the same `name`, using the
// tag's NAME (not its id) as the value -- the server action resolves each
// name to an existing franchise_tags row or creates a new one, so newly
// typed tags don't need an id yet on the client.
export default function TagInput({
  name,
  allTags,
  initialTags = [],
  placeholder = "Add a tag...",
}: {
  name: string;
  allTags: { id: string; name: string }[];
  initialTags?: string[];
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<string[]>(initialTags);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedSelected = useMemo(
    () => selected.map((s) => s.toLowerCase()),
    [selected],
  );

  const filtered = allTags
    .filter((t) => !normalizedSelected.includes(t.name.toLowerCase()))
    .filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()));

  const trimmedQuery = query.trim();
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const canCreate =
    trimmedQuery.length > 0 &&
    !exactMatch &&
    !normalizedSelected.includes(trimmedQuery.toLowerCase());

  function addTag(tagName: string) {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    if (normalizedSelected.includes(trimmed.toLowerCase())) {
      setQuery("");
      return;
    }
    setSelected((prev) => [...prev, trimmed]);
    setQuery("");
  }

  function removeTag(tagName: string) {
    setSelected((prev) => prev.filter((t) => t !== tagName));
  }

  function handleBlur() {
    // Delay closing so a click on a dropdown option registers first.
    closeTimeout.current = setTimeout(() => setOpen(false), 150);
  }

  function handleFocus() {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setOpen(true);
  }

  return (
    <div className="relative">
      {selected.map((t) => (
        <input key={t} type="hidden" name={name} value={t} />
      ))}
      <div className="flex flex-wrap gap-1 items-center rounded-md border border-neutral-300 px-2 py-1.5 focus-within:ring-2 focus-within:ring-neutral-900">
        {selected.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="text-neutral-400 hover:text-neutral-700"
              aria-label={`Remove ${t}`}
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
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              if (canCreate) addTag(trimmedQuery);
              else if (filtered[0]) addTag(filtered[0].name);
            } else if (
              e.key === "Backspace" &&
              query === "" &&
              selected.length > 0
            ) {
              removeTag(selected[selected.length - 1]);
            }
          }}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[8rem] text-sm outline-none py-0.5"
        />
      </div>

      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-md max-h-48 overflow-y-auto text-sm">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(t.name)}
              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100"
            >
              {t.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(trimmedQuery)}
              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 text-neutral-700"
            >
              Create &quot;{trimmedQuery}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
