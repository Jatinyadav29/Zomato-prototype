# FoodHub client

React frontend for the FoodHub API in `../server`. Customers browse kitchens, order and review. Owners run their kitchens: open/close, menu, live orders, revenue.

Stack: React 19, Vite 6, React Router 7, TanStack Query 5, plain CSS. Fonts are self-hosted (Anton, Caveat Brush, DM Sans). Food photos are from Unsplash, see [CREDITS.md](CREDITS.md).

## Run it

```bash
# 1. API (from ../server): MongoDB must be running
cd ../server && npm install && npm run dev        # http://localhost:3000

# 2. Client
cd ../client && npm install && npm run dev        # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:3000`, so the browser sees one origin. The API has no CORS, and the refresh cookie is `sameSite=strict`, so don't open the client on another origin.

Demo accounts (password `password123`): `customer@foodhub.com`, `owner@foodhub.com`. The login page has one-click buttons for both.

## What's where

| Path | What |
|---|---|
| `src/api/client.js` | fetch wrapper: in-memory access token, single-flight refresh (refresh tokens rotate), 401 retry, error messages from the API |
| `src/api/endpoints.js` | one function per endpoint |
| `src/auth/AuthProvider.jsx` | boot (refresh, then `/me`, once even under StrictMode), login/register/logout, `RequireRole` guard |
| `src/cart/CartContext.jsx` | single-restaurant bag in localStorage, with a "start a new bag?" prompt when switching kitchens |
| `src/pages/` | Home, Restaurant (menu poster + bag), Checkout, Orders (track + rate), Auth |
| `src/pages/owner/` | My kitchens, Dashboard (revenue chart, top customers), Live orders (+ history), Menu manager, Kitchen form |
| `src/components/Decor.jsx` | the hand-drawn bits: waves, checker, starburst stickers, scribble arrows, veg marks, stars |

## Things worth knowing

- **Slow queries are expected.** The database has no indexes on purpose (it's an aggregation and indexing exercise). On the full seed, `GET /orders/my` takes 1 to 3 minutes and an owner's order list about 8 seconds. Those screens show a loader with a running timer instead of hanging silently. An index such as `db.orders.createIndex({ customer: 1, createdAt: -1 })` makes them instant.
- **501 endpoints** (`/analytics/*`, `/restaurants/search`, `/restaurants/nearby`) show friendly "cooking" tiles. The UI already renders their target shapes, so implementing the aggregation on the server lights them up without frontend changes. Home search falls back to filtering the first 50 kitchens of the city.
- **Discover vs A to Z.** Restaurant names are sorted and chains have many branches, so an A to Z page is often one chain. "Discover" samples 12 random positions in the city (parallel `limit=1` requests) and keeps one branch per brand. "A to Z" is plain server pagination.
- **Dashboard dates.** Seeded orders stop at the seed date, so the dashboard anchors its range to the newest delivered order ("Use today instead" switches back).
- **Reviews.** The API can't say if an order was reviewed, so a 201 or 409 is remembered in localStorage.
- Money is whole rupees (`en-IN`); dates are shown in `Asia/Kolkata`.

## Backend changes made for the frontend

Small, marked with `[frontend fix]` in `server/src`:

- `GET /api/restaurants/mine` (owner): lists the logged-in owner's restaurants.
- `/top-performers` is registered before `/:id`, so Express no longer treats it as an id.
- `GET /:id/top-customers` uses `:id` instead of a hard-coded restaurant id.
