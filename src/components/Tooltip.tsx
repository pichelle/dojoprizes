"use client";

import { useState } from "react";

// Small design-system tooltip to replace native browser title attributes,
// which render with system-default styling that doesn't match the app.
export default function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-ink text-page text-[11px] font-medium px-2 py-1 z-30 pointer-events-none"
        >
          {label}
        </span>
      )}
    </span>
  );
}
