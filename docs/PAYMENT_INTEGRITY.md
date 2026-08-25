# Payment and reservation integrity

## Enabled payment paths

- Cash orders are enabled. Their inventory reservations have no automatic expiry and remain active until an authorized staff member accepts or cancels the order.
- `mock-knet` is enabled only when `ALLOW_MOCK_PAYMENTS=true`. Completion requires the order ID and tracking token and settles against server-loaded payment amount, currency, provider, and references.
- Real KNET initiation and callback routes are intentionally disabled, including outside production.

## Terminal transitions

- Online attempts may move from `PENDING` to exactly one of `PAID` or `FAILED`. Repeating the same outcome is idempotent; a different later outcome is rejected.
- Online capture and cash acceptance require a complete active reservation set matching the order items. Capture also requires every reservation deadline to still be in the future.
- Online failure, online expiry, and cash cancellation conditionally release each active reservation in the same transaction as the payment/order transition. Cash acceptance conditionally consumes each hold in that transaction.
- Cash cancellation moves `CASH_DUE` to terminal `FAILED`. Cash acceptance leaves the payment `CASH_DUE`; collection is a separate later operation.

## Real KNET blocker

Merchant credentials alone are not sufficient to enable real settlement. The external KNET onboarding material still needs to provide a trustworthy callback-verification mechanism, such as a signed callback specification or an authenticated server-to-server payment inquiry API and credentials. A browser redirect or form POST with `result=CAPTURED` is not proof of settlement.

Before real KNET can be enabled, the implementation must verify the gateway signature or inquiry response and bind it to the stored payment provider, payment ID, order, merchant track ID, provider reference, amount, currency, and terminal result. The current settlement boundary validates those stored and callback fields, but the callback routes remain `503` until the external proof can be verified.

## Reservation expiry scheduler

`GET /api/internal/reservations/expire` requires `Authorization: Bearer <CRON_SECRET>`. It processes online-payment orders in bounded batches (default 50, maximum 100), atomically fails the pending payment/order, and releases each active reservation once. `RESERVATION_EXPIRY_BATCH_SIZE` or the capped `limit` query parameter can set the batch size.

Vercel Hobby cannot run this five-minute job. Configure an external scheduler to make an HTTPS `GET` request every five minutes with `Authorization: Bearer <CRON_SECRET>`, then alert on non-2xx responses. Keep `CRON_SECRET` only in the scheduler's secret store and the Vercel environment; never place it in the request URL.

The repository includes `.github/workflows/reservation-expiry.yml` as the external scheduler. Configure repository secrets `RESERVATION_EXPIRY_URL` (the production `/api/internal/reservations/expire` URL) and `CRON_SECRET`, then verify a manual workflow run before release.
