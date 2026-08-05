"use client";

export default function AmazonLinkButton({ href }: { href: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
      className="text-xs text-ink-soft hover:text-ink underline underline-offset-2 w-fit text-left"
    >
      Buy on Amazon
    </button>
  );
}
