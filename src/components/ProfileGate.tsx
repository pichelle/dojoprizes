"use client";

import ProfilePicker from "@/components/ProfilePicker";
import { useProfiles } from "@/components/ProfileContext";

// Sits right inside the (app) layout, below the shared password gate in
// middleware.ts. Blocks the real app content until a profile is picked
// for this browser/device -- see ProfileContext for how that's persisted.
export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const { activeProfile } = useProfiles();

  // Still reading localStorage -- render nothing for a tick rather than
  // flashing the picker before we know a profile was already chosen here.
  if (activeProfile === undefined) return null;

  if (activeProfile === null) return <ProfilePicker />;

  return <div className="page-fade-in">{children}</div>;
}
