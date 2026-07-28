"use client";

import { useRouter } from "next/navigation";
import type { Prize } from "@/lib/types";
import { COIN_TIER_LABELS, COIN_TIER_STYLES, formatCoinPriceBreakdown } from "@/lib/coins";

const STATUS_STYLES: Record<Prize["status"], string> = {
  in_stock: "bg-green-100 text-green-800",
  low_stock: "bg-amber-100 text-amber-800",
  out_of_stock: "bg-red-100 text-red-800",
  print_on_request: "bg-blue-100 text-blue-800",
};

const STATUS_LABELS: Record<Prize["status"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  print_on_request: "Print-on-request",
};

export default function PrizeCard({
  prize,
  onCheckout,
}: {
  prize: Prize;
  onCheckout: (prizeId: string) => Promise<void>;
}) {
  const router = useRouter();
  const priceTag = formatCoinPriceBreakdown(prize.coin_price);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/catalog/${prize.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/catalog/${prize.id}`);
      }}
      className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col cursor-pointer hover:border-neutral-400 hover:shadow-sm transition"
    >
      <div className="h-36 bg-neutral-100 flex items-center justify-center">
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
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium">{prize.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[prize.status]}`}
          >
            {STATUS_LABELS[prize.status]}
          </span>
        </div>

        {prize.franchiseTags && prize.franchiseTags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {prize.franchiseTags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600"
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-400">No theme tags</div>
        )}

        {prize.coin_tier && (
          <div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${COIN_TIER_STYLES[prize.coin_tier]}`}
            >
              {COIN_TIER_LABELS[prize.coin_tier]}
            </span>
          </div>
        )}

        <div className="text-sm text-neutral-600">
          Stock: <span className="font-medium">{prize.stock_count}</span>
        </div>

        <div className="mt-auto pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
          {priceTag ? (
            <span className="text-base font-semibold text-amber-700">
              🪙 {priceTag}
            </span>
          ) : (
            <span className="text-xs text-neutral-400">No price set</span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCheckout(prize.id);
            }}
            className="text-xs rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 shrink-0"
            title="Log that a student took this off the shelf"
          >
            Check out ✅
          </button>
        </div>
      </div>
    </div>
  );
}
