"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

type ToastItem = { id: number; message: string; onUndo?: () => void };

type Listener = (message: string, options?: { onUndo?: () => void }) => void;
let listeners: Listener[] = [];

export function showToast(message: string, options?: { onUndo?: () => void }) {
  listeners.forEach((l) => l(message, options));
}

const TOAST_DURATION_MS = 5000;

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
        <div
          key={t.id}
          className="toast-enter pointer-events-auto flex items-center gap-2.5 bg-card border border-border-warm rounded-xl shadow-md px-3 py-2.5 min-w-[220px]"
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--color-fulfilled-bg)" }}
          >
            <Check size={14} style={{ color: "var(--color-fulfilled-text)" }} aria-hidden="true" />
          </span>
          <span className="text-[13px] text-ink flex-1">{t.message}</span>
          {t.onUndo && (
            <button
              type="button"
              onClick={() => {
                t.onUndo?.();
                dismiss(t.id);
              }}
              className="text-xs font-semibold underline underline-offset-2"
              style={{ color: "var(--color-printed-text)" }}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="text-muted hover:text-ink shrink-0"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
