"use client";

import { useState } from "react";
import type { Prize } from "@/lib/types";

const STATUS_OPTIONS: { value: Prize["status"]; label: string }[] = [
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "print_on_request", label: "Print-on-request only" },
];

export default function PrizeForm({
  action,
  initial,
  submitLabel = "Save prize",
}: {
  action: (formData: FormData) => void;
  initial?: Partial<Prize>;
  submitLabel?: string;
}) {
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "");

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
            Photo URL
          </label>
          <input
            name="photo_url"
            placeholder="https://..."
            defaultValue={initial?.photo_url ?? ""}
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
            Tags (comma separated)
          </label>
          <input
            name="tags"
            placeholder="red, dragon, small"
            defaultValue={initial?.tags?.join(", ") ?? ""}
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

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            Print source (MakerWorld link / design name)
          </label>
          <input
            name="makerworld_link"
            placeholder="https://makerworld.com/... or design name"
            defaultValue={initial?.makerworld_link ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
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
