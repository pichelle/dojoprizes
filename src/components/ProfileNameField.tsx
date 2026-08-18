"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import ProfileIcon from "@/components/ProfileIcon";
import { formatSensei } from "@/lib/formatSensei";
import { useProfiles } from "@/components/ProfileContext";

// Replaces a plain "sensei name" text input with a profile-chip button:
// closed, it shows whatever's picked as a chip (matching a saved profile's
// icon/color when the name matches one); open, it's a real text input (so
// typing a one-off name -- someone filling in for a co-worker, or before
// profiles existed -- still works) plus a quick-pick list of every saved
// profile as its own chip.
export default function ProfileNameField({
  value,
  onChange,
  placeholder = "Your name",
  inputName,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  // When set, also renders a hidden input under this name so an
  // uncontrolled <form action> submit still picks up the value.
  inputName?: string;
  hasError?: boolean;
}) {
  const { profiles } = useProfiles();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const matchedProfile = profiles.find(
    (p) => p.name.trim().toLowerCase() === value.trim().toLowerCase(),
  );

  return (
    <div ref={containerRef} className="relative">
      {inputName && <input type="hidden" name={inputName} value={value} />}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-sage ${
            hasError ? "field-error" : "border-border-warm-strong"
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <ProfileIcon profile={matchedProfile ?? null} size={20} />
            {value.trim() ? (
              <span className="truncate">
                {matchedProfile ? formatSensei(matchedProfile.name) : formatSensei(value)}
              </span>
            ) : (
              <span className="text-muted truncate">{placeholder}</span>
            )}
          </span>
          <ChevronDown size={15} className="text-muted shrink-0" aria-hidden="true" />
        </button>
      ) : (
        <div className="rounded-md border border-border-warm-strong bg-card p-2 shadow-sm">
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full mb-2 rounded-md border border-border-warm px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
          />
          {profiles.length > 0 && (
            <div className="flex flex-col gap-0.5 max-h-40 overflow-auto scroll-warm">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.name);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-nav text-left"
                >
                  <ProfileIcon profile={p} size={20} />
                  {formatSensei(p.name)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
