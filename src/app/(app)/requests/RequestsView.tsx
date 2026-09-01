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
  onDuplicate,
  onClearCancelled,
  onReorder,
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
  onDuplicate: (requestId: string, actor: string | null) => Promise<string>;
  onClearCancelled: () => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
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
    <div className="space-y-4 sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">
      {/* Mobile (below sm): two rows -- view toggle + "Add a request"
          together on the first, filters alone on the second. Desktop
          (sm+): unchanged, everything back in one flex-wrap row
          (`sm:contents` makes the two mobile grouping divs disappear from
          layout so their children rejoin the single row). */}
      <div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2 sm:contents">
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
          <Link
            href="/requests/new"
            className="sm:hidden flex items-center gap-1.5 rounded-md bg-ink text-page px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0 ml-auto"
          >
            <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
            Add a request
          </Link>
        </div>
        <RequestsFilterBar colorOptions={colorOptions} showStatus={view === "table"} />
        <Link
          href="/requests/new"
          className="hidden sm:flex items-center gap-1.5 rounded-md bg-ink text-page px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0 ml-auto"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          Add a request
        </Link>
      </div>

      {view === "board" ? (
        // No overflow here -- the grid fills this exactly (sm:h-full) and
        // each column scrolls its own card list internally, same as before.
        <div className="sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">
          <RequestsKanban
            requests={requests}
            prizes={prizes}
            filaments={filaments}
            allFranchiseTags={allFranchiseTags}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onClearCancelled={onClearCancelled}
            onReorder={onReorder}
            filtersActive={filtersActive}
          />
        </div>
      ) : (
        // A table has no per-row scroll partitioning like the board's
        // columns do, so this whole region scrolls as one unit instead.
        <div className="sm:flex-1 sm:min-h-0 sm:overflow-y-auto">
          <RequestsTable
            requests={requests}
            prizes={prizes}
            filaments={filaments}
            allFranchiseTags={allFranchiseTags}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        </div>
      )}
    </div>
  );
}
