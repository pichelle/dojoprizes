// Server-only helpers for writing to request_activity. Kept separate from
// requests/actions.ts so the "what changed" diffing logic has a home of
// its own instead of bloating an already-long actions file.
//
// This is a curated diff, not a full audit trail: only a fixed set of
// fields a sensei would actually care about are compared (see
// EDITABLE_FIELDS below). Internal/derived columns (updated_at,
// pending_at, fulfilled_at) are intentionally left out.
import { createServerClient } from "@/lib/supabase/server";
import { formatSize, STATUS_LABELS } from "@/lib/requestFormatting";
import type {
  RequestActivityChange,
  RequestActivityEventType,
  RequestSizeOrAny,
  RequestStatus,
} from "@/lib/types";

type Supabase = ReturnType<typeof createServerClient>;

export async function logRequestActivity(
  supabase: Supabase,
  requestId: string,
  actor: string | null,
  eventType: RequestActivityEventType,
  changes: RequestActivityChange[],
) {
  if (eventType === "edited" && changes.length === 0) return;
  const { error } = await supabase
    .from("request_activity")
    .insert({ request_id: requestId, actor: actor?.trim() || null, event_type: eventType, changes });
  // Activity logging is best-effort -- a failure here shouldn't roll back
  // or fail the request mutation that triggered it.
  if (error) console.error("Failed to log request activity:", error.message);
}

export function statusChange(from: RequestStatus | null, to: RequestStatus): RequestActivityChange[] {
  return [
    {
      field: "status",
      label: "Status",
      from: from ? STATUS_LABELS[from] : null,
      to: STATUS_LABELS[to],
    },
  ];
}

// The row shape performUpdateRequest already has on hand before it writes
// the update -- a plain `select("*")` from requests, plus the resolved
// names for whatever's currently linked (prize, colors, theme tags) since
// those live in join tables/other tables, not on the row itself.
export type RequestSnapshot = {
  student_name: string;
  status: RequestStatus;
  prizeName: string | null; // resolved prizes.name for prize_id, if set
  free_text_prize: string | null;
  size: RequestSizeOrAny | null;
  color_any: boolean;
  colorNames: string[]; // resolved filaments.color_name for linked filaments
  themeNames: string[]; // resolved franchise_tags.name for linked tags
  notes: string | null;
  photo_url: string | null;
  links: string | null;
  is_print_club: boolean;
};

function titleLabel(status: RequestStatus) {
  return status === "idea" ? "Idea title" : "Ninja name";
}

function prizeLabel(s: Pick<RequestSnapshot, "prizeName" | "free_text_prize">) {
  return s.prizeName ?? s.free_text_prize ?? null;
}

function colorLabel(s: Pick<RequestSnapshot, "colorNames" | "color_any">) {
  const names = s.colorNames.join(", ");
  if (s.color_any && names) return `Any color (${names} preferred)`;
  if (s.color_any) return "Any color";
  return names || null;
}

function listLabel(names: string[]) {
  return names.length > 0 ? names.join(", ") : null;
}

function boolLabel(v: boolean) {
  return v ? "Yes" : "No";
}

// Curated diff between the request row before and after an edit. Same
// status is intentionally not compared here -- status moves are logged
// separately via statusChange() so they get their own "status_changed"
// event distinct from a field edit.
export function computeRequestEditChanges(
  before: RequestSnapshot,
  after: RequestSnapshot,
): RequestActivityChange[] {
  const changes: RequestActivityChange[] = [];

  function push(field: string, label: string, from: string | null, to: string | null) {
    if (from === to) return;
    changes.push({ field, label, from, to });
  }

  // The title field means different things for an idea vs. a request, but
  // it's still "the name at the top of the card" either way -- surfacing
  // it under whichever label matched the request's status at save time.
  push("title", titleLabel(after.status), before.student_name || null, after.student_name || null);
  push("prize", "Prize", prizeLabel(before), prizeLabel(after));
  push("size", "Size", formatSize(before.size), formatSize(after.size));
  push("color", "Color", colorLabel(before), colorLabel(after));
  push("theme", "Theme", listLabel(before.themeNames), listLabel(after.themeNames));
  push("notes", "Notes", before.notes, after.notes);
  push("photo_url", "Photo", before.photo_url ? "set" : null, after.photo_url ? "set" : null);
  push("links", "Link", before.links, after.links);
  push("is_print_club", "3D Print Club", boolLabel(before.is_print_club), boolLabel(after.is_print_club));

  return changes;
}
