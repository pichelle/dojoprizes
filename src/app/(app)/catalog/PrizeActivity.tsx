"use client";

import { History, Pencil, PlusCircle, Printer } from "lucide-react";
import type { PrizeActivity as PrizeActivityEntry } from "@/lib/types";
import { useProfiles } from "@/components/ProfileContext";
import ProfileChip from "@/components/ProfileChip";

// Same design as RequestActivity.tsx, pointed at prize_activity instead
// of request_activity -- "reprinted" is the one event type requests don't
// have (see prizeActivityLog.ts for why it's a manual action).

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const EVENT_META = {
  created: { label: "Created", icon: PlusCircle },
  edited: { label: "Edited", icon: Pencil },
  reprinted: { label: "Reprinted", icon: Printer },
} as const;

function ActivityRow({ entry }: { entry: PrizeActivityEntry }) {
  const { profiles } = useProfiles();
  const meta = EVENT_META[entry.event_type];
  const Icon = meta.icon;

  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 mt-0.5 text-muted">
        <Icon size={14} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs flex items-center gap-1 flex-wrap">
          <span className="font-bold text-ink">
            <ProfileChip name={entry.actor} profiles={profiles} variant="pill" />
          </span>
          <span className="text-muted">
            {meta.label} · {timeAgo(entry.created_at)}
          </span>
        </p>
        {entry.changes.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {entry.changes.map((change, i) => (
              <li key={`${change.field}-${i}`} className="text-sm text-ink leading-relaxed">
                {change.from ? (
                  <>
                    <span className="text-muted">{change.label}:</span> {change.from}{" "}
                    <span className="text-muted">→</span> {change.to ?? "—"}
                  </>
                ) : (
                  <>
                    <span className="text-muted">{change.label} set to</span> {change.to ?? "—"}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Read-only feed of what happened to a prize -- creation, edits to the
// fields that matter, and reprints. System-generated, same as
// RequestActivity but for prize_activity.
export default function PrizeActivity({ activity }: { activity: PrizeActivityEntry[] }) {
  if (activity.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted">
        <History size={14} aria-hidden="true" />
        <span>No activity yet.</span>
      </div>
    );
  }

  const sorted = [...activity].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      {sorted.map((entry) => (
        <ActivityRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
