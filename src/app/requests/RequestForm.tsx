"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Filament, FranchiseTag, Prize, PrizeRequest, RequestSize } from "@/lib/types";
import TagInput from "@/components/TagInput";
import MultiSelect from "@/components/MultiSelect";
import Select, { NONE_VALUE } from "@/components/Select";

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

const SIZE_OPTIONS: { value: RequestSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
];

type RequiredField = "student_name" | "requested_by" | "size" | "color_filament_ids";

export default function RequestForm({
  prizes,
  filaments,
  allFranchiseTags,
  action,
  initial,
  initialFranchiseTags = [],
  initialColorFilamentIds = [],
  submitLabel = "Log request",
  onCancel,
}: {
  prizes: Pick<Prize, "id" | "name">[];
  filaments: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  allFranchiseTags: Pick<FranchiseTag, "id" | "name">[];
  action: (formData: FormData) => void;
  initial?: Partial<PrizeRequest>;
  initialFranchiseTags?: string[];
  initialColorFilamentIds?: string[];
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [prizeId, setPrizeId] = useState(initial?.prize_id ?? NONE_VALUE);
  const [errors, setErrors] = useState<Partial<Record<RequiredField, boolean>>>({});

  function validate(form: HTMLFormElement): boolean {
    const fd = new FormData(form);
    const next: Partial<Record<RequiredField, boolean>> = {};

    if (!String(fd.get("student_name") ?? "").trim()) next.student_name = true;
    if (!String(fd.get("requested_by") ?? "").trim()) next.requested_by = true;
    const size = String(fd.get("size") ?? "");
    if (!size || size === NONE_VALUE) next.size = true;
    if (fd.getAll("color_filament_ids").length === 0) next.color_filament_ids = true;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!validate(e.currentTarget)) {
      e.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} noValidate>
      <div className="pb-6">
        <SectionLabel>Basics</SectionLabel>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink">
              Ninja name <Req />
            </label>
            <input
              name="student_name"
              defaultValue={initial?.student_name ?? ""}
              onChange={() => setErrors((prev) => ({ ...prev, student_name: false }))}
              className={`mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage ${
                errors.student_name ? "field-error" : "border-border-warm-strong"
              }`}
            />
            <FieldError show={errors.student_name} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">
              Requested by (sensei) <Req />
            </label>
            <input
              name="requested_by"
              placeholder="Your name"
              defaultValue={initial?.requested_by ?? ""}
              onChange={() => setErrors((prev) => ({ ...prev, requested_by: false }))}
              className={`mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage ${
                errors.requested_by ? "field-error" : "border-border-warm-strong"
              }`}
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
          <div>
            <label className="block text-sm font-medium text-ink">
              Prize (from catalog)
            </label>
            <div className="mt-1">
              <Select
                name="prize_id"
                value={prizeId}
                onValueChange={setPrizeId}
                className="w-full"
                options={[
                  { value: NONE_VALUE, label: "Not catalogued yet / other" },
                  ...prizes.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">
              If not catalogued, describe it
            </label>
            <input
              name="free_text_prize"
              disabled={prizeId !== NONE_VALUE}
              defaultValue={initial?.free_text_prize ?? ""}
              placeholder="e.g. custom Bulbasaur keychain"
              className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage disabled:bg-page"
            />
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

          <div>
            <label className="block text-sm font-medium text-ink">
              Size <Req />
            </label>
            <div className={`mt-1 ${errors.size ? "rounded-md ring-2 ring-rust" : ""}`}>
              <Select
                name="size"
                defaultValue={initial?.size ?? undefined}
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

          <div>
            <label className="block text-sm font-medium text-ink">
              Color requested <Req />
            </label>
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
              MakerWorld link
            </label>
            <input
              name="makerworld_link"
              type="url"
              defaultValue={initial?.links ?? ""}
              placeholder="https://makerworld.com/..."
              className="mt-1 w-full rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <p className="mt-1.5 text-sm text-muted">
              Highly recommended, and much appreciated. It&apos;s the most helpful thing you can add.
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
            className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            {submitLabel}
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
