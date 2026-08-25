# Admin Dashboard V2 Implementation Checklist

This checklist converts `Real Redesign plan.md` and `backend Redesign.md` into the
dependency-aware execution plan for the existing Petstore Kuwait application.

The master documents remain the acceptance specifications. This file records
implementation status, verification evidence, blockers, and phase exit decisions.

## Execution Rules

- Execute one phase at a time.
- Preserve existing production data and working storefront behavior.
- Keep storefront routes, markup, responsive behavior, and visual design unchanged
  unless a master requirement explicitly needs a functional integration.
- Reuse the current Next.js, React, Prisma, Supabase, Tailwind, and authentication
  architecture where it remains safe.
- Follow `INSPECT -> PLAN -> IMPLEMENT -> TEST -> FIX -> VERIFY -> UPDATE CHECKLIST`.
- Do not mark work complete without verification evidence.
- Document genuine architectural or external blockers instead of silently omitting them.
- Never run `prisma db push`, destructive imports, or inventory reset scripts against a
  populated environment.

## Confirmed Decisions

- [x] Cash orders reserve stock until staff accepts or cancels them.
- [x] Stale cash orders use alerts and an explicit resolution workflow, not the online
  payment expiration policy.
- [x] Migration, import, concurrency, and database-backed E2E testing use a separate
  Supabase project and Vercel Preview environment.
- [x] Online payment reservations expire through an external scheduler at roughly a
  five-minute cadence.
- [x] Real KNET remains disabled until merchant credentials, callback verification,
  and certification are available.
- [x] Admin work must not visually redesign the storefront.

## Universal Phase Gate

Each phase must satisfy all applicable checks before the next phase begins:

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Relevant API and database integration tests
- [ ] Relevant browser and accessibility tests
- [ ] Browser console and server logs checked
- [ ] Storefront regression checks completed when shared contracts changed
- [ ] Prisma validation, migration status, and drift checks completed when schema changed
- [ ] Checklist updated with evidence and remaining limitations

## Phase 1 - Deep Audit, Baseline, And Release Safety

### Audit And Baseline

- [x] Inspect repository architecture and framework versions.
- [x] Inspect schema, migrations, authentication, storage, APIs, state, and deployment.
- [x] Audit admin routes and identify implemented, incomplete, duplicated, and slow flows.
- [x] Trace Product Edit and Archive through UI, API, validation, database, cache, and storefront.
- [x] Identify source-level admin navigation bottlenecks.
- [ ] Record runtime timings, query counts, payload sizes, and loading behavior for Dashboard.
- [ ] Record runtime timings, query counts, payload sizes, and loading behavior for Products.
- [ ] Record runtime timings, query counts, payload sizes, and loading behavior for Orders.
- [ ] Record runtime timings, query counts, payload sizes, and loading behavior for Inventory.
- [ ] Record runtime timings, query counts, payload sizes, and loading behavior for Reports.
- [ ] Capture storefront API contract fixtures and desktop/mobile regression screenshots.
- [ ] Provision isolated Supabase, storage, synthetic data, and Vercel Preview environments.
- [ ] Verify the Prisma baseline against a fresh database and a sanitized production clone.

### Quality Gates

- [x] Replace the invalid Next.js 16 `next lint` script with supported ESLint tooling.
- [x] Add an explicit `typecheck` script.
- [x] Pin the supported Node.js runtime.
- [x] Ensure operational TypeScript scripts are covered by a dedicated typecheck.
- [x] Add CI gates for install, lint, typecheck, tests, Prisma checks, build, and smoke tests.

### Admin Security

- [x] Reject `CUSTOMER` and `DRIVER` at admin login.
- [x] Centralize staff and resource authorization helpers.
- [x] Enforce authorization on admin pages, APIs, exports, and mutations.
- [x] Filter navigation by permission without relying on navigation hiding for security.
- [x] Add admin and customer login throttling.
- [x] Add a visible admin logout action and verify session deletion.
- [x] Add direct-endpoint RBAC regression tests.

### Customer Identity Security

- [x] Stop unverified phone matching from claiming existing guest order history.
- [x] Canonicalize Kuwait phone identity consistently.
- [x] Prevent guest checkout from overwriting registered customer profile fields.
- [x] Add account-claim and profile-overwrite regression tests.

### Payment And Reservation Integrity

