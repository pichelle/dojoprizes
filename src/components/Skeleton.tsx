export default function Skeleton({
  className = "",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ "--skeleton-delay": `${delay}ms` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}
