// Shared display-formatting helpers for requests, used by both the board
// (RequestsKanban) and table (RequestsTable) views. Kept here instead of
// only inside RequestsKanban so the table view can reuse the exact same
// "X days ago" / date formatting without duplicating logic that later
// drifts out of sync between the two views.
import type { PrizeRequest, RequestSizeOrAny } from "@/lib/types";

// Matches the labels already used in the size dropdown/filter options --
// keeps "X-Large" and "True to size" consistent wherever a size shows up,
// instead of printing the raw stored value (e.g. "true_to_size").
const SIZE_LABELS: Record<RequestSizeOrAny, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "X-Large",
  true_to_size: "True to size",
  any: "Any size",
};

export function formatSize(size: RequestSizeOrAny | string | null) {
  if (!size) return null;
  return SIZE_LABELS[size as RequestSizeOrAny] ?? size;
}

// Mirrors formatSize's "Any" handling for color -- color_any is a separate
// boolean (color is a multi-select of filament rows, not a single enum
// value like size, so there's no plain "any" string to store on it).
export function formatColor(r: Pick<PrizeRequest, "colorFilaments" | "color_any">) {
  if (r.color_any) return "Any color";
  const names = (r.colorFilaments ?? []).map((c) => c.color_name).join(", ");
  return names || null;
}

export function daysAgo(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

// "Requested 5 days ago" -- more actionable at a glance than a raw date.
export function formatRequestedAgo(iso: string) {
  const age = daysAgo(iso);
  if (age === null) return `Requested ${iso}`;
  if (age === 0) return "Requested today";
  if (age === 1) return "Requested 1 day ago";
  return `Requested ${age} days ago`;
}

export function formatCalendarDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Same relative time as formatRequestedAgo, but without the "Requested"
// prefix and with the calendar date alongside it -- used in the side
// peek's Request date row, not on the card.
export function formatRequestDateDetailed(iso: string) {
  const age = daysAgo(iso);
  const relative = age === null ? iso : age === 0 ? "Today" : age === 1 ? "1 day ago" : `${age} days ago`;
  return `${relative} (${formatCalendarDate(iso)})`;
}

// Ideas don't have a prize/free-text title -- the "idea title" field
// captured at creation is stored in student_name instead, so use that
// as the display title for idea-status cards/rows.
export function printTitle(r: PrizeRequest) {
  if (r.status === "idea") return r.student_name || "Untitled idea";
  return r.prize?.name ?? r.free_text_prize ?? "Untitled print";
}
