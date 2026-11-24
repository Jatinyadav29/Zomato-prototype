# FoodHub — Security & Code-Quality Review

Reviewed: 2026-11-23, branch `frontend` @ `53abbf3`.
Scope: all of `server/src` (except the seed script, which was only skimmed), the client's auth/API layer (`client/src/api`, `client/src/auth`, `client/src/cart`, `vite.config.js`), and `npm audit` for both packages.
Context: this is a teaching codebase (no indexes on purpose, analytics stubs return 501). Findings that are deliberate course gaps are marked **(by design)** and kept for reference.

Status legend: `OPEN` · `FIXED` · `WONTFIX` — update this column as items are resolved. Fix details: see **§5 Fix log** at the bottom.

---

## 1. Summary

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| V1 | **Critical** | IDOR: any owner can read **any** restaurant's revenue | `server/src/controllers/restaurant.controller.js:141` | FIXED |
| V2 | **Critical** | IDOR + PII leak: any owner can read **any** restaurant's top customers (names + emails) | `server/src/controllers/restaurant.controller.js:212` | FIXED |
| V3 | High | No rate limiting on `/api/auth/login`, `/register`, `/refresh` (brute force + bcrypt CPU DoS) | `server/src/app.js` | FIXED |
| V4 | High | Public, unauthenticated, unbounded aggregation over every order (`/restaurants/top-performers`) | `restaurant.controller.js:279` | FIXED |
| V5 | High | Vulnerable dependencies: `mongoose` 9.0–9.11.3, `body-parser` 2.0–2.3.0, `react-router` ≤7.17 | `package-lock.json` (both) | FIXED |
| V6 | Medium | Race: duplicate accounts with the same email (check-then-insert, no unique index) | `auth.controller.js:71-85` | OPEN (by design until indexes) |
| V7 | Medium | Race: several reviews for one order (rating stuffing) | `review.controller.js:30-41` | OPEN (by design until indexes) |
| V8 | Medium | Race: order status can go `delivered` → `cancelled` (or both) under concurrent PATCHes | `order.controller.js:128-147` | FIXED |
| V9 | Medium | No refresh-token reuse detection; stolen-then-rotated token is silently ignored instead of revoking the session | `auth.controller.js:115-141` | FIXED |
| V10 | Medium | Weak / default JWT secrets accepted at startup; access and refresh secrets may be equal | `server/src/server.js:8` | FIXED |
| V11 | Medium | Internal error messages returned to clients on 500s; `CastError` echoes raw input | `error.middleware.js:11,26` | FIXED |
| V12 | Medium | Platform analytics open to every logged-in user (incl. customers) | `analytics.routes.js:30-31` | OPEN (by design: no admin role yet) |
| V13 | Low | User enumeration: register says "Email is already registered"; login is faster for unknown emails (no bcrypt) | `auth.controller.js:74-76, 100-102` | FIXED (login) / WONTFIX (register) |
| V14 | Low | JWT `algorithms` not pinned in `jwt.verify` | `auth.middleware.js:16`, `auth.controller.js:123,149` | FIXED |
| V15 | Low | No security headers (`helmet`), no explicit CORS policy, `x-powered-by` on | `server/src/app.js` | FIXED |
| V16 | Low | Unbounded input sizes: string lengths (names, comments), `items[]` length, `cuisines[]` length, revenue date range | various | FIXED |
| V17 | Low | Invalid `:id` / dates crash into 500s instead of 400s (`new ObjectId(id)`, `new Date("x").toISOString()`) | `restaurant.controller.js:143-152, 220` | FIXED |
| V18 | Low | Access tokens stay valid for up to 15 min after logout / user deletion (stateless JWT, no user lookup) | `auth.middleware.js` | WONTFIX (accepted trade-off) |
| V19 | Info | Seed creates demo accounts with password `password123` — must never be run against a public DB | `server/src/seed/seed.js:44` | OPEN |

Things that are **done well** and should be kept: access token held in memory only (`client/src/api/client.js:6`); refresh cookie is `httpOnly`, `sameSite=strict`, `secure` in prod, path-scoped to `/api/auth`; refresh token is SHA-256'd before bcrypt (avoids bcrypt's 72-byte truncation); single-flight refresh on the client; server never trusts client prices (`order.controller.js:50`); `typeof` checks / `String()` casts on inputs that reach Mongo filters (blocks `{"$ne": …}` NoSQL injection); `password`/`refreshToken` have `select: false`; `toPublicUser` whitelists response fields; update endpoints use field allow-lists (no mass assignment of `owner`).

---

## 2. Details

### V1 / V2 — Missing ownership check on owner dashboard endpoints (Critical)

