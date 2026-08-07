import Skeleton from "@/components/Skeleton";

export default function FilamentLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" delay={0} />
          <Skeleton className="h-4 w-80" delay={40} />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" delay={80} />
      </div>

      <Skeleton className="h-8 w-36 rounded-md" delay={120} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border-warm rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" delay={160 + i * 50} />
              <Skeleton className="h-4 w-16 rounded-full" delay={180 + i * 50} />
            </div>
            <Skeleton className="h-3 w-20" delay={200 + i * 50} />
            <Skeleton className="h-3 w-24" delay={220 + i * 50} />
            <Skeleton className="h-3 w-28" delay={240 + i * 50} />
          </div>
        ))}
      </div>
    </div>
  );
}
