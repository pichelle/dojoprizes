"use client";

// Small segmented tab control for switching between sections within a
// side peek (currently Comments / Activity on the request/idea peek).
// Deliberately minimal -- no routing, no persistence -- since which tab
// is showing resets the moment a different card is opened.
export default function PeekTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border-warm">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          aria-pressed={active === tab.value}
          className={`flex items-center gap-1.5 text-sm font-bold px-1 pb-2.5 -mb-px border-b-2 ${
            active === tab.value
              ? "text-ink border-ink"
              : "text-muted border-transparent hover:text-ink"
          }`}
        >
          {tab.label}
          {typeof tab.count === "number" && tab.count > 0 && (
            <span className="font-medium">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
