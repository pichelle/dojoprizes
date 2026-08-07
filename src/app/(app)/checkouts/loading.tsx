import Skeleton from "@/components/Skeleton";

export default function CheckoutsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" delay={0} />
        <Skeleton className="h-4 w-96" delay={40} />
      </div>

      <Skeleton className="h-12 w-full rounded-xl" delay={80} />

      <div className="space-y-2">
        <Skeleton className="h-3 w-32" delay={120} />
        <div className="grid sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-nav border border-border-warm rounded-xl p-3.5 space-y-2">
              <Skeleton className="h-3 w-16" delay={160 + i * 40} />
              <Skeleton className="h-4 w-full" delay={180 + i * 40} />
              <Skeleton className="h-4 w-2/3" delay={200 + i * 40} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Skeleton className="h-9 w-36 rounded-md" delay={280} />
        <Skeleton className="h-9 w-36 rounded-md" delay={300} />
        <Skeleton className="h-9 flex-1 min-w-[200px] rounded-md" delay={320} />
      </div>

      <div className="bg-card border border-border-warm rounded-xl overflow-hidden">
        <div className="bg-nav px-3 py-2.5">
          <Skeleton className="h-3 w-full" delay={360} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-t border-border-warm px-3 py-3 flex items-center gap-4">
            <Skeleton className="h-3 w-14" delay={400 + i * 30} />
            <Skeleton className="h-3 w-32 flex-1" delay={420 + i * 30} />
            <Skeleton className="h-3 w-16" delay={440 + i * 30} />
            <Skeleton className="h-3 w-16" delay={460 + i * 30} />
            <Skeleton className="h-3 w-14" delay={480 + i * 30} />
          </div>
        ))}
      </div>
    </div>
  );
}
