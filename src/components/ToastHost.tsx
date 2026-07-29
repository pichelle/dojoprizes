"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import StickyNote from "./StickyNote";

type ToastItem = { id: number; message: string; onUndo?: () => void };

type Listener = (message: string, options?: { onUndo?: () => void }) => void;
let listeners: Listener[] = [];

export function showToast(message: string, options?: { onUndo?: () => void }) {
  listeners.forEach((l) => l(message, options));
}

const TOAST_DURATION_MS = 3000;

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler: Listener = (message, options) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, onUndo: options?.onUndo }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION_MS);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <StickyNote key={t.id} rotate={1} className="toast-enter pointer-events-auto">
          <span className="font-serif font-medium text-[13px] text-ink flex items-center gap-2">
            <Check size={14} className="text-sage shrink-0" aria-hidden="true" />
            {t.message}
            {t.onUndo && (
              <button
                type="button"
                onClick={() => {
                  t.onUndo?.();
                  dismiss(t.id);
                }}
                className="ml-1 text-xs font-sans font-semibold text-sage underline underline-offset-2 hover:text-ink"
              >
                Undo
              </button>
            )}
          </span>
        </StickyNote>
      ))}
    </div>
  );
}
