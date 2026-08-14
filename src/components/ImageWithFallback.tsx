"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

// Browsers can't detect a broken image link ahead of time -- the only way
// to know a URL doesn't load is to actually try loading it and catch the
// failure. This wraps <img> with that catch (onError) and swaps to a
// graceful fallback instead of the browser's default broken-image icon.
// Used everywhere a request/prize photo comes from an external URL
// (MakerWorld/Tinkercad) that can go stale, get taken down, or (as with
// Tinkercad) require the viewer to be logged in to load at all.
export default function ImageWithFallback({
  src,
  alt = "",
  className,
  fallback,
}: {
  src: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      fallback ?? (
        <div
          className={`flex flex-col items-center justify-center gap-1 bg-page text-muted ${className ?? ""}`}
        >
          <ImageOff size={20} aria-hidden="true" />
          <span className="text-[10px]">Image unavailable</span>
        </div>
      )
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />
  );
}
