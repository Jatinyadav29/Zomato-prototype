# FoodHub — Frontend Build Context

Everything a frontend for this repo needs to know: architecture, data model, every endpoint with its exact request/response shapes, auth flow, error contract, and known gaps.
It was written from the source in `server/src/` (commit `edd1f8c`). If a controller changes, update this file.

---

## 1. What exists today

```
Zomato-prototype/
  server/            Node 20+, Express 5, MongoDB/Mongoose 9, JWT, CommonJS. No TypeScript.
    src/app.js       middleware + route mounting
    src/routes/      auth, restaurant, order, review, analytics
    src/controllers/ handlers talk to Mongoose models directly (no service layer)
    src/models/      User, Restaurant, MenuItem, Order, Review
    src/middlewares/ authUser (Bearer JWT), authorize(...roles), error handler
    src/utils/       pagination, token, ownership
    src/seed/        Faker seed (fixed seed 2026), ~34M docs by default
  (no frontend yet)
```

- API base: `http://localhost:3000`, all routes under `/api`. `GET /` returns `{ message: "FoodHub API is running" }`, which works as a health check.
- The app is a teaching repo. It deliberately ships **without DB indexes** and with **analytics endpoints that return `501`**. Expect slow responses (seconds on the full data set) and unimplemented endpoints. Build loading states and 501 handling from day one.
- Two roles: `customer` and `owner`. There is **no admin**.

### Run the backend

```bash
cd server && npm install && cp .env.example .env
```

For frontend work, use the small data set. Add this to `server/.env`:

```bash
CUSTOMER_COUNT=4700
OWNER_COUNT=300
RESTAURANT_COUNT=300
ORDER_COUNT=300000
REVIEW_COUNT=60000
```

```bash
npm run seed && npm run dev
```

Demo accounts (password `password123` for every seeded user):

| Role     | Email                  | Notes |
| -------- | ---------------------- | ----- |
| owner    | `owner@foodhub.com`    | Owns several restaurants including the flagship (in Bhopal, the busiest). The seed prints its `_id`. |
| customer | `customer@foodhub.com` | Lives in Bhopal, has many orders |

---

## 2. Frontend integration requirements (read first)

### 2.1 No CORS: use a dev proxy
`app.js` has **no CORS middleware**. A frontend on another origin (e.g. Vite on `:5173`) will be blocked by the browser. The refresh cookie is also `sameSite: "strict"` with `path: "/api/auth"`.

**Recommended:** serve the frontend through a same-origin proxy so the browser thinks the API and the UI are on one origin:

```js
// vite.config.js
export default {
  server: { proxy: { "/api": "http://localhost:3000" } },
};
```

Then call relative URLs (`/api/...`) everywhere. In production, put both behind one origin (reverse proxy) or add the `cors` package with `credentials: true` and an explicit origin on the server.

### 2.2 Auth model
| Token | Lifetime | Where | Payload |
| ----- | -------- | ----- | ------- |
| Access  | 15 min | JSON body (`accessToken`). Keep it **in memory** (not localStorage). Send `Authorization: Bearer <token>`. | `{ id, role }` |
| Refresh | 7 days | `httpOnly` cookie `refreshToken`, `sameSite: strict`, `path: /api/auth`, `secure` only when `NODE_ENV=production` | `{ id }` |

Flow:
1. `login`/`register` → store `accessToken` + `user` in memory; the cookie is set automatically.
2. Every protected call sends the Bearer header.
3. On `401 { message: "Access token expired" }` → `POST /api/auth/refresh` → retry the original request once.
4. On app boot (page reload loses the in-memory token) → call `POST /api/auth/refresh`. If it succeeds, call `GET /api/auth/me` to restore the user. If it returns 401, the user is logged out.
5. `logout` → `POST /api/auth/logout`, then clear in-memory state.

**Refresh tokens rotate, and only the latest one is valid.** If two refresh calls run at once, the second one sends the already-rotated cookie, fails, and the server **clears the cookie** (logs the user out). That happens with parallel 401s, multiple tabs, or React StrictMode's double effects on boot. The client **must single-flight refresh**: keep one shared in-flight promise.

