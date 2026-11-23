# Brief: FoodHub frontend

Target: full frontend for the FoodHub Express/Mongo API (customer + owner roles). Stack: React 19 + Vite 6 + React Router 7 + TanStack Query 5, plain CSS, `/api` dev proxy. Lives in `client/`.
References: cook/refs/R01 (Banza site), R02 (Crust Pizza site), R03 (fast-food menu poster), R04 (Happies snacks site). Same quality, own style: one design language blended from all four, no layout copied 1:1.
Bar: every screen >= 9/10 from fresh-context critics on composition, color, typography, detail/polish, plus "would ship next to the references". Every API flow must actually work against the local DB.
Calibration offset: none yet.
Rules: free licensed photos only (Unsplash, credited in client/CREDITS.md). Slop ban list from the cook skill (no purple gradients, no monospace uppercase labels, no glowing orbs, no em dashes in UI copy, no decorative particles, no 01/02/03 counters). Color: warm, saturated like refs, never washed out.
Backend: small marked fixes allowed (route order for /top-performers, top-customers uses :id, add GET /restaurants/mine). Do not implement 501 analytics. Do not touch DB data or indexes, never re-seed.
Time: hard cap ~6h. Started: 2026-11-23 20:48 IST.
Usage: 5h window, ~20%/h, never 100%.
Deliverable: working client/ app + approved screenshots per screen + README run section.
Permissions: download licensed photos yes. Commit on branch `frontend` yes. Push/PR/publish no.
User's words: "Build frontend for the backend using the context - images for reference are provided in reference images folder"
Data reality (measured 2026-11-23): full seed (1M restaurants, 10M orders, 20M menu items). /restaurants?city 0.57s, menu 0.03s, reviews 0.97s, owner orders 7.7s, /orders/my >100s (no customer index). UI must tolerate very slow queries.
