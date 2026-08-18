import type { Profile } from "@/lib/types";
import ProfileIcon from "@/components/ProfileIcon";
import { formatSensei } from "@/lib/formatSensei";

// Wherever a sensei name is displayed (comments, request detail, table
// rows, card footers), show it as this chip instead of plain text -- the
// icon's colored background carries the same "who" signal as the
// picker/nav. Text always stays plain ink black (not tinted with the
// profile's color) so it can't be confused with the colored status pills
// sitting nearby.
export default function ProfileChip({
  name,
  profiles,
  variant = "pill",
}: {
  name: string | null;
  profiles: Profile[];
  // "pill": bordered white pill, icon + "Sensei" + name -- for detail
  // rows and comment authors, where there's room for the full treatment.
  // "compact": icon + name only (no "Sensei", no pill chrome) -- for
  // request/idea card footers, which are tight on width next to the
  // comment count and status pill.
  variant?: "pill" | "compact";
}) {
  if (!name) return <span className="text-muted">&mdash;</span>;

  const matched = profiles.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());

  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <ProfileIcon profile={matched ?? null} size={16} />
        <span className="truncate">{matched ? matched.name : name}</span>
      </span>
    );
  }

  const label = matched ? formatSensei(matched.name) : formatSensei(name);

  return (
    <span className="inline-flex items-center gap-1.5 bg-card border border-border-warm rounded-full pl-1 pr-2.5 py-0.5">
      <ProfileIcon profile={matched ?? null} size={18} />
      <span className="text-sm font-medium">{label}</span>
    </span>
  );
}
