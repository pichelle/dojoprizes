"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { resolveFranchiseTagIds } from "@/lib/franchiseTags";
import { NONE_VALUE } from "@/lib/constants";
import type { RequestSizeOrAny, RequestStatus } from "@/lib/types";

export type RequestFormState = {
  error: string | null;
  success?: boolean;
  // Only populated by create (not update) -- lets the inline "+ Add new"
  // flow animate the specific card that was just created instead of
  // re-running the whole column's entrance animation.
  requestId?: string;
};

function parseFranchiseTagNames(formData: FormData): string[] {
  return formData.getAll("franchise_tag_names").map(String).filter(Boolean);
}

function parseColorFilamentIds(formData: FormData): string[] {
  return formData.getAll("color_filament_ids").map(String).filter(Boolean);
}

function fromFormSelect(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw && raw !== NONE_VALUE ? raw : null;
}

async function syncRequestFranchiseTagLinks(
  supabase: ReturnType<typeof createServerClient>,
  requestId: string,
  tagIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("request_franchise_tags")
    .delete()
    .eq("request_id", requestId);
  if (deleteError) throw new Error(deleteError.message);

  if (tagIds.length > 0) {
    const { error: linkError } = await supabase
      .from("request_franchise_tags")
      .insert(tagIds.map((tag_id) => ({ request_id: requestId, tag_id })));
    if (linkError) throw new Error(linkError.message);
  }
}

async function syncRequestFilamentLinks(
  supabase: ReturnType<typeof createServerClient>,
  requestId: string,
  filamentIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("request_filaments")
    .delete()
    .eq("request_id", requestId);
  if (deleteError) throw new Error(deleteError.message);

  if (filamentIds.length > 0) {
    const { error: linkError } = await supabase
      .from("request_filaments")
      .insert(filamentIds.map((filament_id) => ({ request_id: requestId, filament_id })));
    if (linkError) throw new Error(linkError.message);
  }
}

function requestFieldsFromForm(formData: FormData) {
  const prizeId = fromFormSelect(formData, "prize_id");
  const freeText = String(formData.get("free_text_prize") ?? "").trim() || null;

  return {
    student_name: String(formData.get("student_name") ?? "").trim(),
    requested_by: String(formData.get("requested_by") ?? "").trim() || null,
    prize_id: prizeId,
    free_text_prize: prizeId ? null : freeText,
    size: fromFormSelect(formData, "size") as RequestSizeOrAny | null,
    color_any: formData.get("color_any") === "on",
    links: String(formData.get("makerworld_link") ?? "").trim() || null,
    is_print_club: formData.get("is_print_club") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
    photo_url: String(formData.get("photo_url") ?? "").trim() || null,
  };
}

// Core logic shared by the redirecting (dedicated page) and non-redirecting
// (side peek) variants below. Never throws -- DB errors are caught and
// returned as form state instead of crashing the page.

