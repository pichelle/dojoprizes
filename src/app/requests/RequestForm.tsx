"use client";

import { useState } from "react";
import type { Prize } from "@/lib/types";

export default function RequestForm({
  prizes,
  action,
}: {
  prizes: Pick<Prize, "id" | "name">[];
  action: (formData: FormData) => void;
}) {
  const [prizeId, setPrizeId] = useState("");

  return (
    <form action={action} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Student name
          </label>
          <input
            name="student_name"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Date requested
          </label>
          <input
            type="date"
            name="date_requested"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Prize (from catalog)
          </label>
          <select
            name="prize_id"
            value={prizeId}
            onChange={(e) => setPrizeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Not catalogued yet / other</option>
            {prizes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            If not catalogued, describe it
          </label>
          <input
            name="free_text_prize"
            disabled={!!prizeId}
            placeholder="e.g. custom Bulbasaur keychain"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
      >
        Log request
      </button>
    </form>
  );
}