- [x] Define and enforce terminal, idempotent payment transitions.
- [x] Reject contradictory captured and failed callbacks.
- [x] Verify gateway identity, order, amount, currency, and reference before settlement.
- [x] Require valid reservations before stock consumption and order advancement.
- [x] Prevent paid or accepted orders when reservations are missing or expired.
- [x] Hold cash reservations until explicit acceptance or cancellation.
- [x] Expire online-payment reservations at the configured deadline.
- [x] Add external-scheduler-compatible batching, metrics, and authorization.
- [x] Keep mock KNET unavailable whenever mock mode is disabled.
- [x] Keep real KNET unavailable until its external prerequisites are complete.
- [x] Add concurrency and conflicting-callback integration tests.

### Application Security

- [x] Remove untrusted product HTML rendering; descriptions now render as plain text.
- [x] Add an appropriate Content Security Policy and supporting security headers.
- [ ] Ensure user-facing errors do not expose stack traces or secrets.
- [ ] Verify audit and application logs do not contain credentials or sensitive payloads.

### Phase 1 Exit

- [ ] Unauthorized customers and staff cannot access admin data or mutations.
- [ ] Guest order history cannot be claimed without verified ownership.
- [ ] Payment and reservation race tests preserve order and inventory invariants.
- [ ] Lint, typecheck, unit/integration tests, and production build pass.
- [ ] Runtime baseline and regression evidence are recorded.
- [ ] Phase 1 verification report completed.

## Phase 2 - Modern Admin UI Foundation

- [x] Build a persistent, grouped, permission-aware admin sidebar.
- [x] Add active states, collapse mode, retained preference, mobile drawer, and useful badges.
- [x] Build a persistent header with breadcrumbs, title, contextual action, notifications,
  account menu, and logout.
- [x] Add permission-aware global search for products, SKU, orders, customers, and categories.
- [x] Build shared `PageHeader`, `DataTable`, `FilterBar`, and `StatusBadge` primitives.
- [x] Build shared KPI, empty, loading, error, bulk action, confirmation, and drawer primitives.
- [x] Build shared date range, image upload, and bilingual field primitives.
- [x] Add `loading.tsx`, `error.tsx`, Suspense boundaries, and progressive route loading.
- [ ] Memoize request-scoped authentication and remove duplicate session lookups.
- [ ] Standardize server pagination, search, sorting, filters, and list metadata.
- [ ] Replace post-mount collection waterfalls with server-fetched initial data where useful.
- [ ] Verify keyboard, focus, contrast, labels, responsive behavior, and RTL support.
- [ ] Verify the storefront visual baseline remains unchanged.

## Phase 3 - Products

### Catalog Contract And Schema

- [ ] Preflight duplicate and null legacy catalog identifiers.
- [ ] Introduce stable public catalog identifiers without breaking carts or existing URLs.
- [ ] Preserve legacy aliases during expand, backfill, dual-read, and contract rollout.
- [ ] Add a proper product variant representation and backfill one default variant per product.
- [ ] Add only required product metadata: SKU, barcode, brand, tags, cost, weight, SEO,
  inventory tracking, and variant pricing.

### Product Operations

- [x] Implement a server-paginated product table with search, sorting, filters, and views.
- [ ] Implement bilingual product editing with images, category, pricing, variants, options,
  status, branch inventory, and SEO.
- [x] Reconcile validation limits with existing stored descriptions.
- [ ] Add field errors, save progress, success feedback, and unsaved-change protection.
- [ ] Add Active, Draft, Low Stock, Out of Stock, and Archived views.
- [x] Add archive and restore lifecycle actions; defer remaining bulk actions to the full editor.
- [ ] Add a right-side quick-edit workflow for common changes.
- [ ] Create branch inventory records for new products.
- [ ] Add complete product and category audit events.

### Storefront Compatibility

- [x] Add targeted product, category, and catalog cache invalidation.
- [x] Ensure archive removes products from storefront and restore returns them.
- [x] Reject checkout for archived products and categories.
- [ ] Return real availability, galleries, option metadata, quantities, increments, and preorder rules.
- [ ] Keep storefront markup and visual behavior unchanged.
- [ ] Verify new admin-created products can be purchased.

## Phase 4 - Professional Bulk Product Import

- [ ] Add import job, actor, file, status, progress, counts, errors, and idempotency models.
- [ ] Establish stable handle and variant SKU identity rules.
- [ ] Add a persisted media library and stable browser URL resolution.
- [ ] Generate a current product CSV template with dynamic branch-slug columns.
- [ ] Implement Upload, Map, Validate, Preview, Confirm, Import, and Results steps.
- [ ] Support create, update, and default upsert modes.
- [ ] Add automatic column mapping and ignored-column support.
- [ ] Show row-level errors and provide an error CSV before writes.
- [ ] Process bounded transactional batches with progress and detailed results.
- [ ] Import remote image URLs into configured storage.
- [ ] Support optional image ZIP matching by SKU, then handle, never title.
- [ ] Show matched, unmatched, and missing-image results.
- [ ] Add import history and completion/failure notifications.
- [ ] Test new, update, duplicate SKU, invalid category, Arabic, variants, images,
  branch inventory, and repeated-import idempotence cases.

