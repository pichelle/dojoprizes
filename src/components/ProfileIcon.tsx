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
        style={{ maxWidth: "70%", maxHeight: "70%", objectFit: "contain" }}
      />
    </span>
  );
}
