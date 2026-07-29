"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestSize } from "@/lib/types";
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
  initial,
  initialFranchiseTags = [],
  submitLabel = "Log request",
}: {
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  action: (formData: FormData) => void;
  initial?: Partial<PrizeRequest>;
  initialFranchiseTags?: string[];
  submitLabel?: string;
}) {
  const router = useRouter();
  const [prizeId, setPrizeId] = useState(initial?.prize_id ?? NONE_VALUE);

  return (
    <form action={action} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink">
            Ninja name
          </label>
          <input
            name="student_name"
            required
            defaultValue={initial?.student_name ?? ""}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Requested by (sensei)
          </label>
          <input
            name="requested_by"
            required
            placeholder="Your name"
            defaultValue={initial?.requested_by ?? ""}
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
            defaultValue={initial?.date_requested ?? new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink self-end pb-2">
          <input
            type="checkbox"
            name="is_print_club"
            defaultChecked={initial?.is_print_club ?? false}
            className="accent-sage"
          />
          3D Print Club (top priority)
        </label>

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
            defaultValue={initial?.free_text_prize ?? ""}
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
              defaultValue={initial?.size ?? undefined}
              placeholder="Select a size..."
              required
              className="w-full"
              options={SIZE_OPTIONS}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            Remind students that larger prints take more time.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Color requested
          </label>
          <div className="mt-1">
            <Select
              name="color_filament_id"
              defaultValue={initial?.color_filament_id ?? undefined}
              placeholder="Select a color..."
              required
              className="w-full"
              options={filaments.map((f) => ({
                value: f.id,
                label: f.color_name,
                swatch: f.swatch_hex,
              }))}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            Try to keep it at 1-2 colors.
          </p>
          {filaments.length === 0 && (
            <p className="mt-1 text-xs text-muted">
              Add colors on the Filament page to select one here.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink">
            Theme / franchise tags
          </label>
          <div className="mt-1">
            <TagInput
              name="franchise_tag_names"
              allTags={allFranchiseTags}
              initialTags={initialFranchiseTags}
              placeholder="Pokémon, Hello Kitty, Minecraft, custom..."
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink">
            MakerWorld link
          </label>
          <input
            name="makerworld_link"
            type="url"
            defaultValue={initial?.links ?? ""}
            placeholder="https://makerworld.com/..."
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
          <p className="mt-1 text-xs text-muted">
            Highly recommended, and much appreciated. It&apos;s the most helpful thing you can add.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={initial?.notes ?? ""}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>
      </div>

      <p className="text-sm text-muted bg-page rounded-md px-3 py-2">
        Most requests take 1 to 4 weeks. Please remind the ninja to be patient
        as other projects print too!
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.push("/requests")}
          className="text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
