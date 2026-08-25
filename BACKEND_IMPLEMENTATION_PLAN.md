# Pet Store Backend Implementation Plan

## 1. Current Application Audit

The application is a Next.js 15 / React 19 storefront. It has a complete customer UI but no database, authentication, admin dashboard, stored orders, or server-side checkout authority. Current business data is static JSON and browser state is stored in Zustand/localStorage.

Existing payment handlers only initiate a KNET redirect and return the browser to a success/error screen. They do not create orders, verify callbacks, reserve inventory, or persist payment attempts.

## 2. Existing Tech Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS.
- Zustand persisted state for language, cart, delivery, and wishlist.
- Static catalog, store, category, delivery, and content JSON under `src/data`.
- Leaflet/OpenStreetMap for location UI.
- Existing KNET legacy gateway integration.

## 3. Existing Frontend Features

- Arabic RTL and English LTR storefront.
- Catalog, category browsing, product options, search, favorites, filter/sort, cart, delivery/pickup selection, address collection, scheduled slots, checkout, and KNET sandbox flow.
- Profile, order history, order tracking, and wallet screens exist but are placeholders.
- Two existing branches, Kuwait governorates/areas, delivery fees, and basic branch details.

## 4. Static Data To Replace Gradually

- `src/data/products.json`: products, options, inventory flags, prices, media, bilingual content.
- `src/data/categories.json`: bilingual categories, images, order, visibility metadata.
- `src/data/delivery.json`: branches, provinces, areas, coverage, fees, locations.
- `src/data/store.json`: store configuration, contact/brand assets, slider content, payment flags.
- `src/data/static-pages.json`: future CMS pages.
- Branch contacts/hours, checkout coordinates, phone settings, filter bounds, and schedules also occur in UI source and must become controlled configuration.

## 5. Approved Architecture

- Host PostgreSQL and object storage on Supabase.
- Use Prisma for migrations, schema, relations, transactions, and generated TypeScript types.
- Keep Next.js as the application/API layer; add server-only repositories, services, validation, authorization, and route handlers.
- Keep the current storefront UI and routes. Replace JSON reads incrementally with database-backed public read APIs/server queries.
- Create a separate protected `/admin` route area.
- Use Supabase Storage for all new runtime uploads; retain current `public/assets` as a migration fallback.

## 6. Admin Dashboard Modules

1. Overview: live sales/orders, status queues, low stock, best sellers, recent operational activity.
2. Orders: search, filters, timeline, branch/driver assignment, status changes, internal notes, invoice/export, cancellations, refund requests.
3. Products and categories: bilingual CRUD, archive, duplicate, media, options, visibility, bulk edits.
4. Inventory: per-branch levels, reservations, adjustments, transfers, alerts, immutable movement history.
5. Branches and delivery: coverage, areas, fees, minimums, priority routing, hours, closures, slots.
6. Drivers: restricted accounts and assigned-delivery workflow.
7. Promotions: product/category/cart discounts, coupons, automatic rules, schedule, limits, reporting.
8. Customers: profiles, addresses, order history, value, notes, segmentation-ready data.
9. Store content/settings: contacts, logo, banners, social links, homepage assets, payment availability.
10. Users/permissions, reports, integrations, and audit history.

## 7. Database Schema

All new primary keys are UUIDs. Imported records retain a unique `legacy_id`. Monetary values use `numeric(12,3)` in KWD. Operational tables carry `created_at` and `updated_at`; archival records use `archived_at`/`deleted_at` rather than destructive deletion.

| Domain | Tables |
| --- | --- |
| Identity | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `sessions` |
| Storefront | `store_settings`, `store_translations`, `store_assets`, `storefront_banners`, `social_links` |
| Catalog | `categories`, `category_translations`, `products`, `product_translations`, `product_images`, `product_option_groups`, `product_option_values` |
| Fulfilment | `branches`, `branch_translations`, `branch_hours`, `branch_closures`, `provinces`, `areas`, `branch_delivery_coverage`, `delivery_slots` |
| Inventory | `inventory_levels`, `inventory_reservations`, `inventory_movements`, `stock_transfers` |
| Customers | `customers`, `customer_addresses`, `wishlists`, `wishlist_items` |
| Cart/quote | `carts`, `cart_items`, `checkout_quotes`, `checkout_quote_items` |
| Orders | `orders`, `order_items`, `order_item_options`, `order_status_history`, `order_assignments`, `order_notes` |
| Payments | `payments`, `payment_attempts`, `payment_events`, `refunds` |
| Promotions | `promotions`, `promotion_rules`, `promotion_targets`, `promotion_redemptions` |
| Operations | `drivers`, `notifications`, `audit_logs`, `import_runs`, `import_issues` |

Important constraints and indexes:

- Unique active category/product slugs and source legacy IDs.
- Foreign keys for all ownership and parent-child records.
- Checks for non-negative prices/stock/fees and positive quantities.
- Indexed product category/status/sort order/search text; orders by created date, status, payment status, branch, driver, customer; inventory by branch/product; coverage by area/branch/priority.
- Payment provider reference and idempotency key are unique.
- `orders` and `order_items` store immutable name, option, address, price, tax, promotion, and delivery snapshots.