```
GET /api/restaurants/:id/revenue        -> getResturantRevenue
GET /api/restaurants/:id/top-customers  -> getTopCustomers
```
Both routes are guarded by `authUser, authorize("owner")`, which only proves the caller **is an owner** — not that they own `:id`. Neither controller calls `findOwnedRestaurant`. Every other owner route does.

**Exploit:** register with `role: "owner"` (self-service, `auth.controller.js:67`), then iterate restaurant ids from the public `GET /api/restaurants` list → read every competitor's daily revenue, and harvest the name **and email** of each restaurant's top customers (`$lookup` projects `email`, line 255).

**Fix (immediate):** add the same guard used everywhere else at the top of both controllers:
```js
const { restaurant, error } = await findOwnedRestaurant(req.params.id, req.user.id);
if (error) return res.status(error.status).json({ message: error.message });
// then $match on restaurant._id instead of new ObjectId(id)
```
**Fix (structural, preferred — see Q1):** make ownership a router-level middleware so this class of bug can't recur.

Also drop `email` from the top-customers projection unless the owner genuinely needs it.

### V3 — No rate limiting
Login/register/refresh are unthrottled. Login allows online password guessing (min password length is 6). Each attempt costs a bcrypt-10 hash, so a modest flood pins the CPU. Add `express-rate-limit` (e.g. 10/min per IP+email on login, stricter on register) and consider raising min password length to 8.

### V4 — `/api/restaurants/top-performers`
Public, no auth, no cache, aggregates over all delivered orders since a **hard-coded** date (`"Sun, 06 Sep 2026"`) with no index (`autoIndex: false`). On the 10M-order seed this is a cheap request that's expensive to serve → trivial DoS. It also `$lookup`s and returns entire restaurant documents (incl. `owner` id). Fix: compute a rolling window (`now - 30d`), project only public fields, cache the result (it's global data — a 5-minute in-memory cache is enough), and add an index on `{status, createdAt}`.

### V5 — Dependencies (`npm audit --omit=dev`)
- **server:** `mongoose` 9.0.0–9.11.3 (high: prototype pollution, `sanitizeFilter` not applied, discriminator-key poisoning); `body-parser` 2.0.0–2.3.0 (high: DoS via trailing bytes in compressed body); `qs` ≤6.16.0 (moderate DoS).
- **client:** `react-router` / `react-router-dom` ≤7.17 (high). Most advisories target SSR/framework mode, which this SPA doesn't use, but the open-redirect ones (`//` and `\` paths in `navigate`) are relevant in principle. Currently safe because `loc.state.from` (`Auth.jsx:48`) is only ever set by the app itself — keep it that way and never redirect to a value from the query string.
- **Fix:** `npm audit fix` in both `server/` and `client/`, then re-run the e2e scripts in `cook/tools`.

### V6 / V7 — Check-then-insert races
`register` does `findOne({email})` then `create`; `createReview` does `findOne({order})` then `create`. Two concurrent requests both pass the check. Real fix is a unique index (`users.email`, `reviews.order`) and mapping Mongo error `11000` → 409 in `errorHandler`. This is the intended lesson of the indexing module — fix it there.

### V8 — Order-status transition is read-modify-write
Two concurrent PATCHes (`delivered` and `cancelled`) both read `status: "preparing"`, both pass `NEXT_STATUSES`, last write wins — a delivered (revenue-counted) order can end up cancelled or vice versa. Make it atomic:
```js
const order = await Order.findOneAndUpdate(
  { _id: req.params.id, restaurant: { $in: ownedIds }, status: { $in: prevStatusesFor(status) } },
  { $set: { status } }, { new: true });
```
or at minimum add `status: order.status` to the update filter (optimistic concurrency).

### V9 — Refresh rotation without reuse detection
If an attacker steals a refresh cookie and uses it first, the victim's next refresh fails and the victim is logged out — but the attacker keeps a valid session. Standard mitigation: when a validly-signed token fails `compareRefreshToken`, treat it as reuse and revoke (`refreshToken: null`), forcing both parties to log in again.