The 401 messages you can get from `authUser`: `"Access token missing"`, `"Access token expired"` (refresh and retry), `"Invalid access token"` (log out).
A 403 `"You are not allowed to do this"` means the wrong role.

### 2.3 Reference API client

```js
// api.js
let accessToken = null;
let refreshPromise = null;
export const setAccessToken = (t) => { accessToken = t; };

async function refreshAccessToken() {
  refreshPromise ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then(async (r) => {
      if (!r.ok) throw new Error("SESSION_EXPIRED");
      const { accessToken: t } = await r.json();
      accessToken = t;
      return t;
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function api(path, { method = "GET", body, query, auth = true, retry = true } = {}) {
  const qs = query ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== "")) : "";
  const res = await fetch(`/api${path}${qs}`, {
    method,
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && data.message === "Access token expired" && retry) {
    await refreshAccessToken();
    return api(path, { method, body, query, auth, retry: false });
  }
  if (!res.ok) throw Object.assign(new Error(data.message || res.statusText), { status: res.status, data });
  return data;
}
```

### 2.4 Error contract
Every error body is `{ message: string }`. Validation failures add `errors: string[]`.

| Status | When |
| ------ | ---- |
| 400 | Bad input; malformed ObjectId (`"Invalid _id: abc"`); Mongoose validation (`{ message: "Validation failed", errors: [...] }`); bad JSON (`"Invalid JSON body"`); business rule (closed restaurant, illegal status move, …) |
| 401 | Missing/invalid/expired token; wrong login credentials (`"Invalid email or password"`) |
| 403 | Wrong role, or not the owner of the restaurant/order |
| 404 | Resource not found, or unknown route (`"Route not found: GET /api/x"`) |
| 409 | Email already registered; order already reviewed |
| 501 | Analytics/search/nearby stub: `"Not implemented yet"`. Show a "coming soon" state. |
| 500 | Anything else. The message is passed through from the error. |

Show `message` to users directly. The messages are written to be readable.

### 2.5 Conventions
- IDs are Mongo ObjectId hex strings in `_id`. **Exception:** the auth `user` object uses `id`, not `_id`.
- Dates are ISO strings (UTC). Order and review data is generated in **IST**, so display in `Asia/Kolkata`.
- Money is **whole Indian rupees** (integers, no paise). Format with `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })`.
- Mongoose docs come back raw, so expect `__v` on documents. Only `createdAt` exists (no `updatedAt`).
- Coordinates are GeoJSON **`[lng, lat]`** (longitude first). The create/update body takes separate `lng` and `lat`.
- Restaurant names repeat (chains). Always key by `_id`, never by name.

### 2.6 Pagination
Paginated list endpoints accept `?page=&limit=`. Defaults: `page=1`, `limit=10`, **max `limit=50`** (values are clamped, never rejected). Response envelope:

```ts
{ page: number; limit: number; total: number; totalPages: number; <items>: T[] }
```

It is offset-based (`skip`), so deep pages on big collections are slow.

---

## 3. Data model (TypeScript shapes as returned by the API)

