"use client";

import { useState } from "react";
import type { Filament, FranchiseTag, Prize, RequestSize } from "@/lib/types";
import TagInput from "@/components/TagInput";

const SIZE_OPTIONS: { value: RequestSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
];

export default function RequestForm({
  prizes,
  filaments,
  allFranchiseTags,
  action,
}: {
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  action: (formData: FormData) => void;
}) {
  const [prizeId, setPrizeId] = useState("");

  return (
    <form action={action} className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink">
            Student name
          </label>
          <input
            name="student_name"
            required
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Date requested
          </label>
          <input
            type="date"
            name="date_requested"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Prize (from catalog)
          </label>
          <select
            name="prize_id"
            value={prizeId}
            onChange={(e) => setPrizeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-border-warm-strong px-3 py-2 text-sm bg-card"
          >
            <option value="">Not catalogued yet / other</option>
            {prizes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            If not catalogued, describe it
          </label>
          <input
            name="free_text_prize"
            disabled={!!prizeId}
            placeholder="e.g. custom Bulbasaur keychain"
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay disabled:bg-page"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Size
          </label>
          <select
            name="size"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-border-warm-strong px-3 py-2 text-sm bg-card"
          >
            <option value="">Not specified</option>
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Color requested/needed
          </label>
          <select
            name="color_filament_id"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-border-warm-strong px-3 py-2 text-sm bg-card"
          >
            <option value="">Not specified</option>
            {filaments.map((f) => (
              <option key={f.id} value={f.id}>
                {f.color_name}
              </option>
            ))}
          </select>
          {filaments.length === 0 && (
            <p className="mt-1 text-xs text-muted">
              Add colors on the Filament page to select one here.
            </p>
          )}
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-ink">
            Theme / franchise tags
          </label>
          <div className="mt-1">
            <TagInput
              name="franchise_tag_names"
              allTags={allFranchiseTags}
              placeholder="Pokémon, Hello Kitty, Minecraft, custom..."
            />
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-ink">
            Reference links (one per line, optional)
          </label>
          <textarea
            name="links"
            rows={2}
            placeholder={"https://makerworld.com/...\nhttps://pinterest.com/..."}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-clay"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-ink">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
      >
        Log request
      </button>
    </form>
  );
}
