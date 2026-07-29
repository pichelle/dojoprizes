"use client";

import { useState } from "react";
import type { Filament, FranchiseTag, Prize, RequestSize } from "@/lib/types";
import TagInput from "@/components/TagInput";
import Select, { NONE_VALUE } from "@/components/Select";

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
  const [prizeId, setPrizeId] = useState(NONE_VALUE);

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
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Requested by (sensei)
          </label>
          <input
            name="requested_by"
            placeholder="Your name"
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
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
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Prize (from catalog)
          </label>
          <div className="mt-1">
            <Select
              name="prize_id"
              value={prizeId}
              onValueChange={setPrizeId}
              className="w-full"
              options={[
                { value: NONE_VALUE, label: "Not catalogued yet / other" },
                ...prizes.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            If not catalogued, describe it
          </label>
          <input
            name="free_text_prize"
            disabled={prizeId !== NONE_VALUE}
            placeholder="e.g. custom Bulbasaur keychain"
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage disabled:bg-page"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Size
          </label>
          <div className="mt-1">
            <Select
              name="size"
              defaultValue={NONE_VALUE}
              className="w-full"
              options={[
                { value: NONE_VALUE, label: "Not specified" },
                ...SIZE_OPTIONS,
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Color requested/needed
          </label>
          <div className="mt-1">
            <Select
              name="color_filament_id"
              defaultValue={NONE_VALUE}
              className="w-full"
              options={[
                { value: NONE_VALUE, label: "Not specified" },
                ...filaments.map((f) => ({ value: f.id, label: f.color_name })),
              ]}
            />
          </div>
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
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-ink">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
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
