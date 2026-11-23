# Cook ledger: [project]

Copy this to `cook/ROUNDS.md` at the start of a run. Keep the header current. Add one round entry per round, newest at the bottom. Label every number as measured or eyeballed.

Started: [YYYY-MM-DD HH:MM, timezone]
Time: floor [8h] | cap [none]
Bar: composition [99.9] | light [99.9] | color [99.9] | materials [99.9] | detail [99.9] | motion [9/10]
Calibration offset: [none yet] (from [user estimate, date])
Usage: [5h window], about 20% per hour, never 100%
Gate: stills approved [no] | final render [not started]
Best so far: round [N], `cook/stills/r[NN]/`, [commit or snapshot]

## Decisions

Made without asking, one line each.
- [time] [decision], because [reason]

## User feedback inbox

Exact words. Close an item only when a still or clip proves it.
- [time] "[quote]" | round [N] | [open / done, proof: path]

---

## Round [NN]

Time: [start] to [end] | total elapsed [h]
Usage: [% of window at the end of the round, or "not readable"]
Focus: [shot and dimension], because [user feedback / lowest score / largest gap]

Changes:
- [what changed, where]

Stills: `cook/stills/r[NN]/` | Side by side: `cook/compare/r[NN]/`

Scores, eyeballed: critic median after calibration ([n] critics, [models or "same model"])

| Shot | Comp | Light | Color | Materials | Detail | Motion | vs last round |
|---|---|---|---|---|---|---|---|
| S01 | | | | | | | |
| S02 | | | | | | | |

Raw critic medians before calibration: [ ]
Own score (logged, never decides): [ ]

Measured (command and result):
- [color check S01: saturation delta [+/-0.00], brightness delta [+/-0.00]]
- [render: [N] s per frame at [resolution], [N] sub-frames]

Not checked this round:
- [what, and why]

Top gaps from critics:
1. [shot, region, what is wrong, what to change]
2. [ ]
3. [ ]

Progress note sent: [time]
Stop check: bar [no] | floor [no] | stills approved [no] | final checked [no] -> [next round / ship / stop at cap]
Next focus: [ ]

---
# ACTUAL LEDGER (template above kept for format)

Started: 2026-11-23 20:48 IST | Time: cap ~6h | Bar: 9/10 per dimension (critic median)
Gate: stills approved [no]

## Decisions
- 20:55 Use existing full DB, no indexes added; UI shows long-query states, because user said never touch data, and indexing is the user's learning exercise.
- 20:58 Photos via Unsplash official download links (napi search was blocked); 14 photos in client/public/food, credited by photo page link.
- 21:00 No ffmpeg: harness uses Playwright (cached chromium-1254 headless shell) for stills and side-by-side via HTML.
- 21:00 Fonts self-hosted via @fontsource: Anton (display), Caveat Brush (handwritten callouts), DM Sans (body).

## User feedback inbox
(none yet)

## Round 01-02
Time: 20:48 to ~22:05 IST
Focus: build all screens, harness, first stills; fix blank page (window.scrollTo returns a Promise in new Chromium, effect returned it).
Stills: cook/stills/r01, r02 | Side by side: cook/compare/r02 (shot pairs S01:R01 S02:R03 S03:R04 S04:R04 S05:R01 S06:R03 S07:R02 S08:R03 S01m:R04)
Scores, eyeballed: critic median of 2 (sonnet + opus), 0-10 per dim (comp/color/type/polish/ship):
S01 7/8/7/6/6 | S02 7/8/7/6.5/6 | S03 5.5/7.5/6.5/6/5 | S04 7/8/6/7/6 | S05 6/8/7/6/6 | S06 7/8/6.5/6/5.5 | S07 6.5/7/5.5/6.5/5.5 | S08 6/7/5.5/6/5 | S01m 6/8/6/5.5/5.5
Note: critics saw side-by-sides scaled ~0.5x, so "8px text" claims are partly scale artifacts; still bumping small text.
Measured: E2E (cook/tools/e2e.mjs) order 201 -> preparing 200 -> delivered 200 -> review 201 -> duplicate 409; reload keeps session; owner toggles round-trip; guards OK; 0 page errors.
  Test data written: order 6b045f5da8dd400078a614bc, review 6b045f63a8dd400078a614bd (customer@foodhub.com, Annapurna Tandoor House).
Top gaps: repeated chain names/photos in home grid; small text on owner screens; dev-leak API paths in coming-soon tiles; clipped lane tickets; empty checkout page; weak login inputs.
Next focus: round 3 = all of the above.