```ts
type Role = "customer" | "owner";
type OrderStatus = "placed" | "preparing" | "delivered" | "cancelled";
type PaymentMethod = "upi" | "card" | "cod";
type ObjectId = string;

// Returned by auth endpoints (note: `id`, not `_id`)
interface PublicUser { id: ObjectId; name: string; email: string; role: Role; city?: string; createdAt: string }

interface Restaurant {
  _id: ObjectId;
  name: string;
  owner: ObjectId | { _id: ObjectId; name: string }; // populated only in GET /restaurants/:id
  city: string;
  area?: string;
  cuisines: string[];
  location: { type: "Point"; coordinates: [lng: number, lat: number] };
  isOpen: boolean;
  createdAt: string;
}

interface MenuItem {
  _id: ObjectId;
  restaurant: ObjectId;
  name: string;
  category: string;       // default "Other"
  price: number;          // rupees, >= 0
  isVeg: boolean;         // default true
  isAvailable: boolean;   // default true
}

interface OrderItem { menuItem: ObjectId; name: string; price: number; quantity: number } // snapshot at order time

interface Order {
  _id: ObjectId;
  customer: ObjectId | { _id: ObjectId; name: string };                           // populated in owner list
  restaurant: ObjectId | { _id: ObjectId; name: string; city: string; area?: string }; // populated in /orders/my
  items: OrderItem[];
  totalAmount: number;    // = Σ price × quantity, computed server-side
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

interface Review {
  _id: ObjectId;
  customer: ObjectId | { _id: ObjectId; name: string }; // populated in restaurant review list
  restaurant: ObjectId;
  order: ObjectId;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;        // default ""
  createdAt: string;
}
```

**Fields the UI might expect but the backend does not have:** restaurant images, rating on the restaurant doc, delivery time, price-for-two, menu item descriptions or images, user addresses or phone numbers, delivery fees or taxes, order-level review flag. Use placeholders, or derive them (e.g. image by cuisine, rating from the ratings analytics once implemented).

### Reference data (from `server/src/seed/data.js`)
- **Cities** (with centre `lat, lng` and areas):
  - Bhopal `23.2599, 77.4126`: MP Nagar, Arera Colony, New Market, Kolar Road, Indrapuri, Bittan Market, Habibganj, Shahpura
  - Indore `22.7196, 75.8577`: Vijay Nagar, Palasia, Rajwada, Sapna Sangeeta, Bhawarkua, Sarafa, Nipania, Rau
  - Delhi `28.6139, 77.209`: Connaught Place, Hauz Khas, Karol Bagh, Lajpat Nagar, Saket, Rajouri Garden, Chandni Chowk, Dwarka
  - Mumbai `19.076, 72.8777`: Andheri West, Bandra West, Powai, Colaba, Lower Parel, Malad, Dadar, Juhu
  - Bengaluru `12.9716, 77.5946`: Koramangala, Indiranagar, HSR Layout, Whitefield, Jayanagar, MG Road, Marathahalli, BTM Layout
  - Pune `18.5204, 73.8567`: Koregaon Park, Kothrud, Baner, Viman Nagar, Hinjewadi, Aundh, Camp, Shivajinagar
  - Hyderabad `17.385, 78.4867`: Banjara Hills, Jubilee Hills, Gachibowli, Hitech City, Kukatpally, Secunderabad, Madhapur, Ameerpet
  - Jaipur `26.9124, 75.7873`: C-Scheme, Malviya Nagar, Vaishali Nagar, MI Road, Raja Park, Mansarovar, Bapu Bazaar, Tonk Road
- **Cuisines:** North Indian, South Indian, Chinese, Biryani, Pizza, Street Food, Desserts
- **Menu categories:** Main Course, Starters, Breads, Rice, Dosa, Idli & Vada, Beverages, Noodles, Momos, Soups, Biryani, Sides, Desserts, Pizza, Pasta, Chaat, Snacks, Rolls, Indian Sweets, Ice Cream & Kulfi, Bakes
- Seeded prices are 40–600, rounded to 5. Each restaurant has 15–25 items, and about 8% of them are unavailable. About 10% of restaurants are closed.
- There is no endpoint for cities, cuisines or categories. **Hard-code these lists** in the frontend, or derive categories from the loaded menu.

---

## 4. Endpoint reference

Auth: **public** · **user** (any logged-in user) · **customer** / **owner** (that role only). An **owned** route also checks that the restaurant belongs to the caller; otherwise it returns `404 "Restaurant not found"` or `403 "You do not own this restaurant"`.

### 4.1 Auth (`/api/auth`)

