"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RequestStatus } from "@/lib/types";
import { showToast } from "@/components/ToastHost";
import Select from "@/components/Select";

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "printed", label: "Printed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

// Same undo grace period as delete (ActionButton) -- the actual server
// update is delayed rather than fired immediately, so Undo on the toast
// can cancel it. Since the select shows the new value optimistically the
// moment it's picked, undoing also has to revert the displayed value, not
// just cancel the pending request -- that's why this holds its own local
// state instead of just using the `status` prop directly.
const UNDO_WINDOW_MS = 5000;

export default function StatusSelect({
  requestId,
  status,
  onChange,
}: {
  requestId: string;
  status: RequestStatus;
  onChange: (requestId: string, status: RequestStatus) => Promise<void>;
}) {
  const [displayed, setDisplayed] = useState<RequestStatus>(status);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: RequestStatus) {
    const previous = displayed;
    setDisplayed(next);

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      startTransition(async () => {
        await onChange(requestId, next);
        router.refresh();
      });
    }, UNDO_WINDOW_MS);

    showToast("Status updated", {
      onUndo: () => {
        cancelled = true;
        clearTimeout(timeoutId);
        setDisplayed(previous);
      },
    });
  }

  return (
    <Select
      value={displayed}
      disabled={isPending}
      onValueChange={(next) => handleChange(next as RequestStatus)}
      className="text-xs px-2 py-1"
      options={STATUS_OPTIONS}
    />
  );
}
