"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

// Radix disallows an empty-string item value (it's reserved for "cleared").
// Use this sentinel for "All" / "Not specified" style options, and translate
// it back to "" wherever the raw value is actually needed.
export const NONE_VALUE = "__none__";

export type SelectOption = { value: string; label: string };

export default function Select({
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Select...",
  options,
  className = "",
  disabled,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <RadixSelect.Root
      name={name}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        className={`flex items-center justify-between gap-2 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm text-ink outline-none data-[placeholder]:text-muted focus:ring-2 focus:ring-sage disabled:opacity-50 ${className}`}
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
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2 inline-flex items-center">
                  <Check size={14} className="text-sage" aria-hidden="true" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