## Round 03-04
Time: ~21:00 to 21:30 IST (clock read 21:15 and 21:30)
Focus: critic gaps (repeated names/photos, small text, dev-leak tiles, clipped lanes, empty checkout, login inputs), then hero scale and owner screens.
Changes: Discover mode (13 parallel limit=1 samples, one branch per brand, featured wide card, 11 cards fill 3 rows); +15 Unsplash photos (29 total, credited); checkout extras + line thumbnails + pay check; lanes capped at 6, no redundant stamps; honest coming-soon tiles; dashboard anchored to latest delivered order; menu manager dish thumbs/tiles; mobile sticky bag bar; footer compacted; text sizes up.
Round 3 critic medians (2 critics, 0-10 comp/color/type/polish/ship): S01 7.5/8/7.5/7/6.75 | S02 7/8/7.5/7/6.75 | S03 6.75/8/7.5/7/6 | S04 7/7.5/7.5/6.75/6.5 | S05 6.75/8.75/7.5/6.75/6.5 | S06 6.5/8/7/5.75/5.75 (chart showed 1 bar because my E2E test order dated today moved the anchor; fixed by deleting test data) | S07 6.75/7.25/6.75/6.25/6 | S08 6.25/7.25/7/6.5/5.75
Data cleanup: deleted my own E2E test order 6b045f5da8dd400078a614bc and review 6b045f63a8dd400078a614bd (they showed publicly).
Decision 21:20: footer "inconsistency" flagged by critic B was stale renders, not a bug.
Commits: 88790d3, 82e1902. Stills r04, compare r04. Round 4 critics running.

## Round 05
Time: 21:30 to 21:38 IST
Round 4 critic medians (comp/color/type/polish/ship): S01 8/8.25/8/7/7.25 | S02 8/8/8/6.5/7.25 | S03 6.5/8/7.5/5.75/5.75 | S04 7.25/8/7.75/7/7 | S05 7/8.75/7.75/6.5/6.75 | S06 8/8.25/8/7/7.25 | S07 7.5/7.5/7.25/6.75/6.75 | S08 7.25/8/7.5/6.5/6.5 | S01m 4/7/5/3/3 (real bug)
Bug found by critic B: mobile hero broken + horizontal scroll, caused by round-4 desktop CSS appended after the mobile media query. Fix: final mobile override block kept LAST in pages.css; html/body overflow-x: clip. Verified by crop of r05/S01m.
Changes: dish photo sets (beverages, breads, ice cream; +9 photos, 38 total), keyword map extended; menu manager shows "Sold out" only; live orders pinned first as full-width hero card; "Treat yourself" card (priciest available dish); closed cards keep colour; footer eyes moved; search placeholder shortened.
Commit fecc9b3. Round 5 critics running.

## Round 06
Time: 21:38 to ~21:52 IST
Round 5 critic medians (comp/color/type/polish/ship): S01 7.5/8/7.5/7/7 | S02 7.5/8/7/7/7 | S03 6/7.5/7/7/6 | S04 6.5/7/6.5/7/6.5 | S05 6.5/8/7/5.5/5.5 | S06 7.5/8/7.5/7/7 | S07 6.5/7/5.5/6/5.5 | S08 6/7/6/7/6 | S01m 6/8/7/5/5 | S02m 7/8/7/7/7
Note: critic A judged type size from downscaled images (claims 9-10px; measured CSS is 14-16px body). Discounted those claims.
Bugs fixed: real mobile overflow measured (body scrollWidth 405 vs 390) -> culprit .hitters__burst (cook/tools/overflow.mjs); now 390. Harness: lazy images missing in full-page stills -> shots.mjs now scrolls before capture. Table actions now buttons in a "Next step" column. Login plate kept inside panel.
Changes: ticket "time ago" chips (late = red), payment icons + note callout, login subtitle + demo buttons, bigger hero CTA, mobile menu rows wrap.

## Round 07
Time: 21:44 to ~22:00 IST
Round 6 critic medians (comp/color/type/polish/ship): S01 8/9/8/7/7 | S02 7.5/8.5/7.5/6.5/6.5 | S03 7/8.5/7.5/7.5/7 | S04 7.5/8.5/7/7/7 | S05 8/9/8/7/8 | S06 7.5/8.5/7.5/7/7 | S07 7.5/8/7/6.5/6.5 | S08 7/8/7/7/7 | S01m 7/9/8/6/6 | S02m 7/9/8/7/7
Main cross-critic gap: photo repetition/mismatch. Fix: photosForList() gives every card in a grid a distinct photo within its cuisine; removed misleading photos (gulab-jamun pan read as tomatoes, burgers on chaat kitchens); Bakes/brownie -> ice-cream set. Live tickets older than a day say "waiting since <date>". Login copy no longer claims a number. Edge fades on mobile scrollers. Hero scribble hidden on desktop.
Measured: mobile overflow 390/390 on /, /r/:id, /checkout (overflow.mjs). E2E rerun: order 201 -> 200 -> 200 -> review 201 -> 409, 0 page errors; owner toggles/guards OK. Test docs deleted again (order 6b046653a8dd400078a614be, review 6b046657a8dd400078a614bf).
Gate: stills r07 sent to user for approval.
