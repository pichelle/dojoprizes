// Requests (and now comments) are logged/authored under whichever staff
// name is on duty -- most people just type their first name, so this
// prefixes "Sensei" for display without changing what's actually stored.
// Always normalizes to a capitalized "Sensei" prefix, even if someone
// typed "sensei" lowercase or included it themselves.
export function formatSensei(name: string | null) {
  if (!name) return "—";
  const withoutPrefix = name.trim().replace(/^sensei\s+/i, "");
  if (!withoutPrefix) return "—";
  return `Sensei ${withoutPrefix}`;
}
