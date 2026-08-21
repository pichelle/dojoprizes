"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { Profile } from "@/lib/types";
import { PROFILE_COLOR_OPTIONS } from "@/lib/constants";
import { createProfile, updateProfile, type ProfileFormState } from "@/lib/profileActions";
import { formatSensei } from "@/lib/formatSensei";
import { useProfiles } from "@/components/ProfileContext";

const initialState: ProfileFormState = { error: null };

function ProfileForm({
  editing,
  onDone,
  onCancel,
}: {
  editing: Profile | null;
  onDone: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const action = editing ? updateProfile : createProfile;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name, setName] = useState(editing?.name ?? "");
  const [colorHex, setColorHex] = useState(editing?.color_hex ?? PROFILE_COLOR_OPTIONS[0]);
  // Hovering a swatch previews that color on the icon above without
  // committing it -- moving off reverts to whatever's actually selected.
  const [previewHex, setPreviewHex] = useState<string | null>(null);

  useEffect(() => {
    if (state.success && state.profile) onDone(state.profile);
    // Only fire when a fresh success comes in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="mt-6 max-w-xs mx-auto text-left bg-card border border-border-warm rounded-xl p-5"
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <input type="hidden" name="color_hex" value={colorHex} />

      <p className="text-center font-serif font-bold text-ink mb-4">
        {editing ? "Edit profile" : "New profile"}
      </p>

      <div className="flex justify-center mb-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors"
          style={{ background: previewHex ?? colorHex }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={editing?.avatar_url ?? "/ninja.png"}
            alt=""
            aria-hidden="true"
            className="max-w-[60%] max-h-[60%] object-contain"
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-soft shrink-0">Sensei</span>
          <input
            type="text"
            name="name"
            placeholder="Your first name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 rounded-md border border-border-warm-strong px-3 py-2 text-sm"
            autoFocus
          />
        </div>
        {/* Confirms "Sensei" gets added automatically, so no one re-types
            it after seeing the static label above -- that's how we ended
            up with profiles literally named "Sensei Aidan". */}
        <p className="mt-1.5 text-xs text-muted">
          {name.trim() ? (
            <>Will show as &quot;{formatSensei(name)}&quot; -- just your first name above.</>
          ) : (
            "Just your first name -- \"Sensei\" gets added automatically."
          )}
        </p>
      </div>

      <label className="block text-xs font-medium text-ink-soft mb-2">Choose an icon color</label>
      <div className="flex gap-2 mb-4">
        {PROFILE_COLOR_OPTIONS.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => setColorHex(hex)}
            onMouseEnter={() => setPreviewHex(hex)}
            onMouseLeave={() => setPreviewHex(null)}
            aria-label={`Use color ${hex}`}
            className="profile-swatch w-7 h-7 rounded-lg border"
            style={
              {
                "--swatch-color": hex,
                borderColor: colorHex === hex ? "var(--color-border-hover)" : "var(--color-border-warm)",
                borderWidth: colorHex === hex ? 2 : 1,
                transform: colorHex === hex ? "scale(1.08)" : undefined,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {state.error && <p className="text-sm text-rust mb-3">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-border-warm-strong text-sm font-medium py-2 hover:bg-nav"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-ink text-page text-sm font-medium py-2 hover:opacity-90 disabled:opacity-60"
        >
          {editing ? "Save changes" : "Add profile"}
        </button>
      </div>
    </form>
  );
}

function ProfileTile({
  profile,
  onPick,
  onEdit,
}: {
  profile: Profile;
  onPick: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="group flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onPick}
        className="relative w-24 h-24 rounded-2xl border border-border-warm flex items-center justify-center transition-transform group-hover:-translate-y-0.5 hover:border-border-hover"
        style={{ background: profile.color_hex }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatar_url ?? "/ninja.png"}
          alt=""
          aria-hidden="true"
          className="max-w-[52px] max-h-[52px] object-contain"
        />
        <span
          role="button"
          aria-label={`Edit ${profile.name}'s profile`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-card border border-border-warm items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-border-hover hidden group-hover:flex"
        >
          <Pencil size={12} className="text-ink-soft" aria-hidden="true" />
        </span>
      </button>
      <span className="text-sm font-medium text-ink">{formatSensei(profile.name)}</span>
    </div>
  );
}

export default function ProfilePicker() {
  const { profiles, chooseProfile, upsertProfile } = useProfiles();
  const [mode, setMode] = useState<"idle" | "add" | { edit: Profile }>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleDone(profile: Profile) {
    upsertProfile(profile);
    setMode("idle");
    chooseProfile(profile.id);
  }

  const editingProfile = typeof mode === "object" ? mode.edit : null;

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-page bg-dot-grid px-4">
      <div
        className="w-full max-w-lg text-center transition-all duration-500 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
        }}
      >
        <h1 className="font-serif text-2xl font-bold text-ink mb-1">Who&apos;s logging in?</h1>
        <p className="text-sm text-muted mb-8">
          Pick a profile to continue -- helps us track activity like new entries and edits.
        </p>

        <div className="flex gap-5 justify-center items-start flex-wrap">
          {profiles.map((profile) => (
            <ProfileTile
              key={profile.id}
              profile={profile}
              onPick={() => chooseProfile(profile.id)}
              onEdit={() => setMode({ edit: profile })}
            />
          ))}

          {mode !== "add" && !editingProfile && (
            <button
              type="button"
              onClick={() => setMode("add")}
              className="flex flex-col items-center gap-2"
            >
              <span className="w-24 h-24 rounded-2xl border-2 border-dashed border-border-warm-strong flex items-center justify-center text-muted transition-colors hover:bg-nav">
                <Plus size={28} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-ink-soft">Add profile</span>
            </button>
          )}
        </div>

        {(mode === "add" || editingProfile) && (
          <ProfileForm
            // Forces a fresh instance (and fresh internal state -- the
            // name field's defaultValue, the selected color) whenever the
            // edit target changes. Without this, clicking John's pencil
            // then Michelle's reused the same mounted form and kept
            // showing John's name/color, since defaultValue and useState
            // only apply on first mount.
            key={editingProfile?.id ?? "new"}
            editing={editingProfile}
            onDone={handleDone}
            onCancel={() => setMode("idle")}
          />
        )}
      </div>
    </div>
  );
}
