import Skeleton from "@/components/Skeleton";

const COLUMNS = [
  { label: "Ideas", cards: 2 },
  { label: "Pending", cards: 3 },
  { label: "Printed", cards: 2 },
  { label: "Cancelled", cards: 1 },
];

export default function RequestsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" delay={0} />
          <Skeleton className="h-4 w-64" delay={40} />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-16 w-32 rounded-xl" delay={80} />
          <Skeleton className="h-16 w-32 rounded-xl" delay={120} />
        </div>
      </div>

      <Skeleton className="h-10 w-full max-w-2xl rounded-xl" delay={160} />

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-32 rounded-md" delay={200} />
        <Skeleton className="h-9 w-24 rounded-md" delay={220} />
        <Skeleton className="h-9 w-24 rounded-md" delay={240} />
        <Skeleton className="h-9 w-56 rounded-md" delay={260} />
      </div>

      <div className="grid items-start gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {COLUMNS.map((col, colIdx) => (
          <div key={col.label} className="rounded-2xl p-3 bg-nav border border-border-warm space-y-2.5">
            <Skeleton className="h-4 w-20" delay={300 + colIdx * 60} />
            {Array.from({ length: col.cards }).map((_, i) => (
              <div key={i} className="bg-card border border-border-warm rounded-xl p-4 space-y-2.5">
                <Skeleton className="h-3 w-24" delay={340 + colIdx * 60 + i * 40} />
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" delay={360 + colIdx * 60 + i * 40} />
                  <Skeleton className="h-4 w-32" delay={380 + colIdx * 60 + i * 40} />
                </div>
                <Skeleton className="h-3 w-40" delay={400 + colIdx * 60 + i * 40} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
