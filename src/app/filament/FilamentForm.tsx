"use client";

import type { Filament, Prize } from "@/lib/types";
import Select from "@/components/Select";

export default function FilamentForm({
  action,
  initial,
  allPrizes,
  linkedPrizeIds = [],
  submitLabel = "Save filament",
}: {
  action: (formData: FormData) => void;
  initial?: Partial<Filament>;
  allPrizes: Pick<Prize, "id" | "name">[];
  linkedPrizeIds?: string[];
  submitLabel?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink">
            Color name
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              name="swatch_hex"
              defaultValue={initial?.swatch_hex ?? "#c9c2b3"}
              className="h-9 w-9 rounded-md border border-border-warm-strong bg-card p-1 shrink-0"
              title="Swatch color, shown next to the name"
            />
            <input
              name="color_name"
              required
              placeholder="Obsidian Black, Sakura Pink..."
              defaultValue={initial?.color_name ?? ""}
              className="flex-1 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Material type (optional)
          </label>
          <input
            name="material_type"
            placeholder="PLA, PETG..."
            defaultValue={initial?.material_type ?? ""}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Stock level
          </label>
          <input
            type="number"
            step="0.1"
            name="stock_level"
            defaultValue={initial?.stock_level ?? ""}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Unit
          </label>
          <div className="mt-1">
            <Select
              name="stock_unit"
              defaultValue={initial?.stock_unit ?? "spools"}
              className="w-full"
              options={[
                { value: "spools", label: "Spools" },
                { value: "percent", label: "% remaining" },
                { value: "grams", label: "Grams" },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Low-stock threshold
          </label>
          <input
            type="number"
            step="0.1"
            name="low_stock_threshold"
            defaultValue={initial?.low_stock_threshold ?? ""}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Prizes that use this color
        </label>
        <div className="max-h-40 overflow-y-auto border border-border-warm rounded-md p-2 grid sm:grid-cols-2 gap-1">
          {allPrizes.length === 0 && (
            <p className="text-sm text-muted col-span-2">
              Add prizes to the catalog first to link them here.
            </p>
          )}
          {allPrizes.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="prize_ids"
                value={p.id}
                defaultChecked={linkedPrizeIds.includes(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
