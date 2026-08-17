"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Filament,
  FranchiseTag,
  Prize,
  PrizeRequest,
  RequestSizeOrAny,
  RequestStatus,
} from "@/lib/types";
import TagInput from "@/components/TagInput";
import MultiSelect from "@/components/MultiSelect";
import Select, { NONE_VALUE } from "@/components/Select";
import ErrorNote from "@/components/ErrorNote";
import { showToast } from "@/components/ToastHost";
import { useProfiles } from "@/components/ProfileContext";
import ProfileNameField from "@/components/ProfileNameField";
import type { RequestFormState } from "./actions";

function Req() {
  return <span className="text-rust">*</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-serif text-xs font-semibold uppercase tracking-wide text-muted mb-3">
      {children}
    </p>
  );
}

function FieldError({ show }: { show?: boolean }) {
  if (!show) return null;
  return <p className="mt-1 text-xs text-rust">Please fill out this field.</p>;
}

const SIZE_OPTIONS: { value: RequestSizeOrAny; label: string }[] = [
  { value: "any", label: "Any size" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
  { value: "true_to_size", label: "True to size" },
];

type RequiredField = "student_name" | "requested_by" | "size" | "color_filament_ids";

const STATUS_LABELS: Record<RequestStatus, string> = {
  idea: "Ideas",
  pending: "Queue",
  printed: "Pickup",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const initialState: RequestFormState = { error: null };

export default function RequestForm({
  prizes,
  filaments,
  allFranchiseTags,
  action,
  initial,
  initialFranchiseTags = [],
  initialColorFilamentIds = [],
  initialPrizeId,
  initialPhotoUrl,
  initialSize,
  submitLabel = "Log request",
  presetStatus,
  onCancel,
  onSuccess,
}: {
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  action: (prevState: RequestFormState | null, formData: FormData) => Promise<RequestFormState>;
  initial?: Partial<PrizeRequest>;
  initialFranchiseTags?: string[];
  initialColorFilamentIds?: string[];
  // Prefills the prize dropdown when arriving from "Print another" on a
  // print-on-request catalog card -- only used when there's no `initial`
  // record (i.e. creating, not editing).
  initialPrizeId?: string;
  // Same idea as initialPrizeId -- prefills the photo/size fields from a
  // catalog prize's own details on "Print another" without flipping
  // isCreating (which only "initial", i.e. editing an existing request,
  // should do).
  initialPhotoUrl?: string | null;
  initialSize?: RequestSizeOrAny | null;
  submitLabel?: string;
  // When set, creation skips the Idea/Request toggle and logs straight into
  // this status -- used by the "+ Add new" buttons on each kanban column.
  presetStatus?: RequestStatus;
  onCancel?: () => void;
  onSuccess?: (result?: { requestId?: string }) => void;
}) {
  const router = useRouter();
  const isCreating = !initial;
  const { activeProfile } = useProfiles();
  // Auto-fills from the picked profile on this device but stays freely
  // editable -- someone logging a request for a co-worker (or before
  // profiles existed) can still type over it.
  const [requestedBy, setRequestedBy] = useState(initial?.requested_by ?? activeProfile?.name ?? "");
  const [prizeId, setPrizeId] = useState(initial?.prize_id ?? initialPrizeId ?? NONE_VALUE);
  const [initialStatus, setInitialStatus] = useState<RequestStatus>(
    presetStatus ?? (initial?.status === "idea" ? "idea" : "pending"),
  );
  const [errors, setErrors] = useState<Partial<Record<RequiredField, boolean>>>({});
  const [colorAny, setColorAny] = useState(initial?.color_any ?? false);
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? initialPhotoUrl ?? "");
  const [makerworldLink, setMakerworldLink] = useState(initial?.links ?? "");
  const [fetchingImage, setFetchingImage] = useState(false);
  const [imageFetchError, setImageFetchError] = useState<string | null>(null);

  const successHandled = useRef(false);
  useEffect(() => {
    if (state?.success && !successHandled.current) {
      successHandled.current = true;
      showToast(
        submitLabel === "Save changes"
          ? "Changes saved"
          : initialStatus === "idea"
            ? "Idea logged"
            : "Request logged",
      );
      onSuccess?.({ requestId: state.requestId });
    }
  }, [state, submitLabel, onSuccess, initialStatus]);

  async function fetchImageFromMakerworld() {
    if (!makerworldLink.trim()) {
      setImageFetchError("Paste a MakerWorld link first.");
      return;
    }
    setFetchingImage(true);
    setImageFetchError(null);
    try {
      const res = await fetch(
        `/api/makerworld-preview?url=${encodeURIComponent(makerworldLink.trim())}`,
      );
      const data = await res.json();
      if (data.imageUrl) {
        setPhotoUrl(data.imageUrl);
      } else {
        setImageFetchError(data.error ?? "Couldn't find an image on that page.");
      }
    } catch {
      setImageFetchError("Something went wrong fetching that link.");
    } finally {
      setFetchingImage(false);
    }
  }

  // Matches the fields' top-to-bottom order in the form -- used to figure
  // out which invalid field is "first" so a failed submit can scroll to it.
  const FIELD_ORDER: RequiredField[] = ["student_name", "requested_by", "size", "color_filament_ids"];

  function validate(form: HTMLFormElement): Partial<Record<RequiredField, boolean>> {
    const fd = new FormData(form);
    const next: Partial<Record<RequiredField, boolean>> = {};

    if (!String(fd.get("student_name") ?? "").trim()) next.student_name = true;
    if (!String(fd.get("requested_by") ?? "").trim()) next.requested_by = true;
    // Size and color are required in every status, including Ideas -- but
    // "Any" (size/color) satisfies the requirement, so a deliberate "no
    // preference" isn't blocked, only a forgotten field.
    const size = String(fd.get("size") ?? "");
    if (!size || size === NONE_VALUE) next.size = true;
    if (fd.get("color_any") !== "on" && fd.getAll("color_filament_ids").length === 0) {
      next.color_filament_ids = true;
    }

    setErrors(next);
    return next;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const invalid = validate(form);
    if (Object.keys(invalid).length > 0) {
      e.preventDefault();
      // Fields can be well below the fold, and a click that silently does
      // nothing (beyond a small red label somewhere off-screen) reads as a
      // broken button -- scroll the first invalid field into view instead
      // of leaving it to be hunted down.
      const firstKey = FIELD_ORDER.find((key) => invalid[key]);
      if (firstKey) {
        const target = form.querySelector(`[data-field="${firstKey}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = target?.querySelector<HTMLElement>("input, button, [role='combobox']");
        focusable?.focus();
      }
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate>
      {state?.error && (
        <div className="mb-5">
          <ErrorNote>{state.error}</ErrorNote>
        </div>
      )}

      <div className="pb-6">
        <SectionLabel>Basics</SectionLabel>

        {isCreating && (
          <div className="mb-4">
            <input type="hidden" name="initial_status" value={initialStatus} />
            {presetStatus ? (
              <p className="text-xs text-muted">
                Adding to the <span className="font-medium text-ink">{STATUS_LABELS[presetStatus]}</span> column.
              </p>
            ) : (
              <>
                <div className="inline-flex rounded-md border border-border-warm-strong bg-card p-0.5 text-sm">
                  <button
                    type="button"
                    onClick={() => setInitialStatus("pending")}
                    className={`rounded px-3 py-1.5 font-medium transition-colors ${
                      initialStatus === "pending" ? "bg-ink text-page" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialStatus("idea")}
                    className={`rounded px-3 py-1.5 font-medium transition-colors ${
                      initialStatus === "idea" ? "bg-ink text-page" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    Idea
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {initialStatus === "idea"
                    ? "Not a firm request yet -- a sensei's idea or a themed print for later. Goes in the Ideas column until it's moved to Pending or Cancelled."
                    : "A real request someone's waiting on. Goes straight into Pending."}
                </p>
              </>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div data-field="student_name">
            <label className="block text-sm font-medium text-ink">
              {initialStatus === "idea" ? "Idea title" : "Ninja name"} <Req />
            </label>
            <input
              name="student_name"
              placeholder={initialStatus === "idea" ? "e.g. Halloween pumpkin box" : undefined}
              defaultValue={initial?.student_name ?? ""}
              onChange={() => setErrors((prev) => ({ ...prev, student_name: false }))}
              className={`mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage ${
                errors.student_name ? "field-error" : "border-border-warm-strong"
              }`}
            />
            <FieldError show={errors.student_name} />
          </div>

          <div data-field="requested_by">
            <label className="block text-sm font-medium text-ink mb-1">
              Requested by (sensei) <Req />
            </label>
            <ProfileNameField
              value={requestedBy}
              onChange={(v) => {
                setRequestedBy(v);
                setErrors((prev) => ({ ...prev, requested_by: false }));
              }}
              inputName="requested_by"
              hasError={errors.requested_by}
            />
            <FieldError show={errors.requested_by} />
          </div>

          <div className="sm:col-span-2 sm:max-w-[15rem]">
            <label className="block text-sm font-medium text-ink">
              Date requested
            </label>
            <input
              type="date"
              name="date_requested"
              defaultValue={initial?.date_requested ?? new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>
        </div>
      </div>

      <div className="py-6 border-t border-border-warm">
        <SectionLabel>Details</SectionLabel>
        <div className="grid sm:grid-cols-2 gap-4">
          {initialStatus !== "idea" && (
            <>
              <div>
                <label className="block text-sm font-medium text-ink">
                  Title of print
                </label>
                <input
                  name="free_text_prize"
                  disabled={prizeId !== NONE_VALUE}
                  defaultValue={initial?.free_text_prize ?? ""}
                  placeholder="e.g. custom Bulbasaur keychain"
                  className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage disabled:bg-page"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink">
                  OR select from existing
                </label>
                <div className="mt-1">
                  <Select
                    name="prize_id"
                    value={prizeId}
                    onValueChange={setPrizeId}
                    className="w-full"
                    options={[
                      { value: NONE_VALUE, label: "Select" },
                      ...prizes.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                </div>
              </div>

              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="is_print_club"
                  defaultChecked={initial?.is_print_club ?? false}
                  className="accent-sage"
                />
                3D Print Club
              </label>
            </>
          )}

          <div data-field="size">
            <label className="block text-sm font-medium text-ink">
              Size <Req />
            </label>
            <div className={`mt-1 ${errors.size ? "rounded-md ring-2 ring-rust" : ""}`}>
              <Select
                name="size"
                defaultValue={initial?.size ?? initialSize ?? undefined}
                placeholder="Select a size..."
                className="w-full"
                options={SIZE_OPTIONS}
                onValueChange={() => setErrors((prev) => ({ ...prev, size: false }))}
              />
            </div>
            <p className="mt-1.5 text-sm text-muted">
              Remind students that larger prints take more time.
            </p>
            <FieldError show={errors.size} />
          </div>

          <div data-field="color_filament_ids">
            <label className="block text-sm font-medium text-ink">
              Color requested <Req />
            </label>
            {colorAny && <input type="hidden" name="color_any" value="on" />}
            <div className={`mt-1 ${errors.color_filament_ids ? "rounded-md ring-2 ring-rust" : ""}`}>
              <MultiSelect
                name="color_filament_ids"
                initialValues={initialColorFilamentIds}
                placeholder="Select colors..."
                options={filaments.map((f) => ({
                  value: f.id,
                  label: f.color_name,
                  swatch: f.swatch_hex,
                }))}
                onChange={() => setErrors((prev) => ({ ...prev, color_filament_ids: false }))}
                anyOption={{ label: "Any color" }}
                anySelected={colorAny}
                onAnyToggle={() => {
                  setColorAny((prev) => !prev);
                  setErrors((prev) => ({ ...prev, color_filament_ids: false }));
                }}
              />
            </div>
            <p className="mt-1.5 text-sm text-muted">
              Try to keep it at 1-2 colors.
            </p>
            {filaments.length === 0 && (
              <p className="mt-1.5 text-sm text-muted">
                Add colors on the Filament page to select one here.
              </p>
            )}
            <FieldError show={errors.color_filament_ids} />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink">
              Theme / franchise tags
            </label>
            <div className="mt-1">
              <TagInput
                name="franchise_tag_names"
                allTags={allFranchiseTags}
                initialTags={initialFranchiseTags}
                placeholder="Pokémon, Hello Kitty, Minecraft, custom..."
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink">
              MakerWorld or Tinkercad link
            </label>
            <div className="mt-1 flex gap-2">
              <input
                name="makerworld_link"
                type="url"
                value={makerworldLink}
                onChange={(e) => setMakerworldLink(e.target.value)}
                placeholder="https://makerworld.com/... or https://tinkercad.com/..."
                className="flex-1 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
              />
              <button
                type="button"
                onClick={fetchImageFromMakerworld}
                disabled={fetchingImage}
                className="whitespace-nowrap rounded-md border border-border-warm-strong px-3 py-2 text-sm text-ink hover:bg-nav disabled:opacity-50"
              >
                {fetchingImage ? "Fetching…" : "Fetch image"}
              </button>
            </div>
            <p className="mt-1.5 text-sm text-muted">
              Highly recommended, and much appreciated. It&apos;s the most helpful thing you can add.
            </p>
            {imageFetchError && (
              <p className="mt-1 text-xs text-rust">{imageFetchError}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink">
              Photo URL
            </label>
            <div className="mt-1 flex items-start gap-3">
              <input
                name="photo_url"
                placeholder="https://..."
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="flex-1 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
              />
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="h-10 w-10 object-cover rounded-md border border-border-warm shrink-0"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  onLoad={(e) => (e.currentTarget.style.display = "block")}
                />
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted">
              Pulled automatically from the MakerWorld link, or paste your own photo URL.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border-warm">
        <SectionLabel>Notes</SectionLabel>
        <div>
          <label className="block text-sm font-medium text-ink">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={initial?.notes ?? ""}
            className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <p className="mt-4 text-sm text-muted bg-page rounded-md px-3 py-2">
          Most requests take 1 to 4 weeks. Please remind the ninja to be patient
          as other projects print too!
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60"
          >
            {isPending
              ? "Saving…"
              : isCreating && initialStatus === "idea"
                ? "Log idea"
                : submitLabel}
          </button>
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : router.push("/requests"))}
            className="text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
