"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./ToastHost";
import ConfirmDialog from "./ConfirmDialog";

// Destructive actions are undoable for a short grace period: the actual
// server action is delayed rather than fired immediately, so clicking Undo
// on the toast can cancel it before anything actually happens.
const UNDO_WINDOW_MS = 3000;

export default function ActionButton({
  action,
  toastMessage,
  className,
  children,
  confirmMessage,
  undoable = true,
}: {
  action: () => Promise<void>;
  toastMessage: string;
  className?: string;
  children: React.ReactNode;
  confirmMessage?: string;
  undoable?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function run() {
    if (!undoable) {
      showToast(toastMessage);
      startTransition(async () => {
        await action();
        router.refresh();
      });
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      startTransition(async () => {
        await action();
        router.refresh();
      });
    }, UNDO_WINDOW_MS);

    showToast(toastMessage, {
      onUndo: () => {
        cancelled = true;
        clearTimeout(timeoutId);
      },
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
