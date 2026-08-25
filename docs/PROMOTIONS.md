# Promotions

Supported promotions use typed percentage or fixed discount benefits and free-delivery benefits. They apply to a cart, selected products, or selected categories. A promotion with a code is applied only when that code is supplied at checkout. A code-less promotion is automatic; checkout selects the eligible highest-priority automatic promotion, using savings and creation order as tie-breakers.

Usage and per-customer limits count redemptions only while their order has a consuming status. `PAYMENT_FAILED` and `CANCELLED` orders no longer consume a promotion limit. Promotion schedules are evaluated in UTC by the server; the admin screen presents the browser-local representation of those times and derives Active, Scheduled, Ended, or Inactive status from the current time.

Phase 6 conditions include a minimum cart value, qualifying line quantity, first-order-only, total/per-customer limits, schedules, discount caps, and branch/area restrictions. Status is explicit (`DRAFT`, `SCHEDULED`, `ACTIVE`, `EXPIRED`, `DISABLED`); only active or due scheduled promotions can redeem. `isStackable` is persisted for future multi-promotion settlement, while checkout continues to apply one promotion to preserve established checkout totals.

`GET /api/admin/promotions/analytics` reports redemption counts and discount totals from real, consuming-order `PromotionRedemption` rows only.
