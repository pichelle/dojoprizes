"use client";

import { useEffect } from "react";
import ErrorNote from "@/components/ErrorNote";

export default function FilamentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Filament page error:", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl text-ink">Filament inventory</h1>
      <ErrorNote>
        {error.message || "Something went wrong loading filament."}
      </ErrorNote>
      <button
        onClick={reset}
        className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