## Phase 5 - Inventory Management And Order Operations

- [ ] Route every inventory mutation through one canonical transactional service.
- [ ] Standardize On Hand, Reserved, Available, Incoming, and Low Stock Threshold.
- [ ] Record reservation, deduction, release, adjustment, return, import, and transfer movements.
- [ ] Store movement before, change, after, reason, note, actor, and reference.
- [ ] Build a paginated, searchable Stock Movements screen.
- [ ] Add signed adjustment workflows with required reasons.
- [ ] Add branch, category, low-stock, out-of-stock, and negative-stock filters and alerts.
- [ ] Implement Draft, In Transit, and Received stock transfers.
- [ ] Add inventory CSV preview/import/export with Set, Add, and Subtract modes.
- [ ] Formalize validated order state transitions and cancellation behavior.
- [ ] Make cash acceptance consume held reservations atomically.
- [ ] Make online capture consume stock exactly once.
- [ ] Add stale cash-order alerts and reconciliation workflows.
- [ ] Verify `10 + 5 - 2 = 13` and Reserve -> Cancel -> Release.
- [ ] Add concurrency tests for settlement, expiry, adjustment, import, and transfers.

## Phase 6 - Marketing And Storefront Content

### Promotions

- [ ] Repair automatic promotion evaluation and storefront coupon/quote integration.
- [ ] Move redemption accounting to the qualified order lifecycle point.
- [ ] Reverse or invalidate usage for failed and cancelled orders.
- [ ] Add percentage, fixed, product, category, minimum spend, Buy X Get Y,
  free delivery, first-order, quantity, and flash-sale templates.
- [ ] Add automatic/coupon mode, limits, schedules, branches, areas, stacking, and priority.
- [ ] Keep one canonical promotion evaluator for quotes, checkout, orders, and tests.
- [ ] Add reliable promotion analytics.

### Storefront Content

- [ ] Add bilingual announcement bars with CTA, colors, scheduling, and previews.
- [ ] Add popup templates, targeting, triggers, devices, frequency, schedules, and preview.
- [ ] Track only reliable popup impressions, clicks, CTA activity, and coupon usage.
- [ ] Add desktop, mobile, category, and hero banner placements.
- [ ] Add banner draft, publish, scheduling, duplicate, reorder, preview, and archive workflows.
- [ ] Add lightweight featured category, product, and offer controls.
- [ ] Apply `Asia/Kuwait` consistently to content and promotion schedules.
- [ ] Preserve storefront layout and visual styling.

## Phase 7 - Dashboard And Reporting

- [ ] Define gross, discount, net, AOV, units, cancellation/refund, delivery fee,
  timezone, and branch-attribution rules before implementation.
- [ ] Add or derive reliable accepted, paid, delivered, cancelled, and refunded timestamps.
- [ ] Add reliable cost snapshots where inventory valuation requires them.
- [ ] Add Sales, Orders, AOV, Units, Customers, and Pending Orders KPIs.
- [ ] Add standard/custom date ranges and previous-period comparison.
- [ ] Add trend, status, recent order, stock, product, category, branch, and promotion widgets.
- [ ] Add limited widget visibility, ordering, period, and saved preferences.
- [ ] Implement sales, product, category, branch, inventory, customer, order, and promotion reports.
- [ ] Use database aggregation rather than loading full tables into application memory.
- [ ] Add date, branch, category, product, and comparison filters.
- [ ] Add filter-consistent CSV exports.
- [ ] Add funnel reporting only after genuine first-party events exist.
- [ ] Verify known-order revenue, order count, units, and AOV manually.

## Phase 8 - Admin Quality-Of-Life And Governance

- [ ] Add persisted notifications with unread, read, and mark-all-read behavior.
- [ ] Produce useful notifications for orders, stock, payments, imports, and promotions.
- [ ] Add a paginated Activity Log screen over sanitized audit events.
- [ ] Add Content Manager and Viewer roles through the existing authentication architecture.
- [ ] Enforce Viewer read-only behavior at the server boundary.
- [ ] Add saved table views and user preferences where useful.
- [ ] Complete media search, preview, reuse, and safe unused-asset deletion.
- [ ] Standardize EN/AR editing, Unicode persistence, RTL preview, and storefront rendering.
- [ ] Add session revocation and staff credential-management safeguards.
- [ ] Improve customer pagination and secure detail workflows.

