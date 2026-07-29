"use client";

import { useTransition } from "react";
import type { RequestStatus } from "@/lib/types";
import { showToast } from "@/components/ToastHost";
import Select from "@/components/Select";

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "printed", label: "Printed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

export default function StatusSelect({
  requestId,
  status,
  onChange,
}: {
  requestId: string;
  status: RequestStatus;
  onChange: (requestId: string, status: RequestStatus) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={isPending}
      onValueChange={(next) => {
        showToast("Status updated");
        startTransition(() => {
          onChange(requestId, next as RequestStatus);
        });
      }}
      className="text-xs px-2 py-1"
      options={STATUS_OPTIONS}
    />
  );
}
