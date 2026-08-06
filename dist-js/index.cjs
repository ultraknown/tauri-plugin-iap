'use strict';

var core = require('@tauri-apps/api/core');

/**
 * Purchase state enumeration
 */
exports.PurchaseState = void 0;
(function (PurchaseState) {
    PurchaseState[PurchaseState["PURCHASED"] = 0] = "PURCHASED";
    PurchaseState[PurchaseState["CANCELED"] = 1] = "CANCELED";
    PurchaseState[PurchaseState["PENDING"] = 2] = "PENDING";
})(exports.PurchaseState || (exports.PurchaseState = {}));
/**
 * Google Play subscription replacement modes for upgrades/downgrades.
 * Used with `subscriptionReplacementMode` in `PurchaseOptions`.
 * @see https://developer.android.com/reference/com/android/billingclient/api/BillingFlowParams.SubscriptionUpdateParams.ReplacementMode
 */
exports.SubscriptionReplacementMode = void 0;
(function (SubscriptionReplacementMode) {
    /** Replacement takes effect when the old plan expires, and the new price is charged at the same time. */
    SubscriptionReplacementMode[SubscriptionReplacementMode["DEFERRED"] = 6] = "DEFERRED";
    /** Replacement takes effect immediately. The billing cycle remains the same. The remaining value from the old price is prorated for the new plan. */
    SubscriptionReplacementMode[SubscriptionReplacementMode["WITH_TIME_PRORATION"] = 1] = "WITH_TIME_PRORATION";
    /** Replacement takes effect immediately. The new price is charged immediately and in full. Any remaining period from the old plan is used to extend the new billing date. */
    SubscriptionReplacementMode[SubscriptionReplacementMode["CHARGE_FULL_PRICE"] = 5] = "CHARGE_FULL_PRICE";
    /** Replacement takes effect immediately. The new plan price is reduced by the prorated cost of the old plan for the remaining period. */
    SubscriptionReplacementMode[SubscriptionReplacementMode["CHARGE_PRORATED_PRICE"] = 2] = "CHARGE_PRORATED_PRICE";
    /** Replacement takes effect immediately with no proration. The user is charged full price for the new plan. */
    SubscriptionReplacementMode[SubscriptionReplacementMode["WITHOUT_PRORATION"] = 3] = "WITHOUT_PRORATION";
})(exports.SubscriptionReplacementMode || (exports.SubscriptionReplacementMode = {}));
/**
 * Initialize the IAP plugin.
 *
 * @deprecated This function is no longer needed. The billing client is now initialized automatically when the plugin loads. This function will be removed in the next major release.
 * @returns Promise resolving to `{ success: true }` for backward compatibility
 */
async function initialize() {
    return await core.invoke("plugin:iap|initialize");
}
/**
 * Fetch product information from the app store.
 *
 * @param productIds - Array of product identifiers to fetch
 * @param productType - Type of products: "subs" for subscriptions, "inapp" for one-time purchases
 * @returns Promise resolving to product information
 * @example
 * ```typescript
 * const { products } = await getProducts(
 *   ['com.example.premium', 'com.example.remove_ads'],
 *   'inapp'
 * );
 * ```
 */
async function getProducts(productIds, productType = "subs") {
    return await core.invoke("plugin:iap|get_products", {
        payload: {
            productIds,
            productType,
        },
    });
}
/**
 * Initiate a purchase for the specified product.
 *
 * @param productId - Product identifier to purchase
 * @param productType - Type of product: "subs" or "inapp"
 * @param options - Optional purchase parameters (platform-specific)
 * @returns Promise resolving to purchase transaction details
 * @example
 * ```typescript
 * // Simple purchase
 * const purchase = await purchase('com.example.premium', 'subs');
 *
 * // With options (iOS)
 * const purchase = await purchase('com.example.premium', 'subs', {
 *   appAccountToken: '550e8400-e29b-41d4-a716-446655440000' // Must be valid UUID
 * });
 *
 * // With options (Android)
 * const purchase = await purchase('com.example.premium', 'subs', {
 *   offerToken: 'offer_token_here',
 *   obfuscatedAccountId: 'user_account_id',
 *   obfuscatedProfileId: 'user_profile_id'
 * });
 *
 * // Subscription upgrade/downgrade (Android)
 * const purchase = await purchase('com.example.premium', 'subs', {
 *   offerToken: 'new_plan_offer_token',
 *   oldPurchaseToken: 'existing_subscription_purchase_token',
 *   subscriptionReplacementMode: SubscriptionReplacementMode.WITH_TIME_PRORATION
 * });
 * ```
 */
async function purchase(productId, productType = "subs", options) {
    return await core.invoke("plugin:iap|purchase", {
        payload: {
            productId,
            productType,
            ...options,
        },
    });
}
/**
 * Restore user's previous purchases.
 *
 * @param productType - Type of products to restore: "subs", "inapp", or "" for all
 * @returns Promise resolving to list of restored purchases
 * @example
 * ```typescript
 * const { purchases } = await restorePurchases('');
 * purchases.forEach(purchase => {
 *   console.log(`Restored: ${purchase.productId}`);
 * });
 * ```
 */
