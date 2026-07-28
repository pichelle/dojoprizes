"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { RequestSize, RequestStatus } from "@/lib/types";

export async function createRequest(formData: FormData) {
  const supabase = createServerClient();

  const prizeId = String(formData.get("prize_id") ?? "").trim() || null;
  const freeText = String(formData.get("free_text_prize") ?? "").trim() || null;
  const size = (String(formData.get("size") ?? "").trim() || null) as RequestSize | null;
  const colorFilamentId =
    String(formData.get("color_filament_id") ?? "").trim() || null;

  const { error } = await supabase.from("requests").insert({
    student_name: String(formData.get("student_name") ?? "").trim(),
    prize_id: prizeId,
    free_text_prize: prizeId ? null : freeText,
    franchise: String(formData.get("franchise") ?? "").trim() || null,
    size,
    color_filament_id: colorFilamentId,
    links: String(formData.get("links") ?? "").trim() || null,
    date_requested:
      String(formData.get("date_requested") ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    status: "pending" as RequestStatus,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}

export async function deleteRequest(requestId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("requests").delete().eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}
