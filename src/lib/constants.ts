// Shared sentinel used by Select/MultiSelect for "no selection". Lives in
// a plain module (no "use client"/"use server" directive) on purpose:
// Server Actions (requests/actions.ts, checkouts/actions.ts) need to
// compare form values against this exact string. Importing it from
// Select.tsx (a "use client" file) instead would silently break that
// comparison in production -- Next.js replaces every export of a "use
// client" module with an opaque client-reference token when it's imported
// into server code, so `raw !== NONE_VALUE` was always true there even
// though it looked correct and passed typecheck/build. That's why leaving
// "Prize (from catalog)" on "Not catalogued yet / other" made the literal
// string "__none__" hit prize_id (a uuid column) instead of null.
export const NONE_VALUE = "__none__";

// Profile tile colors offered in the "Add/edit profile" picker -- pulled
// directly from the app's existing status-pill palette (globals.css) so
// every profile color already matches the rest of the design system
// instead of introducing new hues.
export const PROFILE_COLOR_OPTIONS = [
  "#fbf4dc", // pending (yellow)
  "#e2f1f6", // printed (blue-teal)
  "#e9f4de", // fulfilled (green)
  "#faeaea", // cancelled (red)
  "#e0edfb", // accent tint (blue)
];

// Readable-as-text counterpart for each swatch above, reusing the same
// darker tokens the status pills already pair with their tint background
// (see globals.css) -- used by ProfileChip's compact "text" variant, which
// tints the name itself instead of sitting it on a colored background.
export const PROFILE_COLOR_TEXT_VARS: Record<string, string> = {
  "#fbf4dc": "var(--color-pending-text)",
  "#e2f1f6": "var(--color-printed-text)",
  "#e9f4de": "var(--color-fulfilled-text)",
  "#faeaea": "var(--color-cancelled-text)",
  "#e0edfb": "var(--color-sage-hover)",
};