async function performCreateRequest(formData: FormData): Promise<RequestFormState> {
  const supabase = createServerClient();
  try {
    const rawStatus = String(formData.get("initial_status") ?? "").trim();
    const CREATABLE_STATUSES: RequestStatus[] = ["idea", "pending", "printed", "cancelled"];
    const initialStatus: RequestStatus = CREATABLE_STATUSES.includes(rawStatus as RequestStatus)
      ? (rawStatus as RequestStatus)
      : "pending";

    const { data: request, error } = await supabase
      .from("requests")
      .insert({
        ...requestFieldsFromForm(formData),
        date_requested:
          String(formData.get("date_requested") ?? "").trim() ||
          new Date().toISOString().slice(0, 10),
        status: initialStatus,
        // A request created directly into pending (or past it) has, by
        // definition, entered the queue right now -- powers the average
        // turnaround stat. "idea" hasn't entered the queue yet.
        pending_at: initialStatus === "idea" ? null : new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    if (request) {
      const tagIds = await resolveFranchiseTagIds(
        supabase,
        parseFranchiseTagNames(formData),
      );
      if (tagIds.length > 0) {
        const { error: linkError } = await supabase
          .from("request_franchise_tags")
          .insert(tagIds.map((tag_id) => ({ request_id: request.id, tag_id })));
        if (linkError) return { error: linkError.message };
      }

      // "Any color" and specific colors can coexist -- e.g. "any color is
      // fine, but blue if possible" -- so both are stored independently.
      const filamentIds = parseColorFilamentIds(formData);
      if (filamentIds.length > 0) {
        const { error: filamentLinkError } = await supabase
          .from("request_filaments")
          .insert(filamentIds.map((filament_id) => ({ request_id: request.id, filament_id })));
        if (filamentLinkError) return { error: filamentLinkError.message };
      }
    }

    revalidatePath("/requests");
    revalidatePath("/");
    return { error: null, success: true, requestId: request?.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }
}

async function performUpdateRequest(
  requestId: string,
  formData: FormData,
): Promise<RequestFormState> {
  const supabase = createServerClient();
  try {
    const { error } = await supabase
      .from("requests")
      .update(requestFieldsFromForm(formData))
      .eq("id", requestId);

    if (error) return { error: error.message };

    const tagIds = await resolveFranchiseTagIds(
      supabase,
      parseFranchiseTagNames(formData),
    );
    await syncRequestFranchiseTagLinks(supabase, requestId, tagIds);
    await syncRequestFilamentLinks(supabase, requestId, parseColorFilamentIds(formData));

    revalidatePath("/requests");
    revalidatePath("/");
    return { error: null, success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }
}

// Dedicated-page variants: redirect back to /requests on success.

export async function createRequest(
  _prevState: RequestFormState | null,
  formData: FormData,
): Promise<RequestFormState> {
  const result = await performCreateRequest(formData);
  if (result.error) return result;
  // Carries the new id across the redirect so /requests can fire the
  // same "New request added" toast this flow would otherwise skip
  // entirely -- see RequestsKanban's `added` query param handling.
  redirect(result.requestId ? `/requests?added=${result.requestId}` : "/requests");
}

export async function updateRequest(
  requestId: string,
  _prevState: RequestFormState | null,
  formData: FormData,
): Promise<RequestFormState> {
  const result = await performUpdateRequest(requestId, formData);
  if (result.error) return result;
  redirect("/requests");
}

// Side-peek variant: no redirect, since the user never leaves /requests.
export async function updateRequestInline(
  requestId: string,
  _prevState: RequestFormState | null,
  formData: FormData,
): Promise<RequestFormState> {
  return performUpdateRequest(requestId, formData);
}

// Side-peek variant of create: no redirect, since the "+ Add new" column
// buttons open the form without leaving /requests.
export async function createRequestInline(
  _prevState: RequestFormState | null,
  formData: FormData,
): Promise<RequestFormState> {
  return performCreateRequest(formData);
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  salePrice?: number | null,
) {
  const supabase = createServerClient();
  const update: {
    status: RequestStatus;
    sale_price?: number | null;
    pending_at?: string;
    fulfilled_at?: string;
  } = { status };
  // Price is locked in when a request moves to Printed (that's when actual
  // size/color availability is known), and carries forward through
  // Fulfilled -- so it's only ever set here, not re-asked for later.
  if (salePrice !== undefined) {
    update.sale_price = salePrice;
  }
  // Powers the average turnaround stat. pending_at is only stamped the
  // first time a request enters the queue (checked below, not
  // unconditionally overwritten here) so a request that gets bounced back
  // to pending later doesn't lose its original wait-start time.
  // fulfilled_at is stamped every time -- it always reflects this moment.
  if (status === "fulfilled") {
    update.fulfilled_at = new Date().toISOString();
  }
  if (status === "pending") {
    const { data: existing } = await supabase
      .from("requests")
      .select("pending_at")
      .eq("id", requestId)
      .single();
    if (!existing?.pending_at) {
      update.pending_at = new Date().toISOString();
    }
  }
  const { error } = await supabase
    .from("requests")
    .update(update)
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
  revalidatePath("/");
}

export async function deleteRequest(requestId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("requests").delete().eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
  revalidatePath("/");
}

// Bulk-clears every cancelled request in one go -- used by the "Clear
// cancelled" button at the bottom of the Cancelled column.
export async function clearCancelledRequests() {
  const supabase = createServerClient();
  const { error } = await supabase.from("requests").delete().eq("status", "cancelled");
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
  revalidatePath("/");
}

// Comments: there's no login system, so `author` is whatever name the
// sensei typed into the field (same free-text pattern as requested_by).
export async function addRequestComment(requestId: string, author: string | null, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error("Comment can't be empty.");
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("request_comments")
    .insert({ request_id: requestId, author: author?.trim() || null, body: trimmedBody })
    .select("id, request_id, author, body, created_at")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
  return data;
}

export async function updateRequestComment(commentId: string, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error("Comment can't be empty.");
  const supabase = createServerClient();
  const { error } = await supabase
    .from("request_comments")
    .update({ body: trimmedBody })
    .eq("id", commentId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}

export async function deleteRequestComment(commentId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("request_comments").delete().eq("id", commentId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}
