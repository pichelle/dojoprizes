import type { LucideIcon } from "lucide-react";

// Shared label+icon row used in side-peek "view" info sections (Requests,
// Prize Bin). One row per field, icon + label in a fixed-width left
// column so values line up regardless of label length.
export default function DetailRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-border-warm/50 last:border-b-0 text-left">
      <span className="flex items-center gap-1.5 text-muted w-32 shrink-0 pt-px">
        <Icon size={13} className="shrink-0" aria-hidden="true" />
        {label}
      </span>
      <span className="text-ink leading-relaxed">{children}</span>
    </div>
  );
}
