"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { Prize } from "@/lib/types";
import FilamentForm from "./FilamentForm";
import SortSelect from "./SortSelect";
import ActionButton from "@/components/ActionButton";
import AmazonLinkButton from "@/components/AmazonLinkButton";
import { createFilamentInline, updateFilamentInline, deleteFilament } from "./actions";

type FilamentWithLinks = {
  id: string;
  color_name: string;
  swatch_hex: string | null;
  material_type: string | null;
  stock_level: number | null;
  stock_unit: string;
  low_stock_threshold: number | null;
  amazon_link: string | null;
  linkedPrizes: { id: string; name: string }[];
};

export default function FilamentBoard({
  filaments,
  prizes,
  sort,
}: {
  filaments: FilamentWithLinks[];
  prizes: Pick<Prize, "id" | "name">[];
  sort: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "new" | { id: string }>(null);

  const active =
    mode && typeof mode === "object" ? filaments.find((f) => f.id === mode.id) ?? null : null;
  const isCreating = mode === "new";
  const open = isCreating || Boolean(active);

  function close() {
    setMode(null);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink">Filament inventory</h1>
          <p className="text-sm text-muted max-w-2xl mt-1">
            Linked to the prize catalog, so you can see which prizes a color
            affects before you run out, and which colors are actually worth
            restocking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode("new")}
          className="flex items-center gap-1.5 rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90 shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          Add a color
        </button>
      </div>

      <SortSelect sort={sort} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filaments.map((f) => {
          const isLow =
            f.low_stock_threshold != null &&
            f.stock_level != null &&
            f.stock_level <= f.low_stock_threshold;

          return (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setMode({ id: f.id })}
              onKeyDown={(e) => {
                if (e.key === "Enter") setMode({ id: f.id });
              }}
              key={f.id}
              className="card-hover cursor-pointer text-left bg-card border border-border-warm rounded-xl p-4 hover:border-border-warm-strong flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-border-warm-strong shrink-0"
                    style={{ background: f.swatch_hex ?? "#c9c2b3" }}
                    aria-hidden="true"
                  />
                  {f.color_name}
                </span>
                <div className="flex flex-col items-end gap-1">
                  {isLow && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rust/10 text-rust whitespace-nowrap">
                      Low stock
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-page text-muted whitespace-nowrap">
                    Used by {f.linkedPrizes.length}{" "}
                    {f.linkedPrizes.length === 1 ? "prize" : "prizes"}
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted">
                {f.material_type ?? "Material not set"}
              </div>
              <div className="text-sm text-ink">
                {f.stock_level ?? "-"} {f.stock_unit}
                {f.low_stock_threshold != null && (
                  <span className="text-muted">
                    {" "}
                    (low below {f.low_stock_threshold})
                  </span>
                )}
              </div>
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                {f.amazon_link ? (
                  <AmazonLinkButton href={f.amazon_link} />
                ) : (
                  <span className="text-xs text-muted">No Amazon link set</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filaments.length === 0 && (
        <p className="text-sm text-muted">
          No filament colors yet. Add your first one to get started.
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-ink/20"
            onClick={close}
            aria-hidden="true"
          />
          <div className="slide-in-right relative w-full max-w-lg bg-card h-full overflow-y-auto shadow-xl border-l border-border-warm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-ink">
                {isCreating ? "Add a filament color" : "Edit filament"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-muted hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <FilamentForm
              key={isCreating ? "new" : active!.id}
              action={
                isCreating ? createFilamentInline : updateFilamentInline.bind(null, active!.id)
              }
              initial={isCreating ? undefined : active!}
              allPrizes={prizes}
              linkedPrizeIds={isCreating ? [] : active!.linkedPrizes.map((p) => p.id)}
              submitLabel={isCreating ? "Add filament" : "Save changes"}
              onCancel={close}
              onSuccess={() => {
                close();
                router.refresh();
              }}
            />

            {!isCreating && (
              <div className="flex items-center justify-between">
                {active!.amazon_link ? (
                  <AmazonLinkButton href={active!.amazon_link} />
                ) : (
                  <span />
                )}
                <ActionButton
                  action={deleteFilament.bind(null, active!.id)}
                  toastMessage="Filament color deleted"
                  confirmMessage={`Delete ${active!.color_name}? This can't be undone.`}
                  className="text-sm text-rust hover:underline"
                >
                  Delete this filament color
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
