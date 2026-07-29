import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { purchasesEnabled } from "@/lib/native";
import { Coins } from "lucide-react";

const COIN_PACKS = [
  { priceId: "coins_15", coins: 15, price: "$1.99", perReport: "13¢" },
  { priceId: "coins_25", coins: 25, price: "$3.99", perReport: "16¢", badge: "Popular" },
  { priceId: "coins_40", coins: 40, price: "$5.99", perReport: "15¢", badge: "Biggest Pack" },
];

/**
 * Coin purchase section (Profile page). 1 coin = 1 report.
 * Hidden entirely on iOS — Apple Guideline 3.1.1 forbids selling digital
 * goods via external payment, and 2.3.x forbids even linking out to buy.
 */
export function CoinStore() {
  const [checkout, setCheckout] = useState<{ priceId: string; title: string } | null>(null);

  if (!purchasesEnabled) return null;

  return (
    <div className="rounded-xl glass-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-bold">Get More Coins</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        1 coin = 1 report. Justice isn't free, but it's surprisingly affordable.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {COIN_PACKS.map(pack => (
          <button
            key={pack.priceId}
            type="button"
            onClick={() => setCheckout({ priceId: pack.priceId, title: `${pack.coins} Coins — ${pack.price}` })}
            className="relative rounded-xl border border-border p-3 text-center transition-all hover:border-amber-500/50 hover:bg-amber-500/5"
          >
            {pack.badge && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {pack.badge}
              </span>
            )}
            <p className="text-xl font-extrabold font-mono">{pack.coins}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">coins</p>
            <p className="text-sm font-bold text-amber-500">{pack.price}</p>
            <p className="text-[10px] text-muted-foreground">{pack.perReport}/report</p>
          </button>
        ))}
      </div>
      {checkout && (
        <CheckoutDialog
          open
          onClose={() => setCheckout(null)}
          title={checkout.title}
          priceId={checkout.priceId}
          returnUrl={`${window.location.origin}/profile`}
        />
      )}
    </div>
  );
}
