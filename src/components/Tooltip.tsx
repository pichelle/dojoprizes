"use client";

import { useState } from "react";

// Small design-system tooltip to replace native browser title attributes,
// which render with system-default styling that doesn't match the app.
export default function Tooltip({
  label,
  children,
  // "center" (default) works fine for most triggers, but anything sitting
  // near the right edge of a clipped/scrollable container (e.g. the print
  // club corner badge) needs the tooltip to grow leftward instead --
  // otherwise half of it renders past the edge and gets clipped by the
  // ancestor's overflow instead of just wrapping.
  align = "center",
}: {
  label: string;
  children: React.ReactNode;
  align?: "center" | "right";
}) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={`absolute bottom-full mb-1.5 whitespace-nowrap rounded-md bg-ink text-page text-[11px] font-medium px-2 py-1 z-30 pointer-events-none ${
            align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
          }`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
