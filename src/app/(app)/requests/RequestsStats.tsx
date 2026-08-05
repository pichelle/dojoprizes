"use client";

import { useMemo, useState } from "react";
import type { PrizeRequest } from "@/lib/types";

type Period = "week" | "month" | "year";

const PERIOD_LABEL: Record<Period, string> = {
  week: "This week",
  month: "This month",
  year: "This year",
};

const PERIOD_DAYS: Record<Period, number> = {
  week: 7,
  month: 30,
  year: 365,
};

function daysAgo(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default function RequestsStats({ requests }: { requests: PrizeRequest[] }) {
  const [period, setPeriod] = useState<Period>("week");

  const stats = useMemo(() => {
    const cutoff = PERIOD_DAYS[period];
    const inPeriod = requests.filter((r) => {
      const age = daysAgo(r.date_requested);
      return age !== null && age <= cutoff;
    });
    const printed = inPeriod.filter((r) => r.status === "printed").length;
    const fulfilled = inPeriod.filter((r) => r.status === "fulfilled").length;

    const pending = requests.filter((r) => r.status === "pending");
    const oldest = pending.reduce<number | null>((max, r) => {
      const age = daysAgo(r.date_requested);
      if (age === null) return max;
      return max === null || age > max ? age : max;
    }, null);

    return { requested: inPeriod.length, printed, fulfilled, oldest };
  }, [requests, period]);

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-2">
        {(["week", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
              period === p ? "bg-ink text-page" : "text-muted hover:bg-[#f3f3f0]"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="rounded-xl p-3.5" style={{ background: "var(--color-pending-bg)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--color-pending-text)" }}>
            Requested
          </p>
          <p className="text-2xl font-bold text-ink mt-0.5">{stats.requested}</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "var(--color-printed-bg)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--color-printed-text)" }}>
            Printed
          </p>
          <p className="text-2xl font-bold text-ink mt-0.5">{stats.printed}</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "var(--color-fulfilled-bg)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--color-fulfilled-text)" }}>
            Fulfilled
          </p>
          <p className="text-2xl font-bold text-ink mt-0.5">{stats.fulfilled}</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "var(--color-cancelled-bg)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--color-cancelled-text)" }}>
            Oldest waiting
          </p>
          <p className="text-2xl font-bold text-ink mt-0.5">
            {stats.oldest === null ? "—" : `${stats.oldest}d`}
          </p>
        </div>
      </div>
    </div>
  );
}