| Method | Path | Auth | Body | Success |
| ------ | ---- | ---- | ---- | ------- |
| POST | `/register` | public | `{ name, email, password (≥6), role?: "customer"\|"owner", city? }` | `201 { message, user: PublicUser, accessToken }` + cookie |
| POST | `/login` | public | `{ email, password }` | `200 { message, user: PublicUser, accessToken }` + cookie |
| POST | `/refresh` | cookie | none | `200 { accessToken }` + rotated cookie |
| POST | `/logout` | cookie | none | `200 { message: "Logged out successfully" }` (always succeeds) |
| GET  | `/me` | user | none | `200 { user: PublicUser }` |

Errors: register `400` (missing fields / short password / bad role), `409 "Email is already registered"`. Login `401 "Invalid email or password"`. Refresh `401` `"Refresh token missing"` / `"Invalid or expired refresh token"` / `"Invalid refresh token"` (the cookie gets cleared).
`city` is free text. Use one of the 8 cities so city-based UX works.

### 4.2 Restaurants (`/api/restaurants`)

| Method | Path | Auth | Input | Success |
| ------ | ---- | ---- | ----- | ------- |
| GET | `/` | public | `?page&limit&city` (exact, case-sensitive) | `{ page, limit, total, totalPages, restaurants: Restaurant[] }` sorted by name |
| GET | `/:id` | public | | `{ restaurant }` with `owner: { _id, name }` |
| POST | `/` | owner | `{ name, city, area?, cuisines?: string[], lng, lat, isOpen? }` | `201 { restaurant }` (`400 "Valid lng and lat are required"`) |
| PATCH | `/:id` | owner, owned | any of `name, city, area, cuisines, isOpen`, plus **both** `lng`+`lat` to move | `{ restaurant }` |
| DELETE | `/:id` | owner, owned | | `{ message: "Restaurant deleted" }`. Menu is deleted too. Orders and reviews are kept. |
| GET | `/:id/revenue` | owner | `?from&to` (date strings; default last 7 days) | see below |

`GET /:id/revenue` is a hand-written aggregation, separate from the analytics stub at `/api/analytics/restaurants/:id/revenue`. It counts delivered orders only and groups by IST day:
```ts
{ message: "Revenue details", revenue: number, from: "YYYY-MM-DD", to: "YYYY-MM-DD",
  days: { date: "YYYY-MM-DD", revenue: number }[] }  // days with no orders are omitted; no order counts
```
⚠️ It does **not** check ownership (any owner can read any restaurant), and a malformed id returns 500 instead of 400.

### 4.3 Menu (`/api/restaurants/:id/menu`)

| Method | Path | Auth | Input | Success |
| ------ | ---- | ---- | ----- | ------- |
| GET | `/:id/menu` | public | `?category=<exact>&isVeg=true\|false` | `{ restaurant: { id, name }, count, menuItems: MenuItem[] }` sorted by category, then name. **Not paginated.** Includes unavailable items, so grey them out. |
| POST | `/:id/menu` | owner, owned | `{ name, category?, price, isVeg?, isAvailable? }` | `201 { menuItem }` |
| PATCH | `/:id/menu/:itemId` | owner, owned | any of `name, category, price, isVeg, isAvailable` | `{ menuItem }` |
| DELETE | `/:id/menu/:itemId` | owner, owned | | `{ message: "Menu item deleted" }` |

On the full data set, without indexes, the menu GET scans 20M documents and takes several seconds.

### 4.4 Orders

