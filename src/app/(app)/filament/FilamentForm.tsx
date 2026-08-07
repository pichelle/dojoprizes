"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Filament, Prize } from "@/lib/types";
import Select from "@/components/Select";
import ErrorNote from "@/components/ErrorNote";
import { showToast } from "@/components/ToastHost";
import type { FilamentFormState } from "./actions";

const initialState: FilamentFormState = { error: null };

export default function FilamentForm({
  action,
  initial,
  allPrizes,
  linkedPrizeIds = [],
  submitLabel = "Save filament",
  onCancel,
  onSuccess,
}: {
  action: (prevState: FilamentFormState | null, formData: FormData) => Promise<FilamentFormState>;
  initial?: Partial<Filament>;
  allPrizes: Pick<Prize, "id" | "name">[];
  linkedPrizeIds?: string[];
  submitLabel?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const successHandled = useRef(false);
  useEffect(() => {
    if (state?.success && !successHandled.current) {
      successHandled.current = true;
      showToast(submitLabel === "Save changes" ? "Changes saved" : "Filament added");
      onSuccess?.();
    }
  }, [state, submitLabel, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}

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

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink">
            Amazon link (optional)
          </label>
          <input
            type="url"
            name="amazon_link"
            placeholder="https://amazon.com/..."
            defaultValue={initial?.amazon_link ?? ""}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
          <p className="mt-1 text-xs text-muted">
            So repurchasing this color when it runs out is one click away.
          </p>
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
