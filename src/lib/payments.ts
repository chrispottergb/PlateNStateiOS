// Unified purchase entry point.
//   iOS    → Apple In-App Purchase (StoreKit via cordova-plugin-purchase)
//   others → Stripe checkout (CheckoutDialog / create-checkout API)
// Product IDs are IDENTICAL across Stripe's PRICES map and App Store Connect,
// so callers pass the same priceId everywhere.
import { isIOS } from "@/lib/native";

const API_BASE = "https://platenstate-scan-api.vercel.app";

export const IAP_PRODUCT_IDS = [
  "coins_15", "coins_25", "coins_40", "report_dispute_fee",
  // Legacy pack ids kept registered so past purchases still restore/verify
  "coins_10", "coins_50", "coins_100",
  "plate_claim_1yr", "plate_claim_2yr", "plate_claim_5yr", "plate_claim_lifetime",
] as const;
export const IAP_SUBSCRIPTION_IDS = ["plate_privacy_monthly", "plate_total_block_monthly"] as const;

type PurchaseMeta = { userId?: string; plateNumber?: string; disputeId?: string };

let storeReady: Promise<any> | null = null;

/** Initialize StoreKit exactly once (iOS only). Resolves to the CdvPurchase store. */
function initStore(): Promise<any> {
  if (storeReady) return storeReady;
  storeReady = new Promise((resolve, reject) => {
    const w = window as any;
    if (!w.CdvPurchase) { reject(new Error("IAP plugin not available")); return; }
    const { store, ProductType, Platform } = w.CdvPurchase;
    for (const id of IAP_PRODUCT_IDS) {
      store.register({
        id,
        platform: Platform.APPLE_APPSTORE,
        type: id === "plate_claim_lifetime" ? ProductType.NON_CONSUMABLE
          : id.startsWith("plate_claim_") ? ProductType.NON_RENEWING_SUBSCRIPTION
          : ProductType.CONSUMABLE,
      });
    }
    for (const id of IAP_SUBSCRIPTION_IDS) {
      store.register({ id, platform: Platform.APPLE_APPSTORE, type: ProductType.PAID_SUBSCRIPTION });
    }
    store.initialize([Platform.APPLE_APPSTORE]).then(() => resolve(store)).catch(reject);
  });
  return storeReady;
}

/**
 * Buy a product on iOS through StoreKit. Resolves once the transaction is
 * verified server-side and fulfilled (coins credited / claim recorded).
 * Rejects on cancel or failure.
 */
export async function buyWithApple(priceId: string, meta: PurchaseMeta): Promise<void> {
  const store = await initStore();
  const w = window as any;
  const { Platform } = w.CdvPurchase;

  const offer = store.get(priceId, Platform.APPLE_APPSTORE)?.getOffer();
  if (!offer) throw new Error("Product not available. Try again in a moment.");

  return new Promise<void>((resolve, reject) => {
    const off = store.when()
      .approved(async (transaction: any) => {
        if (!transaction.products.some((p: any) => p.id === priceId)) return;
        try {
          // Server-side verification + fulfillment BEFORE finishing the transaction
          const resp = await fetch(`${API_BASE}/api/apple-verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: transaction.transactionId,
              productId: priceId,
              ...meta,
            }),
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data?.error || "Verification failed");
          transaction.finish();
          off.off?.();
          resolve();
        } catch (e) {
          // Do NOT finish — StoreKit will retry delivery; server fulfillment is idempotent.
          off.off?.();
          reject(e);
        }
      })
      .cancelled(() => { off.off?.(); reject(new Error("Purchase cancelled")); });

    offer.order().catch((e: any) => { off.off?.(); reject(e); });
  });
}

/** Restore previously purchased non-consumables/subscriptions (Apple requires this button). */
export async function restoreApplePurchases(): Promise<void> {
  const store = await initStore();
  await store.restorePurchases();
}

export { isIOS };