| Method | Path | Auth | Input | Success |
| ------ | ---- | ---- | ----- | ------- |
| POST | `/api/orders` | customer | `{ restaurantId, items: [{ menuItemId, quantity }], paymentMethod?: "upi"\|"card"\|"cod" (default cod) }` | `201 { order }` (status `placed`) |
| GET | `/api/orders/my` | customer | `?page&limit` | paginated `orders`, newest first, `restaurant` populated `{ _id, name, city, area }` |
| GET | `/api/restaurants/:id/orders` | owner, owned | `?page&limit&status` | paginated `orders`, newest first, `customer` populated `{ _id, name }` |
| PATCH | `/api/orders/:id/status` | owner (order's restaurant must be owned) | `{ status }` | `{ order }` |

Order rules (enforce them in the UI too):
- One order belongs to **one restaurant**. The cart must be scoped to a single restaurant: clear it, or prompt the user, when they switch restaurants.
- `quantity` must be an integer from 1 to 20. `items` must not be empty.
- The server ignores client prices: name, price and total come from the DB. Show the server's `totalAmount` after placing the order.
- Failures: `404 Restaurant not found`, `400 "Restaurant is closed right now"`, `400 "Menu item <id> is not available in this restaurant"` (unavailable or from another restaurant).
- No payment gateway. `paymentMethod` is just a label.
- Status state machine:
  ```
  placed ──► preparing ──► delivered
     │           │
     └──► cancelled ◄──┘
  ```
  `delivered` and `cancelled` are terminal. An illegal move returns `400` with `Allowed: …` in the message. Render only the allowed next actions per row. Customers **cannot cancel**. Only owners change status.
- No real-time push. Poll (e.g. every 15–30 s) on the owner's live orders and the customer's order tracking.

### 4.5 Reviews

| Method | Path | Auth | Input | Success |
| ------ | ---- | ---- | ----- | ------- |
| POST | `/api/reviews` | customer | `{ orderId, rating: 1-5 integer, comment? }` | `201 { review }` |
| GET | `/api/restaurants/:id/reviews` | public | `?page&limit` | paginated `reviews`, newest first, `customer` populated `{ _id, name }` |

Rules: you can review only your **own** order (403) and only a **delivered** one (400), with **one review per order** (`409 "You already reviewed this order"`). Nothing tells the client whether an order is already reviewed. Show "Rate order" on delivered orders and treat a 409 as "already reviewed" (cache it locally).

### 4.6 Analytics & discovery: all return `501` today

Mounted at `/api` **before** the restaurant router, so `/api/restaurants/search` and `/nearby` don't collide with `/:id`. The target response shapes are specified in `server/src/controllers/analytics.controller.js`. Build the UI against these shapes and show "coming soon" on 501.

| Path | Auth | Query | Target response |
| ---- | ---- | ----- | --------------- |
| `/api/analytics/restaurants/:id/revenue` | owner | `from, to` (YYYY-MM-DD, default last 30d) | `{ restaurantId, from, to, totalRevenue, totalOrders, days: [{ date, revenue, orders }] }` |
| `/api/analytics/restaurants/:id/top-dishes` | owner | `limit` (default 5) | `{ dishes: [{ menuItemId, name, quantitySold, revenue }] }` |
| `/api/analytics/restaurants/:id/peak-hours` | owner | | `{ hours: [{ hour: 0-23, orders }], peakHour }` (all 24 hours, IST) |
| `/api/analytics/restaurants/:id/status-breakdown` | owner | | `{ total, statuses: [{ status, count, percentage }] }` |
| `/api/analytics/restaurants/:id/top-customers` | owner | | `{ customers: [{ customerId, name, email, orders, totalSpent }] }` (top 10) |
| `/api/analytics/restaurants/:id/ratings` | owner | | `{ averageRating, totalReviews, stars: { "1".."5": n }, latestReviews: [{ rating, comment, customerName, createdAt }] }` |
| `/api/analytics/platform/city-revenue` | user | | `{ cities: [{ city, revenue, orders }] }` |
| `/api/analytics/platform/monthly-trend` | user | | `{ months: [{ month: "YYYY-MM", revenue, orders }] }` (12, oldest first) |
| `/api/restaurants/search` | public | `q, city, cuisine, page` (10/page) | `{ page, total, results: Restaurant-lite[], cuisineCounts: [{ cuisine, count }] }` |
| `/api/restaurants/nearby` | public | `lng, lat` (required), `radius` m (default 5000) | `{ count, restaurants: [{ _id, name, area, distanceInMeters }] }` |

Until search ships, use `GET /api/restaurants?city=` for browsing, and filter by cuisine client-side within a page.

---

## 5. Screen map → endpoints

### Customer
| Screen | Calls |
| ------ | ----- |
| Login / Register | `POST /auth/login`, `POST /auth/register` |
| Home / browse | `GET /restaurants?city=<user.city>&page` (fallback); `GET /restaurants/search` (once implemented); `GET /restaurants/nearby` with `navigator.geolocation` (stretch) |
| Restaurant page | `GET /restaurants/:id`, `GET /restaurants/:id/menu?category&isVeg` (veg toggle), `GET /restaurants/:id/reviews?page` |
| Cart / checkout | client-side cart `{ restaurantId, items: { menuItemId, name, price, quantity }[] }` → `POST /orders`. Show the closed-restaurant state from `isOpen`. |
| My orders | `GET /orders/my?page` (poll the active ones) |
| Rate order | `POST /reviews` (delivered orders only) |
| Profile | `GET /auth/me`, `POST /auth/logout` |

### Owner
| Screen | Calls |
| ------ | ----- |
| My restaurants | ⚠️ **No endpoint lists an owner's restaurants** (see §6). |
| Create / edit restaurant | `POST /restaurants`, `PATCH /restaurants/:id`, `DELETE /restaurants/:id`. Map picker → `lng`/`lat`. |
| Menu manager | `GET/POST/PATCH/DELETE /restaurants/:id/menu[/:itemId]`. Toggle `isAvailable` inline. |
| Live orders | `GET /restaurants/:id/orders?status=placed\|preparing` (poll) + `PATCH /orders/:id/status` |
| Order history | `GET /restaurants/:id/orders?page&status` |
| Dashboard | `GET /restaurants/:id/revenue?from&to` (works now); the six `/analytics/restaurants/:id/*` endpoints (501 for now) |
| Platform insights | `/analytics/platform/city-revenue`, `/monthly-trend` (any user, 501 for now) |

Route guards: redirect unauthenticated users to login, and gate by `user.role`. Owner routes on a restaurant still rely on the server's ownership 403.

---

## 6. Backend gaps that affect the frontend

1. **No CORS.** Use the dev proxy (§2.1), or add `cors({ origin, credentials: true })` on the server.
2. **No "my restaurants" endpoint for owners.** `GET /api/restaurants` cannot filter by owner. Suggested addition: `GET /api/restaurants/mine` (owner) → `Restaurant.find({ owner: req.user.id })`, registered **before** `/:id`. Until then, the owner UI has to keep restaurant IDs from creation, or a hard-coded demo ID.
3. **Analytics, search and nearby return 501.**
4. `GET /api/restaurants/:id/revenue` has no ownership check and returns 500 on a malformed id.
5. Orders don't say whether they've been reviewed. Handle the 409.
6. No customer-side cancel, no address, no real-time updates.
7. No indexes, so lists and menus are slow on the full data set. Use the small seed preset for development, debounce filters, and show skeletons.
8. Concurrent refreshes log the user out because of rotation. Single-flight refresh (§2.3) is mandatory.

---

## 7. Suggested frontend stack and structure (not prescribed by the repo)

React + Vite + React Router + TanStack Query (caching, polling via `refetchInterval`, 501/error states) + a small auth context holding `{ user, accessToken }` in memory, with the client from §2.3.

```
client/
  vite.config.js         /api proxy → :3000
  src/api/               client.js (§2.3), auth.js, restaurants.js, menu.js, orders.js, reviews.js, analytics.js
  src/auth/              AuthProvider (boot: refresh → me), RequireAuth, RequireRole
  src/cart/              CartContext (single-restaurant, persisted to localStorage)
  src/constants.js       CITIES, CUISINES, CATEGORIES, STATUS transitions, formatINR, IST date formatter
  src/pages/customer/    Home, Restaurant, Checkout, Orders
  src/pages/owner/       Restaurants, RestaurantEdit, Menu, LiveOrders, Dashboard
  src/pages/auth/        Login, Register
```
