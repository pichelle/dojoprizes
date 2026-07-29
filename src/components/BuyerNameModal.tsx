"use client";

import { useState } from "react";

export default function BuyerNameModal({
  prizeName,
  onConfirm,
  onCancel,
}: {
  prizeName: string;
  onConfirm: (buyerName: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 rounded-xl overflow-hidden">
      <div
        className="absolute inset-0 bg-ink/30"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="modal-in relative bg-card border border-border-warm rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <div>
          <p className="font-serif text-lg font-bold text-ink">Yay!</p>
          <p className="text-sm text-ink mt-1">
            Who&apos;s taking home {prizeName}?
          </p>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm(name.trim());
          }}
          placeholder="Ninja name"
          className="w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
        />
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(name.trim())}
            className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            Sold!
          </button>
        </div>
      </div>
    </div>
  );
}
