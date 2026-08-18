"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadPhoto } from "@/lib/uploadPhoto";

// Drag-and-drop + click-to-choose upload widget, shared by the Requests
// and Catalog photo fields. Uploads straight to Supabase Storage (see
// lib/uploadPhoto.ts) and hands the resulting public URL back via
// onUploaded -- the parent form still owns the actual photo_url value
// (and its paste-a-URL text input), this just offers a second way to
// fill it in.
export default function PhotoDropzone({
  onUploaded,
  disabled = false,
}: {
  onUploaded: (url: string) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploading || disabled) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadPhoto(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        onUploaded(result.url);
      }
    } catch {
      setError("Something went wrong uploading that photo.");
    } finally {
      setUploading(false);
      // Lets the same file be picked again (e.g. after fixing an error)
      // without the browser silently no-op'ing a repeat selection.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed border-border-warm-strong" : "cursor-pointer"
        } ${dragOver ? "border-sage bg-sage-tint" : !disabled ? "border-border-warm-strong hover:bg-nav" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={disabled}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <UploadCloud size={15} className="text-muted shrink-0" aria-hidden="true" />
        <span className="text-ink-soft">
          {uploading ? "Uploading…" : "Drag a photo here, or click to choose one"}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-rust">{error}</p>}
    </div>
  );
}
