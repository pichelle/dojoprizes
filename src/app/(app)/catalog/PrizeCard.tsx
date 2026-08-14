"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Prize } from "@/lib/types";
import { formatCoinPriceBreakdown } from "@/lib/coins";
import { showToast } from "@/components/ToastHost";
import { burstConfetti } from "@/lib/confetti";
import BuyerNameModal from "@/components/BuyerNameModal";
import ImageWithFallback from "@/components/ImageWithFallback";

const STATUS_DOT: Record<Prize["status"], string> = {
  in_stock: "bg-sage",
  print_on_request: "bg-slate",
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
  staggerDelay,
}: {
  prize: Prize;
  onCheckout: (prizeId: string, boughtBy: string | null) => Promise<void>;
  onEdit: () => void;
  addedOrSoldDate?: string;
  soldDateKnown: boolean;
  // CSS --stagger-delay value (e.g. "90ms") for the sequential entrance
  // animation -- optional so PrizeCard doesn't require it everywhere.
  staggerDelay?: string;
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
      style={staggerDelay ? ({ "--stagger-delay": staggerDelay } as React.CSSProperties) : undefined}
      className={`card-hover relative bg-card border border-border-warm rounded-xl overflow-hidden flex flex-col cursor-pointer hover:border-border-warm-strong ${
        staggerDelay ? "stagger-in" : ""
      }`}
    >
      <div className="h-44 bg-page flex items-center justify-center">
        {prize.photo_url ? (
          <ImageWithFallback
            src={prize.photo_url}
            alt={prize.name}
            className="h-full w-full object-cover"
            fallback={<span className="text-4xl">🎁</span>}
          />
        ) : (
          <span className="text-4xl">🎁</span>
        )}
      </div>
      <div className="p-3.5 flex-1 flex flex-col gap-1.5">
        <span className="font-serif font-medium text-base text-ink truncate">{prize.name}</span>

        <div className="text-xs text-muted flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[prize.status]}`} />
            {prize.status === "in_stock" ? `In stock: ${prize.stock_count}` : "Print-on-request"}
          </span>
          {dateLabel && (
            <span className="truncate">
              {soldDateKnown ? "Sold" : "Added"} {dateLabel}
            </span>
          )}
        </div>

        <div className="text-xs text-muted truncate">
          {[
            prize.size ? SIZE_LABELS[prize.size] ?? prize.size : null,
            (prize.filaments ?? []).map((f) => f.color_name).join(", ") || null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>

        <div className="mt-auto pt-2.5 border-t border-border-warm flex items-center justify-between gap-2">
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
              Reprint
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
              Mark sold
            </button>
          )}
        </div>
      </div>

      {showBuyerModal && (
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
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
