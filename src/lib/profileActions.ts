"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type ProfileFormState = { error: string | null; success?: boolean; profile?: Profile };

export async function fetchProfiles(): Promise<Profile[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return sortWithOwnerFirst((data ?? []) as Profile[]);
}

// Every other profile keeps its created_at order, but Michelle's (this
// tool's owner) always sorts first in the picker/switcher -- relying on
// created_at alone put whichever profile happened to be inserted first,
// which isn't necessarily her (e.g. if her row was ever recreated).
function sortWithOwnerFirst(profiles: Profile[]): Profile[] {
  const isOwner = (p: Profile) => p.name.trim().replace(/^sensei\s+/i, "").toLowerCase() === "michelle";
  const owner = profiles.filter(isOwner);
  const rest = profiles.filter((p) => !isOwner(p));
  return [...owner, ...rest];
}

export async function createProfile(
  _prevState: ProfileFormState | null,
  formData: FormData,
): Promise<ProfileFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("color_hex") ?? "").trim();
  if (!name) return { error: "Enter a name." };
  if (!colorHex) return { error: "Pick a color." };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ name, color_hex: colorHex })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { error: null, success: true, profile: data as Profile };
}

export async function updateProfile(
  _prevState: ProfileFormState | null,
  formData: FormData,
): Promise<ProfileFormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("color_hex") ?? "").trim();
  if (!id) return { error: "Missing profile." };
  if (!name) return { error: "Enter a name." };
  if (!colorHex) return { error: "Pick a color." };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ name, color_hex: colorHex })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { error: null, success: true, profile: data as Profile };
}
