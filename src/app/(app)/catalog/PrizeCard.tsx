"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Prize } from "@/lib/types";
import { formatCoinPriceBreakdown } from "@/lib/coins";
import { showToast } from "@/components/ToastHost";
import { burstConfetti } from "@/lib/confetti";
import BuyerNameModal from "@/components/BuyerNameModal";

const STATUS_DOT: Record<Prize["status"], string> = {
  in_stock: "bg-sage",
  low_stock: "bg-amber",
  print_on_request: "bg-slate",
};

const STATUS_LABELS: Record<Prize["status"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  print_on_request: "Print-on-request",
};

const SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "X-Large",
  true_to_size: "True to size",
};

function formatDate(iso: string) {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PrizeCard({
  prize,
  onCheckout,
  onEdit,
  addedOrSoldDate,
  soldDateKnown,
}: {
  prize: Prize;
  onCheckout: (prizeId: string, boughtBy: string | null) => Promise<void>;
  onEdit: () => void;
  addedOrSoldDate?: string;
  soldDateKnown: boolean;
}) {
  const priceTag = formatCoinPriceBreakdown(prize.coin_price);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const soldButtonRef = useRef<HTMLButtonElement>(null);
  const isPrintOnRequest = prize.stock_count === 0;
  const dateLabel = addedOrSoldDate ? formatDate(addedOrSoldDate) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEdit();
      }}
      className="card-hover relative bg-card border border-border-warm rounded-xl overflow-hidden flex flex-col cursor-pointer hover:border-border-warm-strong"
    >
      <div className="h-44 bg-page flex items-center justify-center">
        {prize.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prize.photo_url}
            alt={prize.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl">🎁</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <span className="font-serif font-medium text-lg text-ink">{prize.name}</span>

        {prize.franchiseTags && prize.franchiseTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prize.franchiseTags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full bg-page text-muted"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-muted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[prize.status]}`} />
            {STATUS_LABELS[prize.status]}
          </span>
          <span>
            Stock: <span className="text-ink">{prize.stock_count}</span>
          </span>
        </div>

        <div className="text-xs text-muted flex items-center justify-between">
          {prize.size && <span>{SIZE_LABELS[prize.size] ?? prize.size}</span>}
          {dateLabel && (
            <span className="ml-auto">
              {soldDateKnown ? "Sold" : "Added"} {dateLabel}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-border-warm flex items-center justify-between gap-2">
          {priceTag ? (
            <span className="text-sm font-medium text-sage">{priceTag}</span>
          ) : (
            <span className="text-xs text-muted">No price set</span>
          )}
          {isPrintOnRequest ? (
            <Link
              href={`/requests/new?prize_id=${prize.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm rounded-md border border-border-warm-strong px-3 py-2 text-ink hover:bg-page shrink-0 transition-colors whitespace-nowrap"
              title="Log a request to print another one of these"
            >
              Print another
            </Link>
          ) : (
            <button
              ref={soldButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBuyerModal(true);
              }}
              className="text-sm rounded-md border border-border-warm-strong px-4 py-2 text-ink hover:bg-page shrink-0 transition-colors"
              title="Log that a student took this off the shelf"
            >
              Sold!
            </button>
          )}
        </div>
      </div>

      {showBuyerModal && (
        <div onClick={(e) => e.stopPropagation()}>
          <BuyerNameModal
            prizeName={prize.name}
            onCancel={() => setShowBuyerModal(false)}
            onConfirm={(buyerName) => {
              setShowBuyerModal(false);
              if (soldButtonRef.current) burstConfetti(soldButtonRef.current);
              onCheckout(prize.id, buyerName || null);
              showToast(buyerName ? `Sold to ${buyerName}!` : "Sold!");
            }}
          />
        </div>
      )}
    </div>
  );
}
