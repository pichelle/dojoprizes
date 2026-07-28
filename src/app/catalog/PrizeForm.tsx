"use client";

import { useState } from "react";
import type { Filament, Prize } from "@/lib/types";

const STATUS_OPTIONS: { value: Prize["status"]; label: string }[] = [
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "print_on_request", label: "Print-on-request only" },
];

export default function PrizeForm({
  action,
  initial,
  allFilaments,
  linkedFilamentIds = [],
  submitLabel = "Save prize",
}: {
  action: (formData: FormData) => void;
  initial?: Partial<Prize>;
  allFilaments: Pick<Filament, "id" | "color_name">[];
  linkedFilamentIds?: string[];
  submitLabel?: string;
}) {
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "");
  const [makerworldLink, setMakerworldLink] = useState(
    initial?.makerworld_link ?? "",
  );
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    <form action={action} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            Name
          </label>
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            Print source (MakerWorld link / design name)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              name="makerworld_link"
              placeholder="https://makerworld.com/... or design name"
              value={makerworldLink}
              onChange={(e) => setMakerworldLink(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={fetchImageFromMakerworld}
              disabled={fetching}
              className="whitespace-nowrap rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50"
            >
              {fetching ? "Fetching…" : "Fetch image"}
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Pulls the preview image from that link automatically. If it
            doesn&apos;t work (some links don&apos;t expose one), just paste a
            photo URL below.
          </p>
          {fetchError && (
            <p className="mt-1 text-xs text-red-600">{fetchError}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            Photo URL
          </label>
          <input
            name="photo_url"
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Preview"
              className="mt-2 h-20 w-20 object-cover rounded-md border border-neutral-200"
              onError={(e) => (e.currentTarget.style.display = "none")}
              onLoad={(e) => (e.currentTarget.style.display = "block")}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Franchise / category
          </label>
          <input
            name="franchise"
            placeholder="Pokémon, Hello Kitty, Minecraft, custom..."
            defaultValue={initial?.franchise ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Coin tier
          </label>
          <select
            name="coin_tier"
            defaultValue={initial?.coin_tier ?? "silver"}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
          >
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="obsidian">Obsidian</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            name="status"
            defaultValue={initial?.status ?? "in_stock"}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Stock count
          </label>
          <input
            type="number"
            min={0}
            name="stock_count"
            defaultValue={initial?.stock_count ?? 0}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Listed price (in Silver coins)
          </label>
          <input
            type="number"
            min={0}
            step="1"
            name="coin_price"
            placeholder="e.g. 30 = 1 Obsidian + 1 Gold"
            defaultValue={initial?.coin_price ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Tracking only — not used anywhere else. Enter the total value in
            Silver-equivalent coins (5 Silver = 1 Gold, 25 Silver = 1
            Obsidian); the catalog card shows it broken down, e.g. &quot;1
            Obsidian, 1 Gold&quot;.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Filament colors this prize uses
        </label>
        <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-md p-2 grid sm:grid-cols-2 gap-1">
          {allFilaments.length === 0 && (
            <p className="text-sm text-neutral-400 col-span-2">
              Add filament colors on the Filament page first to link them
              here.
            </p>
          )}
          {allFilaments.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm">
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
        className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
