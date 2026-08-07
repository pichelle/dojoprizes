import Skeleton from "@/components/Skeleton";

export default function CatalogLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" delay={0} />
          <Skeleton className="h-4 w-72" delay={40} />
        </div>
        <Skeleton className="h-16 w-28 rounded-xl" delay={80} />
      </div>

      <div className="grid sm:grid-cols-[200px_1fr] gap-6 items-start">
        <div className="bg-card border border-border-warm rounded-xl p-4 space-y-5">
          {["Theme", "Color", "Size", "Status"].map((label, i) => (
            <div key={label} className="space-y-2">
              <Skeleton className="h-3 w-12" delay={120 + i * 40} />
              <Skeleton className="h-3 w-full" delay={140 + i * 40} />
              <Skeleton className="h-3 w-3/4" delay={160 + i * 40} />
            </div>
          ))}
          <Skeleton className="h-9 w-full rounded-md" delay={320} />
        </div>

        <div className="space-y-6 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-md" delay={160} />
            <Skeleton className="h-9 w-40 rounded-md" delay={180} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border-warm rounded-xl overflow-hidden flex flex-col">
                <Skeleton className="h-44 w-full rounded-none" delay={220 + i * 50} />
                <div className="p-4 space-y-2.5">
                  <Skeleton className="h-5 w-2/3" delay={260 + i * 50} />
                  <Skeleton className="h-3 w-1/3" delay={280 + i * 50} />
                  <Skeleton className="h-3 w-1/2" delay={300 + i * 50} />
                  <div className="pt-3 border-t border-border-warm flex items-center justify-between">
                    <Skeleton className="h-4 w-16" delay={320 + i * 50} />
                    <Skeleton className="h-8 w-20 rounded-md" delay={340 + i * 50} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
