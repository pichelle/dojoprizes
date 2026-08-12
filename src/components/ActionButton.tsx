"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./ToastHost";
import ConfirmDialog from "./ConfirmDialog";

// Destructive actions are undoable for a short grace period: the actual
// server action is delayed rather than fired immediately, so clicking Undo
// on the toast can cancel it before anything actually happens.
const UNDO_WINDOW_MS = 5000;

export default function ActionButton({
  action,
  toastMessage,
  className,
  children,
  confirmMessage,
  undoable = true,
  onStart,
  onUndo,
}: {
  action: () => Promise<void>;
  toastMessage: string;
  className?: string;
  children: React.ReactNode;
  confirmMessage?: string;
  undoable?: boolean;
  // Fires synchronously the moment the action is confirmed (or clicked,
  // if there's no confirm step) -- well before the undo window elapses
  // or the server round-trip finishes. Used to close a side peek showing
  // the thing being deleted immediately, rather than leaving it open and
  // seemingly unresponsive for the full 5s undo grace period. The Undo
  // button lives on the toast itself, not the peek, so there's nothing
  // lost by closing right away.
  onStart?: () => void;
  // Fires if Undo is clicked on the toast, alongside ActionButton's own
  // internal cancel/clearTimeout. Used to restore whatever onStart hid
  // (e.g. re-show a card that was optimistically removed from a list).
  onUndo?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function run() {
    onStart?.();

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
        onUndo?.();
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
