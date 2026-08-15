"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Filament, FranchiseTag, Prize, RequestSize } from "@/lib/types";
import { coinPriceToBreakdown } from "@/lib/coins";
import TagInput from "@/components/TagInput";
import Select, { NONE_VALUE } from "@/components/Select";
import ErrorNote from "@/components/ErrorNote";
import { showToast } from "@/components/ToastHost";
import type { PrizeFormState } from "./actions";

const SIZE_OPTIONS: { value: RequestSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
  { value: "true_to_size", label: "True to size" },
];

const initialState: PrizeFormState = { error: null };

export default function PrizeForm({
  action,
  initial,
  allFilaments,
  linkedFilamentIds = [],
  allFranchiseTags,
  initialFranchiseTags = [],
  submitLabel = "Save prize",
  onCancel,
  onSuccess,
}: {
  action: (prevState: PrizeFormState | null, formData: FormData) => Promise<PrizeFormState>;
  initial?: Partial<Prize>;
  allFilaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  linkedFilamentIds?: string[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  initialFranchiseTags?: string[];
  submitLabel?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "");
  const [makerworldLink, setMakerworldLink] = useState(
    initial?.makerworld_link ?? "",
  );
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedFilamentIds, setSelectedFilamentIds] = useState<string[]>(linkedFilamentIds);
  const [colorQuery, setColorQuery] = useState("");

  const priceBreakdown = coinPriceToBreakdown(initial?.coin_price);

  const successHandled = useRef(false);
  useEffect(() => {
    if (state?.success && !successHandled.current) {
      successHandled.current = true;
      showToast(submitLabel === "Save changes" ? "Changes saved" : "Prize added");
      onSuccess?.();
    }
  }, [state, submitLabel, onSuccess]);

  const matchingFilamentIds = useMemo(() => {
    const q = colorQuery.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      allFilaments.filter((f) => f.color_name.toLowerCase().includes(q)).map((f) => f.id),
    );
  }, [colorQuery, allFilaments]);

  function toggleFilament(id: string) {
    setSelectedFilamentIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  async function fetchImageFromMakerworld() {
    if (!makerworldLink.trim()) {
      setFetchError("Paste a MakerWorld link first.");
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(
        `/api/makerworld-preview?url=${encodeURIComponent(makerworldLink.trim())}`,
      );
      const data = await res.json();
      if (data.imageUrl) {
        setPhotoUrl(data.imageUrl);
      } else {
        setFetchError(data.error ?? "Couldn't find an image on that page.");
      }
    } catch {
      setFetchError("Something went wrong fetching that link.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div>
          <ErrorNote>{state.error}</ErrorNote>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-ink">
            Name
          </label>
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-ink">
            MakerWorld link
          </label>
          <div className="mt-1 flex gap-2">
            <input
              name="makerworld_link"
              placeholder="https://makerworld.com/... or design name"
              value={makerworldLink}
              onChange={(e) => setMakerworldLink(e.target.value)}
              className="flex-1 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <button
              type="button"
              onClick={fetchImageFromMakerworld}
              disabled={fetching}
              className="whitespace-nowrap rounded-md border border-border-warm-strong px-3 py-2 text-sm text-ink hover:bg-nav-hover disabled:opacity-50"
            >
              {fetching ? "Fetching…" : "Fetch image"}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            Pulls the preview image from that link automatically. If it
            doesn&apos;t work (some links don&apos;t expose one), just paste a
            photo URL below.
          </p>
          {fetchError && (
            <p className="mt-1 text-xs text-rust">{fetchError}</p>
          )}
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-ink">
            Photo URL
          </label>
          <div className="mt-1 flex items-start gap-3">
            <input
              name="photo_url"
              placeholder="https://..."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="flex-1 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Preview"
                className="h-10 w-10 object-cover rounded-md border border-border-warm shrink-0"
                onError={(e) => (e.currentTarget.style.display = "none")}
                onLoad={(e) => (e.currentTarget.style.display = "block")}
              />
            )}
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
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
          <p className="mt-1 text-xs text-muted">
            Pick from existing tags or type a new one and hit Enter to
            create it.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Size
          </label>
          <div className="mt-1">
            <Select
              name="size"
              defaultValue={initial?.size ?? NONE_VALUE}
              placeholder="Select a size..."
              className="w-full"
              options={[{ value: NONE_VALUE, label: "No size" }, ...SIZE_OPTIONS]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Stock count
          </label>
          <input
            type="number"
            min={0}
            name="stock_count"
            defaultValue={initial?.stock_count ?? 1}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Listed price
        </label>
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <div>
            <label className="block text-xs text-muted">Gold</label>
            <input
              type="number"
              min={0}
              step="1"
              name="coin_price_gold"
              defaultValue={priceBreakdown.gold || ""}
              placeholder="0"
              className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>
          <div>
            <label className="block text-xs text-muted">Obsidian</label>
            <input
              type="number"
              min={0}
              step="1"
              name="coin_price_obsidian"
              defaultValue={priceBreakdown.obsidian || ""}
              placeholder="0"
              className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Filament colors this prize uses
        </label>
        {allFilaments.length === 0 ? (
          <p className="text-sm text-muted">
            Add filament colors on the Filament page first to link them
            here.
          </p>
        ) : (
          <>
            <input
              type="text"
              value={colorQuery}
              onChange={(e) => setColorQuery(e.target.value)}
              placeholder="Start typing to filter colors..."
              className="w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <div className="max-h-48 overflow-y-auto border border-border-warm rounded-md p-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {allFilaments
                .filter((f) => !matchingFilamentIds || matchingFilamentIds.has(f.id))
                .map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 text-sm text-ink rounded-md px-1.5 py-1 hover:bg-nav-hover cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="filament_ids"
                      value={f.id}
                      checked={selectedFilamentIds.includes(f.id)}
                      onChange={() => toggleFilament(f.id)}
                      className="w-4 h-4 accent-sage shrink-0"
                    />
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-border-warm-strong shrink-0"
                      style={{ background: f.swatch_hex ?? "#c9c2b3" }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{f.color_name}</span>
                  </label>
                ))}
              {matchingFilamentIds && matchingFilamentIds.size === 0 && (
                <p className="text-xs text-muted col-span-full">No colors match &quot;{colorQuery}&quot;.</p>
              )}
            </div>
          </>
        )}
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
