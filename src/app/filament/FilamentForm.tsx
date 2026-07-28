"use client";

import type { Filament, Prize } from "@/lib/types";

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
          <label className="block text-sm font-medium text-neutral-700">
            Color name
          </label>
          <input
            name="color_name"
            required
            placeholder="Obsidian Black, Sakura Pink..."
            defaultValue={initial?.color_name ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Material type (optional)
          </label>
          <input
            name="material_type"
            placeholder="PLA, PETG..."
            defaultValue={initial?.material_type ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Stock level
          </label>
          <input
            type="number"
            step="0.1"
            name="stock_level"
            defaultValue={initial?.stock_level ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Unit
          </label>
          <select
            name="stock_unit"
            defaultValue={initial?.stock_unit ?? "spools"}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
          >
            <option value="spools">Spools</option>
            <option value="percent">% remaining</option>
            <option value="grams">Grams</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Low-stock threshold
          </label>
          <input
            type="number"
            step="0.1"
            name="low_stock_threshold"
            defaultValue={initial?.low_stock_threshold ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Prizes that use this color
        </label>
        <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-md p-2 grid sm:grid-cols-2 gap-1">
          {allPrizes.length === 0 && (
            <p className="text-sm text-neutral-400 col-span-2">
              Add prizes to the catalog first to link them here.
            </p>
          )}
          {allPrizes.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
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
        className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
