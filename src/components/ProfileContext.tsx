"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";

// Which profile is "logged in" is purely a per-browser/device thing -- there's
// still just one shared password gate (middleware.ts), this is only for
// auto-attributing names and showing the right avatar in the nav. Separate
// devices (e.g. Michelle's laptop vs John's) each remember their own pick.
const ACTIVE_PROFILE_KEY = "dojoprizes:activeProfileId";

type ProfileContextValue = {
  profiles: Profile[];
  // undefined = still reading localStorage (avoid flashing the picker before
  // we know), null = no profile picked yet, Profile = picked.
  activeProfile: Profile | null | undefined;
  chooseProfile: (id: string) => void;
  switchProfile: () => void;
  upsertProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  initialProfiles,
  children,
}: {
  initialProfiles: Profile[];
  children: React.ReactNode;
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  // undefined during server render (no localStorage there); resolved to the
  // real value via the lazy initializer on the client's first render, same
  // pattern as RequestsView's saved-view-mode state.
  const [activeId, setActiveId] = useState<string | null | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(ACTIVE_PROFILE_KEY);
  });

  const activeProfile = useMemo(() => {
    if (activeId === undefined) return undefined;
    if (!activeId) return null;
    return profiles.find((p) => p.id === activeId) ?? null;
  }, [activeId, profiles]);

  function chooseProfile(id: string) {
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    setActiveId(id);
  }

  function switchProfile() {
    window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
    setActiveId(null);
  }

  function upsertProfile(profile: Profile) {
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === profile.id);
      return exists ? prev.map((p) => (p.id === profile.id ? profile : p)) : [...prev, profile];
    });
  }

  return (
    <ProfileContext.Provider
      value={{ profiles, activeProfile, chooseProfile, switchProfile, upsertProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfiles must be used within a ProfileProvider");
  return ctx;
}
