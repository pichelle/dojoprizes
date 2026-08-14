"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { NONE_VALUE } from "@/lib/constants";

// Radix disallows an empty-string item value (it's reserved for "cleared").
// Use this sentinel for "All" / "Not specified" style options, and translate
// it back to "" wherever the raw value is actually needed.
// Re-exported here (defined in lib/constants.ts, not this "use client" file)
// so Server Actions can import the real string instead of an opaque client
// reference -- see lib/constants.ts for why that matters.
export { NONE_VALUE };

export type SelectOption = { value: string; label: string; swatch?: string | null };

export default function Select({
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Select...",
  options,
  className = "",
  disabled,
  required,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <RadixSelect.Root
      name={name}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      required={required}
    >
      <RadixSelect.Trigger
        className={`flex items-center justify-between gap-2 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm text-ink outline-none transition-colors data-[placeholder]:text-muted hover:border-border-hover focus:ring-2 focus:ring-sage disabled:opacity-50 ${className}`}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown size={14} className="text-muted shrink-0" aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="overflow-hidden rounded-md border border-border-warm bg-card shadow-md z-50"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport className="p-1 max-h-64">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="relative flex items-center gap-2 rounded-md pl-2.5 pr-6 py-1.5 text-sm text-ink outline-none cursor-pointer data-[highlighted]:bg-page"
              >
                {opt.swatch && (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full border border-border-warm-strong shrink-0"
                    style={{ background: opt.swatch }}
                    aria-hidden="true"
                  />
                )}
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2 inline-flex items-center">
                  <Check size={14} className="text-ink" aria-hidden="true" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
