"use client";

import { useState } from "react";
import type { Filament, FranchiseTag, Prize } from "@/lib/types";
import { coinPriceToBreakdown } from "@/lib/coins";
import TagInput from "@/components/TagInput";
import Select, { NONE_VALUE } from "@/components/Select";

const STATUS_OPTIONS: { value: Prize["status"]; label: string }[] = [
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "print_on_request", label: "Print-on-request only" },
];

const SIZE_OPTIONS: { value: NonNullable<Prize["size"]>; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
];

export default function PrizeForm({
  action,
  initial,
  allFilaments,
  linkedFilamentIds = [],
  allFranchiseTags,
  initialFranchiseTags = [],
  submitLabel = "Save prize",
}: {
  action: (formData: FormData) => void;
  initial?: Partial<Prize>;
  allFilaments: Pick<Filament, "id" | "color_name">[];
  linkedFilamentIds?: string[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  initialFranchiseTags?: string[];
  submitLabel?: string;
}) {
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "");
  const [makerworldLink, setMakerworldLink] = useState(
    initial?.makerworld_link ?? "",
  );
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const priceBreakdown = coinPriceToBreakdown(initial?.coin_price);

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
    <form action={action} className="space-y-5">
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
            Print source (MakerWorld link / design name)
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
              className="whitespace-nowrap rounded-md border border-border-warm-strong px-3 py-2 text-sm text-ink hover:bg-page disabled:opacity-50"
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
            Coin tier
          </label>
          <div className="mt-1">
            <Select
              name="coin_tier"
              defaultValue={initial?.coin_tier ?? "silver"}
              className="w-full"
              options={[
                { value: "silver", label: "Silver" },
                { value: "gold", label: "Gold" },
                { value: "obsidian", label: "Obsidian" },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Status
          </label>
          <div className="mt-1">
            <Select
              name="status"
              defaultValue={initial?.status ?? "in_stock"}
              className="w-full"
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Size printed at
          </label>
          <div className="mt-1">
            <Select
              name="size"
              defaultValue={initial?.size ?? NONE_VALUE}
              className="w-full"
              placeholder="Not set"
              options={[
                { value: NONE_VALUE, label: "Not set" },
                ...SIZE_OPTIONS,
              ]}
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
            defaultValue={initial?.stock_count ?? 0}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Listed price
        </label>
        <div className="grid grid-cols-3 gap-3 max-w-md">
          <div>
            <label className="block text-xs text-muted">Silver</label>
            <input
              type="number"
              min={0}
              step="1"
              name="coin_price_silver"
              defaultValue={priceBreakdown.silver || ""}
              placeholder="0"
              className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>
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
        <p className="mt-1 text-xs text-muted">
          Tracking only, not used anywhere else. Handy for checking what a
          prize sold for against what it was meant to cost.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Filament colors this prize uses
        </label>
        <div className="max-h-40 overflow-y-auto border border-border-warm rounded-md p-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {allFilaments.length === 0 && (
            <p className="text-sm text-muted col-span-full">
              Add filament colors on the Filament page first to link them
              here.
            </p>
          )}
          {allFilaments.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="filament_ids"
                value={f.id}
                defaultChecked={linkedFilamentIds.includes(f.id)}
              />
              {f.color_name}
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