async function restorePurchases(productType = "") {
    return await core.invoke("plugin:iap|restore_purchases", {
        payload: {
            productType,
        },
    });
}
/**
 * Get the user's purchase history.
 * Note: Not supported on all platforms.
 *
 * @returns Promise resolving to purchase history
 * @example
 * ```typescript
 * const { history } = await getPurchaseHistory();
 * history.forEach(record => {
 *   console.log(`Purchase: ${record.productId} at ${record.purchaseTime}`);
 * });
 * ```
 */
async function getPurchaseHistory() {
    return await core.invoke("plugin:iap|get_purchase_history");
}
/**
 * Acknowledge a non-consumable purchase (subscriptions, durable products).
 *
 * On Android this calls `BillingClient.acknowledgePurchase()` and is required
 * within 3 days of purchase or Google will auto-refund. On iOS, macOS, and
 * Windows this is a no-op — those stores handle acknowledgment automatically.
 *
 * For consumable products (credits, coins, gems) call {@link consumePurchase}
 * instead. Never call both for the same purchase token.
 *
 * @param purchaseToken - Purchase token from the transaction
 * @throws Rejects if acknowledgment fails (e.g., Android billing client error)
 * @example
 * ```typescript
 * await acknowledgePurchase(purchase.purchaseToken);
 * ```
 */
async function acknowledgePurchase(purchaseToken) {
    await core.invoke("plugin:iap|acknowledge_purchase", {
        payload: {
            purchaseToken,
        },
    });
}
/**
 * Consume a purchased consumable product so it can be purchased again.
 *
 * On Android this calls `BillingClient.consumeAsync()`, which acknowledges the
 * purchase and removes ownership from the user's account. On Windows this calls
 * `StoreContext.ReportConsumableFulfillmentAsync` with quantity 1. On iOS and
 * macOS this is a no-op — StoreKit auto-allows re-purchase once `purchase()`
 * has finished the transaction.
 *
 * Use this for consumables (credits, coins, gems). For non-consumables and
 * subscriptions call {@link acknowledgePurchase} instead. Never call both for
 * the same purchase token.
 *
 * @param purchaseToken - Purchase token from the transaction
 * @throws Rejects if consumption fails (e.g., Android billing client error,
 *   Windows network/server error, or invalid token on Windows)
 * @example
 * ```typescript
 * const result = await purchase('credits_100', 'inapp');
 * await consumePurchase(result.purchaseToken);
 * // user can now buy credits_100 again
 * ```
 */
async function consumePurchase(purchaseToken) {
    await core.invoke("plugin:iap|consume_purchase", {
        payload: {
            purchaseToken,
        },
    });
}
/**
 * Get the current status of a product for the user.
 * Checks if the product is owned, expired, or available for purchase.
 *
 * @param productId - Product identifier to check
 * @param productType - Type of product: "subs" or "inapp"
 * @returns Promise resolving to product status
 * @example
 * ```typescript
 * const status = await getProductStatus('com.example.premium', 'subs');
 * if (status.isOwned) {
 *   console.log('User owns this product');
 *   if (status.isAutoRenewing) {
 *     console.log('Subscription is auto-renewing');
 *   }
 * }
 * ```
 */
async function getProductStatus(productId, productType = "subs") {
    return await core.invoke("plugin:iap|get_product_status", {
        payload: {
            productId,
            productType,
        },
    });
}
/**
 * Listen for purchase updates.
 * This event is triggered when a purchase state changes.
 *
 * @param callback - Function to call when a purchase is updated
 * @returns Promise resolving to a PluginListener that can be used to stop listening
 * @example
 * ```typescript
 * const listener = await onPurchaseUpdated((purchase) => {
 *   console.log(`Purchase updated: ${purchase.productId}`);
 *   if (purchase.purchaseState === PurchaseState.PURCHASED) {
 *     // Handle successful purchase
 *   }
 * });
 *
 * // Later, stop listening
 * await listener.unregister();
 * ```
 */
async function onPurchaseUpdated(callback) {
    return await core.addPluginListener("iap", "purchaseUpdated", callback);
}
/**
 * Present the Offer Code redemption sheet (macOS 15+ only).
 *
 * The redeemed transaction arrives via the `onPurchaseUpdated` listener,
 * so this only needs to present the sheet to the user.
 *
 * @returns Promise resolving when the sheet has been presented
 * @throws Rejects on macOS < 15 or if no key window is available
 * @example
 * ```typescript
 * await presentOfferCodeRedeemSheet();
 * ```
 */
async function presentOfferCodeRedeemSheet() {
    await core.invoke("plugin:iap|present_offer_code_redeem_sheet");
}

exports.acknowledgePurchase = acknowledgePurchase;
exports.consumePurchase = consumePurchase;
exports.getProductStatus = getProductStatus;
exports.getProducts = getProducts;
exports.getPurchaseHistory = getPurchaseHistory;
exports.initialize = initialize;
exports.onPurchaseUpdated = onPurchaseUpdated;
exports.presentOfferCodeRedeemSheet = presentOfferCodeRedeemSheet;
exports.purchase = purchase;
exports.restorePurchases = restorePurchases;
