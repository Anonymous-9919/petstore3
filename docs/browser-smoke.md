# Browser Tests

`npm run test:smoke` starts the Next.js app on `127.0.0.1:3101`, runs a headless Playwright Core browser smoke test, then stops the server.

`npm run test:e2e` builds the production application, starts it with `next start`, and runs the Playwright suite on `127.0.0.1:3102`. This is the CI command. `npm run test:e2e:local` runs against an already-built app (or `E2E_BASE_URL`) and is useful while iterating.

Install the matching Chromium binary once on a development machine or CI image:

```bash
npx playwright install --with-deps chromium
```

Run the smoke test:

```bash
npm run test:smoke
```

Run the production-mode browser suite:

```bash
npm run test:e2e
```

The public suite is self-contained: it blocks neither production data nor external services, uses no credentials, and fulfills storefront and sign-in API requests with local fixture responses. It covers the anonymous admin guard, sign-in failure UX, catalog/product navigation, browser back/forward, accessible controls, and uncaught browser console errors.

Authenticated admin catalog tests are intentionally opt-in because admin pages perform server-side session validation. Create a storage state from a disposable QA account outside this repository and supply its file path; never store the file or credentials in source control:

```bash
E2E_ADMIN_STORAGE_STATE=playwright/.auth/qa-admin.json npm run test:e2e
```

Those tests mock every product/catalog API request in the browser, covering navigation, create/edit route flow, and readable API error behavior without writing to a database. They are skipped when `E2E_ADMIN_STORAGE_STATE` is absent, including CI. The admin route's server loading fallback cannot be deterministically exercised without a deliberately slow disposable server response, so it remains a manual QA check.

The test fulfills catalog and fulfillment API calls with local fixture data and aborts every browser request outside the local app. It verifies catalog, product, branch selection, cart, and checkout-details navigation. It does not visit or invoke a payment route.

For a server already running locally, avoid starting a second server:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run test:smoke
```
