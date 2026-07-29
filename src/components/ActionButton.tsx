"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./ToastHost";

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
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      className={className}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        // Show the toast optimistically -- some actions redirect() server-side,
        // which throws a control-flow error that would otherwise skip anything
        // after the await.
        showToast(toastMessage);
        startTransition(async () => {
          await action();
          router.refresh();
        });
      }}
    >
      {children}
    </button>
  );
}
