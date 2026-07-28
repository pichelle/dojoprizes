"use client";

import { useTransition } from "react";
import type { RequestStatus } from "@/lib/types";

const STATUS_OPTIONS: RequestStatus[] = [
  "pending",
  "printed",
  "fulfilled",
  "cancelled",
];

export default function StatusSelect({
  requestId,
  status,
  onChange,
}: {
  requestId: string;
  status: RequestStatus;
  onChange: (requestId: string, status: RequestStatus) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as RequestStatus;
        startTransition(() => {
          onChange(requestId, next);
        });
      }}
      className="text-xs rounded-md border border-border-warm-strong px-2 py-1 bg-card capitalize"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}
