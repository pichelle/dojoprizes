"use client";

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="modal-in relative bg-card border border-border-warm rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <p className="text-sm text-ink">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-rust text-page text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
