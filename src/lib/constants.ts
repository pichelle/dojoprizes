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
