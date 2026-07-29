"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./ToastHost";
import ConfirmDialog from "./ConfirmDialog";

export default function ActionButton({
  action,
  toastMessage,
  className,
  children,
  confirmMessage,
}: {
  action: () => Promise<void>;
  toastMessage: string;
  className?: string;
  children: React.ReactNode;
  confirmMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function run() {
    // Show the toast optimistically -- some actions redirect() server-side,
    // which throws a control-flow error that would otherwise skip anything
    // after the await.
    showToast(toastMessage);
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        className={className}
        onClick={() => {
          if (confirmMessage) {
            setConfirming(true);
            return;
          }
          run();
        }}
      >
        {children}
      </button>

      {confirming && (
        <ConfirmDialog
          message={confirmMessage!}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            run();
          }}
        />
      )}
    </>
  );
}