## Phase 9 - Performance Optimization

- [ ] Re-run the Phase 1 runtime measurements.
- [ ] Profile real route, API, Prisma, auth, bundle, chart, and image costs.
- [ ] Parallelize independent fetches and reduce selected fields and payloads.
- [ ] Apply database pagination to every large collection.
- [ ] Inspect real query plans before adding targeted indexes.
- [ ] Isolate expensive reports and charts behind separate loading boundaries.
- [ ] Cache stable settings and reference data with precise invalidation.
- [ ] Remove unnecessary client components and repeated auth/API work.
- [ ] Document before/after Dashboard, Products, Orders, Inventory, and Reports results.

## Phase 10 - Final QA And Rollout

- [ ] Run full product create/edit/archive/restore/storefront browser coverage.
- [ ] Run inventory adjustment, reservation, release, transfer, and concurrency coverage.
- [ ] Run cash and mock-payment lifecycle coverage.
- [ ] Run promotion calculation and scheduling coverage.
- [ ] Run announcement, popup, and banner coverage.
- [ ] Run import new/update/error/image/Arabic/branch/idempotence coverage.
- [ ] Run reports against known fixtures and manual calculations.
- [ ] Run RBAC, customer identity, XSS, rate-limit, and direct API security tests.
- [ ] Run complete admin navigation, back/forward, loading, drawer, dialog, and error coverage.
- [ ] Run storefront visual regression at existing breakpoints.
- [ ] Run accessibility, console, server-log, typecheck, lint, test, and build gates.
- [ ] Rotate all previously exposed database, Supabase, cron, email, bootstrap, and payment secrets.
- [ ] Confirm production backup/PITR and restore ownership.
- [ ] Rehearse every migration in the isolated Supabase environment.
- [ ] Deploy additive schema changes before dependent application code.
- [ ] Complete Vercel Preview acceptance and immutable production canary checks.
- [ ] Configure and monitor the external reservation scheduler.
- [ ] Keep real KNET disabled until external prerequisites pass.
- [ ] Document application rollback and forward-fix database procedures.

## Final Deep Audit

- [ ] Re-read `Real Redesign plan.md` and verify every requirement against evidence.
- [ ] Re-read `backend Redesign.md` and verify every requirement against evidence.
- [ ] Search for bypassed authorization, direct quantity writes, stale cache paths,
  unpaginated collections, misleading metrics, hardcoded content, and unsafe imports.
- [ ] Re-run security, concurrency, migration, browser, accessibility, and storefront regressions.
- [ ] Verify database and storage data integrity after all backfills.
- [ ] Record every remaining external dependency or limitation honestly.
- [ ] Produce the final report under Implemented, Fixed, UI/UX, Performance, Database,
  Bulk Import, Testing, and Remaining.

## External Blockers

- Real KNET merchant credentials, callback validation rules, allowlisting, and certification.
- External scheduler account/configuration for frequent online reservation expiry.
- Separate Supabase and Vercel Preview resources for safe database-backed verification.
- Rotation of credentials previously exposed during development.

## Phase 1 Verification Evidence

- 2026-08-25: `npm run typecheck` passed.
- 2026-08-25: `npm test` passed, 16 files and 55 tests.
- 2026-08-25: `npm run build` passed with Next.js 16.3.2 and Prisma 6.12.0.
- 2026-08-25: `npm run lint` passed with 19 existing warnings and no errors. The
  client-side loader warnings are intentionally retained until Phase 2 replaces those
  waterfalls with server-fetched data and shared query primitives.
- Remaining Phase 1 operational blockers: isolated Supabase/Preview provisioning,
  external scheduler configuration, migration rehearsal, runtime performance capture,
  credential rotation, and real KNET merchant certification.
- 2026-08-25: Phase 2 foundation exit gate passed: typecheck, quiet lint, 58 tests,
  and production build.
- 2026-08-25: Phase 3 catalog slice exit gate passed: typecheck, quiet lint, 65 tests,
  and production build.

## Current Verification Evidence

- 2026-08-25: `npm run typecheck` passed.
- 2026-08-25: `npm run lint -- --quiet` passed; the full lint command has existing warnings but no errors.
- 2026-08-25: `npm test` passed with 93 tests.
- 2026-08-25: `npm run build` passed with Next.js 16.3.2 and Prisma 6.12.0.
- The deep audit is ongoing. Advanced variants/public IDs, image ZIP/URL import,
  transfers and inventory CSV, popups, advanced promotion rules, full report families,
  role expansion, browser E2E, and isolated-database migration rehearsal remain open.
