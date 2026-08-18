import type { Profile } from "@/lib/types";

// The small colored square used everywhere a profile shows up -- nav chip,
// picker tiles, profile chips, the name-field dropdown. Falls back to a
// neutral nav-colored square with the default ninja icon when there's no
// matching profile (e.g. a name typed before profiles existed).
export default function ProfileIcon({
  profile,
  size = 20,
}: {
  profile: Profile | null;
  size?: number;
}) {
  // Explicit pixel width/height (not a max-width percentage) -- these
  // source PNGs are much larger than the icon slot, and without a hard
  // pixel size on the <img> itself some browsers render it at intrinsic
  // size and clip almost all of it via the parent's overflow-hidden,
  // which looked like the icon wasn't showing at all.
  const iconSize = Math.round(size * 0.7);

  return (
    <span
      className="inline-flex items-center justify-center rounded-md shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: profile?.color_hex ?? "var(--color-nav)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={profile?.avatar_url ?? "/ninja.png"}
        alt=""
        aria-hidden="true"
        width={iconSize}
        height={iconSize}
        style={{ width: iconSize, height: iconSize, objectFit: "contain" }}
      />
    </span>
  );
}
