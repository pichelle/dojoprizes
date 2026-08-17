import type { Profile } from "@/lib/types";
import ProfileIcon from "@/components/ProfileIcon";
import { formatSensei } from "@/lib/formatSensei";

// Wherever a sensei name is displayed (comments, request detail, table
// rows), show it as this chip instead of plain text -- the icon's colored
// background carries the same "who" signal as the picker/nav, while the
// chip itself stays white so it never gets confused with the (also
// colored) status pills sitting nearby.
export default function ProfileChip({
  name,
  profiles,
  variant = "pill",
}: {
  name: string | null;
  profiles: Profile[];
  // "pill": bordered white pill, for detail rows and comment authors.
  // "inline": just icon + text, no pill chrome -- for tight spots like a
  // kanban card's footer row where a full pill would feel heavy.
  variant?: "pill" | "inline";
}) {
  if (!name) return <span className="text-muted">&mdash;</span>;

  const matched = profiles.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  const label = matched ? formatSensei(matched.name) : formatSensei(name);

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <ProfileIcon profile={matched ?? null} size={16} />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 bg-card border border-border-warm rounded-full pl-1 pr-2.5 py-0.5">
      <ProfileIcon profile={matched ?? null} size={18} />
      <span className="text-sm font-medium">{label}</span>
    </span>
  );
}
