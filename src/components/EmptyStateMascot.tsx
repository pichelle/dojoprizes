// Shared empty-state treatment used across Requests, Prize Bin, Filaments,
// and Checkouts. Deliberately reused sparingly -- only for genuine "nothing
// here" moments, not filtered-to-zero results (those keep plain neutral
// text; see each call site for why). Faded to ~60% opacity per earlier
// feedback so it reads as a light illustrative touch, not a bold graphic
// competing with real data elsewhere on the page.

const POSES = {
  // Heart-eyes -- for moments that are a genuine little win (queue
  // cleared, nothing waiting for pickup).
  happy: "/mascot/yayy.png",
  // Sparkle -- for "nothing bad happened" / inviting first-use moments
  // (nothing cancelled, add your first item).
  sparkle: "/mascot/yesss.png",
  // Question mark -- for the rarer/odd-to-see-empty moments (no ideas
  // pending).
  huh: "/mascot/huh.png",
} as const;

export default function EmptyStateMascot({
  pose,
  message,
  className = "",
}: {
  pose: keyof typeof POSES;
  message: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center py-6 px-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={POSES[pose]}
        alt=""
        aria-hidden="true"
        className="w-14 h-auto opacity-60"
      />
      <p className="text-xs text-muted font-medium max-w-[180px] leading-snug">{message}</p>
    </div>
  );
}
