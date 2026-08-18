"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestStatus } from "@/lib/types";
import RequestsKanban from "./RequestsKanban";
import RequestsTable from "./RequestsTable";
import RequestsFilterBar from "./RequestsFilterBar";

const STORAGE_KEY = "dojoprizes:requestsView";

type View = "board" | "table";

export default function RequestsView({
  requests,
  prizes,
  filaments,
  allFranchiseTags,
  colorOptions,
  onStatusChange,
  onDelete,
  onClearCancelled,
  filtersActive,
}: {
  requests: PrizeRequest[];
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  colorOptions: { value: string; label: string; swatch?: string | null }[];
  onStatusChange: (
    requestId: string,
    status: RequestStatus,
    salePrice?: number | null,
    actor?: string | null,
  ) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
  onClearCancelled: () => Promise<void>;
  filtersActive: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Defaults to board on first-ever visit (and during server render);
  // otherwise picks up whatever was last saved so the page reopens the
  // same way it was left.
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "board";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "board" || saved === "table" ? saved : "board";
  });

  function pick(next: View) {
    setView(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    // Status filtering only exists in the table view (the board already
    // separates by status via its columns) -- switching back to board
    // drops any status filter rather than leaving it silently applied
    // with no visible control left to see or clear it.
    if (next === "board" && searchParams.get("status")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("status");
      router.push(params.size > 0 ? `/requests?${params.toString()}` : "/requests");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-nav border border-border-warm rounded-lg p-1">
          <button
            type="button"
            onClick={() => pick("board")}
            aria-pressed={view === "board"}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-3 py-2 ${
              view === "board" ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <LayoutGrid size={13} aria-hidden="true" />
            Board
          </button>
          <button
            type="button"
            onClick={() => pick("table")}
            aria-pressed={view === "table"}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-3 py-2 ${
              view === "table" ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Table2 size={13} aria-hidden="true" />
            Table
          </button>
        </div>
        <RequestsFilterBar colorOptions={colorOptions} showStatus={view === "table"} />
        <Link
          href="/requests/new"
          className="flex items-center gap-1.5 rounded-md bg-ink text-page px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0 ml-auto"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          Add a request
        </Link>
      </div>

      {view === "board" ? (
        <RequestsKanban
          requests={requests}
          prizes={prizes}
          filaments={filaments}
          allFranchiseTags={allFranchiseTags}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onClearCancelled={onClearCancelled}
          filtersActive={filtersActive}
        />
      ) : (
        <RequestsTable
          requests={requests}
          prizes={prizes}
          filaments={filaments}
          allFranchiseTags={allFranchiseTags}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
