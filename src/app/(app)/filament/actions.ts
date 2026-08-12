"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export type FilamentFormState = { error: string | null; success?: boolean; id?: string };

function parsePrizeIds(formData: FormData): string[] {
  return formData.getAll("prize_ids").map(String).filter(Boolean);
}

function fieldsFromForm(formData: FormData) {
  return {
    color_name: String(formData.get("color_name") ?? "").trim(),
    swatch_hex: String(formData.get("swatch_hex") ?? "").trim() || null,
    material_type: String(formData.get("material_type") ?? "").trim() || null,
    stock_level: formData.get("stock_level")
      ? Number(formData.get("stock_level"))
      : null,
    stock_unit: String(formData.get("stock_unit") ?? "spools").trim(),
    low_stock_threshold: formData.get("low_stock_threshold")
      ? Number(formData.get("low_stock_threshold"))
      : null,
    amazon_link: String(formData.get("amazon_link") ?? "").trim() || null,
  };
}

async function performCreateFilament(formData: FormData): Promise<FilamentFormState> {
  const supabase = createServerClient();
  try {
    const { data: filament, error } = await supabase
      .from("filaments")
      .insert(fieldsFromForm(formData))
      .select("id")
      .single();

    if (error) return { error: error.message };

    const prizeIds = parsePrizeIds(formData);
    if (prizeIds.length > 0 && filament) {
      const { error: linkError } = await supabase.from("prize_filament").insert(
        prizeIds.map((prize_id) => ({ prize_id, filament_id: filament.id })),
      );
      if (linkError) return { error: linkError.message };
    }

    revalidatePath("/filament");
    return { error: null, success: true, id: filament?.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }
}

async function performUpdateFilament(
  filamentId: string,
  formData: FormData,
): Promise<FilamentFormState> {
  const supabase = createServerClient();
  try {
    const { error } = await supabase
      .from("filaments")
      .update(fieldsFromForm(formData))
      .eq("id", filamentId);
    if (error) return { error: error.message };

    const { error: deleteLinksError } = await supabase
      .from("prize_filament")
      .delete()
      .eq("filament_id", filamentId);
    if (deleteLinksError) return { error: deleteLinksError.message };

    const prizeIds = parsePrizeIds(formData);
    if (prizeIds.length > 0) {
      const { error: linkError } = await supabase.from("prize_filament").insert(
        prizeIds.map((prize_id) => ({ prize_id, filament_id: filamentId })),
      );
      if (linkError) return { error: linkError.message };
    }

    revalidatePath("/filament");
    revalidatePath("/catalog");
    return { error: null, success: true, id: filamentId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }
}

// Dedicated-page variant: redirects back to /filament on success, since
// adding a color is a full page again (not a side peek).
export async function createFilament(
  _prevState: FilamentFormState | null,
  formData: FormData,
): Promise<FilamentFormState> {
  const result = await performCreateFilament(formData);
  if (result.error) return result;
  redirect("/filament");
}

// Side-peek variant: no redirect, since the user never leaves /filament --
// editing still happens inline.
export async function updateFilamentInline(
  filamentId: string,
  _prevState: FilamentFormState | null,
  formData: FormData,
): Promise<FilamentFormState> {
  return performUpdateFilament(filamentId, formData);
}

export async function deleteFilament(filamentId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("filaments")
    .delete()
    .eq("id", filamentId);
  if (error) throw new Error(error.message);
  revalidatePath("/filament");
  revalidatePath("/catalog");
}
