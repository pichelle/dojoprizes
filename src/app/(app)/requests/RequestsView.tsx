"use client";

import { useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestStatus } from "@/lib/types";
import RequestsKanban from "./RequestsKanban";
import RequestsTable from "./RequestsTable";

const STORAGE_KEY = "dojoprizes:requestsView";

type View = "board" | "table";

export default function RequestsView({
  requests,
  prizes,
  filaments,
  allFranchiseTags,
  onStatusChange,
  onDelete,
  onClearCancelled,
  filtersActive,
}: {
  requests: PrizeRequest[];
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  onStatusChange: (requestId: string, status: RequestStatus, salePrice?: number | null) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
  onClearCancelled: () => Promise<void>;
  filtersActive: boolean;
}) {
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
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex gap-1 bg-nav border border-border-warm rounded-lg p-1">
          <button
            type="button"
            onClick={() => pick("board")}
            aria-pressed={view === "board"}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-3 py-1.5 ${
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
            className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-3 py-1.5 ${
              view === "table" ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Table2 size={13} aria-hidden="true" />
            Table
          </button>
        </div>
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