## 8. Relationships

- A category has many products; a product has translations, media, option groups, and option values.
- A branch has hours, closures, coverage rules, delivery slots, inventory levels, and drivers.
- An area belongs to a province and can be covered by multiple branches with explicit priority, fees, and minimums.
- Inventory is unique per product/branch, with reservations and movements attached to orders when relevant.
- A customer has addresses, carts, wishlists, and orders; guest orders retain contact snapshots without a required account.
- An order has items, item options, status history, payment attempts/events, assignments, and audit records.
- Promotions can target products, categories, or carts and record applied redemptions.

## 9. Authentication And Permissions

- Admins and drivers use email/password authentication with secure server sessions and hashed passwords.
- Roles: owner, manager, order staff, inventory staff, and driver. Permissions are enforced in server actions and route handlers, never only in the UI.
- Drivers can access only assigned deliveries and permitted status transitions.
- Customers may check out as guests and optionally create accounts later for profile, saved addresses, order history, and wishlist.
- The design keeps 2FA/passwordless extensions possible but does not require them for V1.

## 10. API And Server Architecture

```text
src/server/
  db.ts
  repositories/
  services/{catalog,checkout,orders,inventory,fulfilment,payments,promotions}/
  validation/
  authorization/
  notifications/

src/app/api/
  storefront/ carts/ checkout/ orders/ payments/ admin/ webhooks/
```

- Route handlers adapt HTTP requests only. Zod validates requests. Services enforce rules. Prisma repositories read/write the database.
- Public reads return only storefront-safe configuration, never internal settings.
- Admin changes invalidate affected catalog/storefront cache tags.
- Public catalog search is paginated and indexed instead of transferring the complete catalog to the browser.

## 11. Order Lifecycle

Fulfilment status is separate from payment status.

```text
New -> Assigned to Branch -> Assigned to Driver -> Out for Delivery -> Delivered
```

Exception statuses: `Cancelled`, `Payment Failed`, `Refund Requested`, and `Refunded`.

Payment status: `Pending`, `Authorized`, `Paid`, `Failed`, `Refund Pending`, `Refunded`, `Cash Due`, `Cash Collected`.

Delivery routing selects the highest-priority active branch serving the area. Authorized staff can override the assignment, which is recorded in the order timeline/audit log.

## 12. Inventory Lifecycle

1. Checkout validates the selected branch, active catalog, limits, options, promotion rules, and current inventory.
2. Order creation atomically creates a temporary branch inventory reservation.
3. Verified online payment deducts reserved inventory and records a movement.
4. Cash-on-delivery inventory deducts when the assigned branch accepts the order.
5. Failed payment, rejected orders, expiry, and cancellation release undeducted reservations.
6. Cancellations after deduction create a traceable restoration movement when policy permits.
7. Manual changes and stock transfers require authorized users and immutable audit/movement records.

## 13. Payment Architecture

- Cash, KNET, card, and Apple Pay appear according to store configuration and order eligibility.
- The browser sends an order/quote reference, never an authoritative total.
- KNET is refactored to use a server-created payment attempt and merchant track ID. Callbacks verify the matching attempt, amount, result/signature where available, and idempotency before status changes.
- Card and Apple Pay use a provider-neutral payment service with payment intent, webhook, refund, and event records.
- **DECISION REQUIRED:** choose the merchant-approved Kuwait-compatible provider for card and Apple Pay before that integration phase. No provider will be assumed.

## 14. Delivery, Pickup, And Drivers

- Admin-controlled branches, contacts, location, working hours, closures, delivery/pickup availability, capacity, and slots.
- Kuwait province/area management, branch coverage, fee, minimum order, availability, and priority routing.
- V1 contains internal driver accounts and assignment. It does not implement WIYAK or Armada, but uses an adapter/event boundary ready for later dispatch integrations.
- Current client-generated schedules are replaced by branch/capacity-aware server slots.

## 15. Frontend Integration Map

| Frontend | Admin control | API/service | Entities |
| --- | --- | --- | --- |
| Category navigation | Names, images, visibility, ordering | catalog list | categories/translations/media |
| Product list/detail | Content, media, price, options, status | catalog detail/search | products/options/images/inventory |
| Special Offer | Targets, rank, schedule | promotion evaluation | promotions/targets |
| Delivery selector | Areas, coverage, fees, slots | fulfilment quote/slots | areas/coverage/branches |
| Cart | Items, quantity, notes | cart validation | carts/cart_items |
| Checkout | Price, fee, discount, eligibility | quote/order service | quotes/orders/promotions |
| Order success/profile/tracking | Real stored status/history | customer/order access | orders/history/payments |
| Header/contact/banners | Store content/assets | storefront configuration | store settings/assets/banners |

## 16. Existing Data Migration