### V10 — Secret validation
`server.js:8` only checks the secrets are non-empty. `change-me-access-token-secret` from `.env.example` passes. In production, refuse to start if a secret is < 32 chars, equals the example value, or `ACCESS_TOKEN_SECRET === REFRESH_TOKEN_SECRET`. Do this in `config/env.js` (it's the one place that reads `process.env`).

### V11 — Error handler leaks
`res.status(err.status || 500).json({ message: err.message })` sends Mongo/BSON/driver internals to the client. In production send a generic message for 5xx and log the detail. `Invalid ${err.path}: ${err.value}` reflects attacker input — harmless in JSON today, but don't echo raw values.

### V13 — Enumeration
Acceptable for a teaching app, but if fixing: on login, run `bcrypt.compare` against a dummy hash when the user doesn't exist so timing is uniform.

### V14 / V15
`jwt.verify(token, secret, { algorithms: ["HS256"] })`. Add `helmet()` and `app.disable("x-powered-by")`. There's no CORS middleware, which is actually the safe default because the client is served same-origin via the Vite proxy (`client/vite.config.js`) — if the API is ever deployed on a different origin, add an explicit `cors({ origin: [...], credentials: true })` allow-list rather than `origin: "*"`.

### V16 / V17 — Input bounds
- Add `maxlength` to schema strings (`name` 100, `comment` 1000, `area`/`city` 100) and cap `cuisines` (e.g. ≤10) and `items` (e.g. ≤50) in `createOrder`.
- Revenue: validate `from`/`to` with `isNaN(date.getTime())`, cap the range (e.g. ≤ 366 days), and validate `:id` with `mongoose.isValidObjectId` (or let `findOwnedRestaurant` do it — it already goes through `findById`, which produces a 400 `CastError`).

---

## 3. Code-quality findings (structural)

### Q1 — The code-judo move: ownership as middleware, not copy-paste (fixes V1/V2 by construction)
The `findOwnedRestaurant → if (error) return res.status(...)` block is pasted into **6** controllers, and the two that forgot it are exactly the two critical vulnerabilities. Replace it with one middleware:
```js
// middlewares/ownership.middleware.js
async function loadOwnedRestaurant(req, res, next) {
  const { restaurant, error } = await findOwnedRestaurant(req.params.id, req.user.id);
  if (error) return res.status(error.status).json({ message: error.message });
  req.restaurant = restaurant;
  next();
}
const ownerOf = [authUser, authorize("owner"), loadOwnedRestaurant];
```
Then every owner `/:id/...` route in `restaurant.routes.js` and `analytics.routes.js` uses `ownerOf`, and controllers just read `req.restaurant`. Six boilerplate blocks disappear, and a new owner route is secure by default instead of secure-if-remembered.

### Q2 — Analytics live in the wrong controller, duplicated
`restaurant.controller.js` now contains `getResturantRevenue` and `getTopCustomers`, which are TASK 1 and TASK 5 of `analytics.controller.js` (whose stubs at `/api/analytics/restaurants/:id/revenue` and `/top-customers` still return 501). Two routes, two response shapes, one concept. Move the implementations into `analytics.controller.js` behind the analytics routes, delete the `/restaurants/:id/revenue` and `/top-customers` routes, and point `client/src/api/endpoints.js` at them. `restaurant.controller.js` goes back to being CRUD.

### Q3 — Small correctness/legibility issues in `restaurant.controller.js`
- Line 6: `const { response } = require("express")` is unused and shadowed by local `response` variables. Delete.
- Line 216: `aggregate([[ ...stages ]])` — a pipeline wrapped in an extra array. Works only because Mongoose flattens one level; remove the outer brackets.
- Line 284: hard-coded `new Date("Sun, 06 Sep 2026 …")` — will silently return stale data forever. Make it a rolling window.
- Revenue pipeline: `$project` → `$sort` → `$group` with `$push: "$$ROOT"` relies on `$group` preserving sort order to keep `days` ordered — that holds in practice but is not guaranteed. Sort after, or use `$sortArray`. Also `totalOrders` from the TASK 1 spec isn't returned.
- Typos in exported names (`getResturantRevenue`, `getTopPerformerReasturants`) leak into routes; fix while moving them (Q2).

### Q4 — Ad-hoc validation scattered through controllers
Each controller hand-rolls `typeof` checks, and `createRestaurant` / `createMenuItem` don't validate at all (they rely on Mongoose casting). A single schema-validation layer (zod/joi + a `validate(schema)` middleware) would make the request contracts explicit, give V16 bounds a home, and delete the inline `if (typeof …)` ladders.

### Q5 — Non-atomic delete
`deleteRestaurant` deletes the menu and then the restaurant in two awaits; a failure in between leaves a restaurant with no menu. Delete the restaurant first (the important invariant) or use a transaction.

### Q6 — Debug leftovers
`console.time("getMenu:menuItems")` in `menu.controller.js:20-24` runs on every request (and warns on concurrent calls with the same label). `morgan("dev")` is on in production. Gate both on `!env.isProduction`.

### Q7 — File size
`client/src/styles/pages.css` is **3,435 lines** — well past the 1k threshold. Split per page (`home.css`, `restaurant.css`, `owner.css`, …) and import from each page component. No other source file exceeds 450 lines.

---

## 4. Suggested fix order
1. **V1/V2 via Q1** (ownership middleware) — one small PR, closes both criticals.
2. **V5** `npm audit fix` in both packages.
3. **V3** rate limiting on auth routes; **V4** cache + window + projection on top-performers.
4. **V8** atomic status update; **V9** refresh reuse detection; **V10/V11** env + error handler hardening.
5. **Q2** move analytics into the analytics controller.
6. **V6/V7** come for free with the unique indexes in the indexing module.

---

## 5. Fix log — 2026-11-24 (uncommitted, on `frontend`)

Every fix was checked with an exploit/regression script against a test server on :3100, and the same script was run against the **original** commit (temporary worktree on :3200) to confirm the bug was real. Test users/orders were deleted afterwards.

| ID | What changed | Verified |
|----|--------------|----------|
| V1/V2 + Q1 | New `middlewares/ownership.middleware.js` → `ownerOfRestaurant = [authUser, authorize("owner"), loadOwnedRestaurant]`, sets `req.restaurant`. Used on **every** owner `/restaurants/:id/...` route and all `/analytics/restaurants/:id/*` routes. Six copy-pasted `findOwnedRestaurant` blocks deleted from controllers. `email` dropped from top-customers `$lookup` (UI never used it). `updateOrderStatus` still calls `findOwnedRestaurant` directly (it's keyed by order id, not restaurant id). | Original: other owner gets **200** on revenue/top-customers. Fixed: **403**. Real owner still 200. |
| V5 | `npm audit fix` in both packages → mongoose 9.13.0, body-parser 2.4.0, qs 6.17.1, react-router 7.18.6. `--omit=dev` audit is clean in both. Remaining: moderate `minimatch` via `nodemon` (dev-only; fix needs breaking `--force`) — left as is. | Client `vite build` passes; server suites pass on new mongoose. |
| V3 | New `middlewares/rateLimit.middleware.js` (`express-rate-limit@8.7.3`, pinned exact). Login: 10 **failed** attempts / 15 min keyed by IP+email (successes don't count; other users can't be locked out). Register: 10 / hour / IP. Refresh: 60 / 15 min / IP. In-memory store — needs Redis if running >1 process; set `trust proxy` behind a reverse proxy. | 11th failed login → 429; other email unaffected; 12 successful logins never limited. |
| V4 | `top-performers`: 5-min in-memory cache with single-flight (concurrent requests share one aggregation); `$lookup` projects only card fields; `revenue` no longer sent publicly. Window kept at 2026-09-06 (now a named constant) because seed data ends 2026-10-07 and the home page copy says "since September". | Cold 1.35 s → cached ~2 ms (original: ~1.2 s on every call). |
| V8 | Status change is compare-and-set: `findOneAndUpdate({ _id, status: <status just checked> })`; 409 if someone changed it meanwhile. | 8/8 concurrent `delivered`+`cancelled` both succeeded on original; 0/8 on fixed. |
| V9 | `users.refreshTokenIssuedAt` stored on each rotation. A validly-signed refresh token that doesn't match and is >30 s older than the current one revokes the session. Within 30 s it's treated as a benign concurrent-tab race (plain 401, session kept). | Replayed old token now kills the attacker's *and* victim's session (original kept it alive); concurrent-tab case still works. |
| V10 | `env.checkAuthSecrets()` in `config/env.js`; `server.js` prints problems and exits on fatal ones. Missing or equal secrets → always fatal. <32 chars or contains `change-me` → fatal in production, warning in dev. `.env.example` explains how to generate secrets. | 5 scenarios tested. ⚠️ The current local `.env` secrets are 29 and 14 chars → dev warning; production would refuse to start. Regenerate them (logs everyone out once). |
| V11 | Error handler: `CastError` no longer echoes value; Mongo `11000` → 409 (ready for unique indexes); `err.expose` 4xx (e.g. 413) passed through; other errors log details and return "Something went wrong" in production. | `/api/restaurants/<script>` → `{"message":"Invalid _id"}`. |
| V13 | Login runs `bcrypt.compare` against a dummy hash for unknown emails. Register's 409 kept (WONTFIX: can't hide without email verification; register is now rate limited). Note: unknown emails are still *slower* because `users.email` has no index (1M-doc scan) — the unique index in V6 fixes that. | Measured. |
| V14 | `verifyAccessToken` / `verifyRefreshToken` in `utils/token.js` pin `algorithms: ["HS256"]`; signing is explicit HS256 too. Middleware/controller use the helpers instead of raw `jwt.verify`. | `alg: none` owner token → 401. |
| V15 | `helmet@8.3.0` (pinned exact) — security headers, removes `X-Powered-By`. Explicit `express.json({ limit: "100kb" })`. `morgan` uses `combined` in production. No CORS middleware on purpose (same origin via Vite proxy) — comment in `app.js`. | Headers checked. |
| V16 | Schema `maxlength`: user name 100 / email 254 / city 100; restaurant name, city, area 100, cuisines ≤10 × 50 chars; menu name 100, category 50, price ≤100000; review comment 1000. `createOrder` ≤50 lines. Password 6–128 chars. | 11 cuisines, 101-char name, 51 lines → 400. |
| V17 | Revenue validates `from`/`to` (400 on invalid, `from > to`, or range >366 days; dashboard max is 90). Bad `:id` now 400 everywhere via the ownership middleware (`findById` → CastError). | All four cases tested. |

**Still open / deliberately not done**
- **V6 / V7** — need unique indexes on `users.email` and `reviews.order` (the indexing module's job; `autoIndex: false`). The error handler already maps duplicate-key to 409, so nothing else is needed once the indexes exist.
- **V12** — platform analytics open to any logged-in user; needs an admin role first.
- **V18** — accepted trade-off of stateless JWTs.
- **V19** — demo password in seed; fine for local dev.
- **Code quality not yet done:** Q4 (schema-validation layer): needs a decision on adding a dependency (zod/joi) and changes 400 message wording the client shows.

## 6. Fix log: code quality, 2026-11-24 (uncommitted, on `frontend`)

| ID | What changed | Verified |
|----|--------------|----------|
| Q2 | Revenue and top customers moved from `restaurant.controller.js` into `analytics.controller.js` as `getRevenue` (TASK 1) and `getTopCustomers` (TASK 5), served only at `/api/analytics/restaurants/:id/{revenue,top-customers}`. `/api/restaurants/:id/revenue` and `/top-customers` deleted. Responses now follow the TASK spec: revenue returns `totalRevenue`, `totalOrders`, per-day `orders`; top customers returns `{ customers: [{ customerId, name, orders, totalSpent }] }` (email still left out on purpose; `?limit` default 10, max 50, via `getPagination`). Client `analyticsApi.revenue/topCustomers` + Dashboard updated (asks for `limit=3`, average computed as `totalSpent / orders`). `restaurant.controller.js` is back to CRUD + public top-performers. | Test server :3100: totals and sorted days correct, invalid / reversed / >366-day ranges → 400, old route → 404, no token → 401. `vite build` passes. |
| Q3 | Second `$group` with `$push: "$$ROOT"` removed (it relied on `$group` keeping sort order): one `$group` per day, `$sort`, then totals added up in JS (≤366 rows). Nested `aggregate([[...]])` gone. Names fixed: `getTopPerformers`, "restaurants". Date-range parsing pulled into `parseDateRange`. | Same as Q2. |
| Q5 | `deleteRestaurant` deletes the restaurant first, then the menu. A failure in between now leaves orphan menu items nobody can reach instead of a live restaurant with no menu. (No transaction: would need a replica set.) | Code reading. |
| Q6 | `console.time` / `console.timeEnd` removed from `getMenu` (`morgan` already logs response time; `morgan` is `combined` in production since V15). | |
| Q7 | `pages.css` (3,435 lines) split by postcss into `styles/pages/{shared,home,restaurant,checkout,orders,auth,owner}.css` (largest 888 lines). Each rule goes to the page whose JSX uses its classes; selector lists covering several pages are split per page; `@media` blocks are split per file. Classes used on several pages go in `shared.css`. Three dead rules (`.auth__wave`, `.summary-checker`, `.ticket__time`, no JSX uses them) deleted. Imported in order from `main.jsx`. | Computed styles (incl. `::before`/`::after`) of every element on 12 screens at 1440 / 1000 / 390 px, with `Math.random` seeded: **0 differences** vs the original file. (The first attempt had 71 differences: a mobile `h1` rule shared by 3 pages landed in `shared.css` and lost to later desktop rules. Splitting selector lists fixed it.) `:hover` / `:focus` states were not part of the check. |

**New finding while doing Q2**
- **Q8 (Low, OPEN)**: revenue `from=YYYY-MM-DD` is parsed as UTC midnight (05:30 IST), but days are grouped in IST, so orders placed between 00:00 and 05:30 IST on the first day of the range are left out. The bug was already in the old endpoint too. Fix: read a date-only `from` as `${from}T00:00:00+05:30` and drop `setUTCHours`.
