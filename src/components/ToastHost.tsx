"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import StickyNote from "./StickyNote";

type ToastItem = { id: number; message: string };

type Listener = (message: string) => void;
let listeners: Listener[] = [];

export function showToast(message: string) {
  listeners.forEach((l) => l(message));
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler: Listener = (message) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2600);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <StickyNote key={t.id} rotate={1} className="toast-enter">
          <span className="font-serif text-[13px] text-ink flex items-center gap-1.5">
            <Check size={14} className="text-sage shrink-0" aria-hidden="true" />
            {t.message}
          </span>
        </StickyNote>
      ))}
    </div>
  );
}