1. Create schema migrations, staging importer, import-run records, and import-issue reporting.
2. Validate JSON shapes, identifiers, slugs, images, product options, category links, and coverage rows.
3. Import provinces, areas, branches, and coverage before catalog/inventory.
4. Upsert categories, products, options, media, and source payloads by legacy ID.
5. Report and explicitly resolve category/slug/source inconsistencies rather than silently picking a value.
6. Reconcile expected counts, sample fees, price totals, slugs, images, and storefront rendering.
7. Enable database catalog reads first; retain static JSON only as a rollback/reference fixture until acceptance.

## 17. Security Plan

- Server validation, authorization, rate limiting, secure cookies, password hashing, and protected admin routes.
- Verify payment callbacks/webhooks, use idempotency keys, and prevent client price/stock/fee manipulation.
- Validate file MIME type, size, dimensions, and access policy before Supabase Storage upload.
- Keep database/service-role/payment credentials server-only.
- Record auditable changes to inventory, prices, promotions, delivery fees, refunds, users, and statuses.
- Guest tracking uses high-entropy signed/opaque tokens, not short order numbers alone.

## 18. Performance Plan

- Paginated indexed catalog/admin queries, selective projections, and full-text search.
- Image optimization, Supabase CDN delivery, and cache tags with targeted revalidation.
- Server Components for public reads where possible; avoid full-catalog browser hydration.
- Transactional inventory/payment paths are minimal and indexed.
- Real-time updates only for operational queues where useful.

## 19. Testing Strategy

- Unit tests for pricing, promotion eligibility, inventory transitions, routing, and status policies.
- Integration tests for repositories, quote/order transactions, KNET callbacks, authorization, and imports.
- Playwright tests for storefront catalog, delivery, checkout, payment return, staff orders, and restricted driver access.
- Import reconciliation and migration rollback testing before production cutover.
- Security tests for unauthorized access, tampered prices, duplicate payment events, invalid uploads, and rate-limited endpoints.

## 20. Implementation Phases

1. Foundation: Supabase/Prisma configuration, migrations, schema, server boundaries, auth/RBAC shell.
2. Import: staging importer, reconciliation, media mapping, database catalog read path.
3. Catalog admin: categories, products, options, media, visibility, public storefront integration.
4. Branches/inventory: branch coverage, schedules, per-branch stock, reservations, routing.
5. Checkout/orders: secure quotes, guest/optional account data, orders, timelines, tracking/profile.
6. Payments: KNET hardening, cash flow, chosen card/Apple Pay provider.
7. Delivery operations: internal drivers, assignment, delivery portal/status updates, notification events.
8. Promotions/content: rules engine, content settings, banners, contact information.
9. Analytics/audit: reports, exports, dashboard, audit UI.
10. Release hardening: E2E/security/performance tests, observability, backups, runbooks, staged production migration.

## 21. Expected Files And Directories

- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- `src/server/**`
- `src/app/api/**`
- `src/app/(admin)/admin/**`
- `src/app/(store)/**` or current storefront routes adapted incrementally
- `src/components/admin/**`
- `scripts/import-json-to-db.ts`
- `tests/**`, Playwright configuration, environment documentation

## 22. Dependencies

- `prisma`, `@prisma/client`, `zod`
- Supabase server/storage clients
- Session/authentication and password hashing packages
- Email delivery client
- Rate-limit package/provider
- Test runner and Playwright

## 23. Environment Variables

```dotenv
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM_ADDRESS=
KNET_INIT_URL=
KNET_MERCHANT_ID=
KNET_MERCHANT_PASSWORD=
KNET_RESPONSE_URL=
KNET_ERROR_URL=
KNET_PAYMENT_PAGE_URL=
PAYMENT_PROVIDER_SECRET_KEY=
PAYMENT_PROVIDER_WEBHOOK_SECRET=
```

## 24. Future / Optional Modules

- WIYAK/Armada delivery adapters and provider webhooks.
- WhatsApp notification provider.
- Loyalty, wallet, customer segmentation, abandoned cart recovery, reviews, recommendations, pixels, and marketing automation.
- Customer 2FA, magic link, or phone OTP login.

## 25. Risks And Decisions Required

- Select a merchant-approved provider for card and Apple Pay.
- Confirm email provider/sender and later customer-account authentication choice.
- Confirm detailed policies for partial refunds, failed cash deliveries, and stock transfers.
- Resolve imported product-category conflicts with reviewable reports.
- Do not launch a live migration without database backups, reconciliation, and rollback verification.

## 26. Definition Of Done

- Staff can control all current business-managed storefront content without code changes.
- Storefront remains visually/functionally equivalent while consuming database-backed data.
- Orders, payments, inventory, delivery, drivers, customers, and promotions are persistently and securely managed.
- Prices, discounts, fees, stock, and payment results are authoritative on the server.
- Every sensitive staff action is authorized and auditable.
- Data import reconciles catalog/branch/delivery records before cutover.
- Automated tests cover critical checkout, inventory, payment, permissions, and delivery workflows.
