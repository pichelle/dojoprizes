// Shared display-formatting helpers for requests, used by both the board
// (RequestsKanban) and table (RequestsTable) views. Kept here instead of
// only inside RequestsKanban so the table view can reuse the exact same
// "X days ago" / date formatting without duplicating logic that later
// drifts out of sync between the two views.
import type { PrizeRequest, RequestSizeOrAny, RequestStatus } from "@/lib/types";

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

// Mirrors StatusPill's STATUS_META labels ("Queue" for pending, "Pickup"
// for printed) so the activity log reads the same as the status pill
// itself, not the raw DB value. Kept here (not in StatusPill) so
// server-only code like activityLog.ts can use it without pulling in a
// "use client" component.
export const STATUS_LABELS: Record<RequestStatus, string> = {
  idea: "Idea",
  pending: "Queue",
  printed: "Pickup",
  fulfilled: "Fulfilled",
  in_prize_bin: "Prize Bin",
  cancelled: "Cancelled",
};

export function formatSize(size: RequestSizeOrAny | string | null) {
  if (!size) return null;
  return SIZE_LABELS[size as RequestSizeOrAny] ?? size;
}

// Mirrors formatSize's "Any" handling for color -- color_any is a separate
// boolean (color is a multi-select of filament rows, not a single enum
// value like size, so there's no plain "any" string to store on it). Any
// and specific colors can coexist ("any color is fine, but blue if
// possible"), so both parts show together when that's the case.
export function formatColor(r: Pick<PrizeRequest, "colorFilaments" | "color_any">) {
  const names = (r.colorFilaments ?? []).map((c) => c.color_name).join(", ");
  if (r.color_any && names) return `Any color (${names} preferred)`;
  if (r.color_any) return "Any color";
  return names || null;
}

export function daysAgo(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

// "Requested 5 days ago" -- more actionable at a glance than a raw date.
// Ideas aren't requests yet -- just suggestions someone jotted down -- so
// they read as "Added" instead, which avoids implying the same
// waiting-on-us urgency a real request has.
export function formatRequestedAgo(iso: string, status?: RequestStatus) {
  const verb = status === "idea" ? "Added" : "Requested";
  const age = daysAgo(iso);
  if (age === null) return `${verb} ${iso}`;
  if (age === 0) return `${verb} today`;
  if (age === 1) return `${verb} 1 day ago`;
  return `${verb} ${age} days ago`;
}

// The date that should anchor "how long has this been waiting" for a row
// currently in the queue. A regular request's date_requested already means
// that. An idea-turned-request's date_requested instead marks when the
// idea was first jotted down -- pending_at (stamped the moment it actually
// entered the queue, see updateRequestStatus) is the honest answer for
// those, and stays null until that happens, so this naturally falls back
// to date_requested while something's still sitting in the Ideas column.
export function queueEntryDate(r: Pick<PrizeRequest, "date_requested" | "pending_at" | "originated_as_idea">) {
  if (r.originated_as_idea && r.pending_at) return r.pending_at.slice(0, 10);
  return r.date_requested;
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
// captured at creation is stored in student_name instead, so use that as
// the display title. Checked via originated_as_idea (not status === "idea")
// since an idea keeps using its title through Queue and Prize Bin too --
// it never gets a prize_id/free_text_prize filled in along the way.
export function printTitle(r: PrizeRequest) {
  if (r.originated_as_idea) return r.student_name || "Untitled idea";
  return r.prize?.name ?? r.free_text_prize ?? "Untitled print";
}
