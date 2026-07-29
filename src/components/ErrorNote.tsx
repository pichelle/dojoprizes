import { AlertTriangle } from "lucide-react";

export default function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-rust/10 border border-rust/30 rounded-md px-3 py-2 text-sm text-rust">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
