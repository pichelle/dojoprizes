"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

function parsePrizeIds(formData: FormData): string[] {
  return formData.getAll("prize_ids").map(String).filter(Boolean);
}

export async function createFilament(formData: FormData) {
  const supabase = createServerClient();

  const { data: filament, error } = await supabase
    .from("filaments")
    .insert({
      color_name: String(formData.get("color_name") ?? "").trim(),
      material_type: String(formData.get("material_type") ?? "").trim() || null,
      stock_level: formData.get("stock_level")
        ? Number(formData.get("stock_level"))
        : null,
      stock_unit: String(formData.get("stock_unit") ?? "spools").trim(),
      low_stock_threshold: formData.get("low_stock_threshold")
        ? Number(formData.get("low_stock_threshold"))
        : null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const prizeIds = parsePrizeIds(formData);
  if (prizeIds.length > 0 && filament) {
    const { error: linkError } = await supabase.from("prize_filament").insert(
      prizeIds.map((prize_id) => ({ prize_id, filament_id: filament.id })),
    );
    if (linkError) throw new Error(linkError.message);
  }

  revalidatePath("/filament");
  redirect("/filament");
}

export async function updateFilament(filamentId: string, formData: FormData) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("filaments")
    .update({
      color_name: String(formData.get("color_name") ?? "").trim(),
      material_type: String(formData.get("material_type") ?? "").trim() || null,
      stock_level: formData.get("stock_level")
        ? Number(formData.get("stock_level"))
        : null,
      stock_unit: String(formData.get("stock_unit") ?? "spools").trim(),
      low_stock_threshold: formData.get("low_stock_threshold")
        ? Number(formData.get("low_stock_threshold"))
        : null,
    })
    .eq("id", filamentId);
  if (error) throw new Error(error.message);

  const { error: deleteLinksError } = await supabase
    .from("prize_filament")
    .delete()
    .eq("filament_id", filamentId);
  if (deleteLinksError) throw new Error(deleteLinksError.message);

  const prizeIds = parsePrizeIds(formData);
  if (prizeIds.length > 0) {
    const { error: linkError } = await supabase.from("prize_filament").insert(
      prizeIds.map((prize_id) => ({ prize_id, filament_id: filamentId })),
    );
    if (linkError) throw new Error(linkError.message);
  }

  revalidatePath("/filament");
  revalidatePath("/catalog");
  redirect("/filament");
}

export async function deleteFilament(filamentId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("filaments")
    .delete()
    .eq("id", filamentId);
  if (error) throw new Error(error.message);
  revalidatePath("/filament");
  redirect("/filament");
}
