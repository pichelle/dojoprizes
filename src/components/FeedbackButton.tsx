"use client";

import { useState } from "react";
import FeedbackModal from "./FeedbackModal";

export default function FeedbackButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/nav-feedback.png"
          alt=""
          className="w-5 h-5 object-contain shrink-0"
          aria-hidden="true"
        />
        Support
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
