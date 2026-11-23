import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { restaurantsApi } from "../api/endpoints";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { CITY_NAMES, CUISINES, CUISINE_PHOTOS, formatNum, photoFor } from "../lib/constants";
import { Checker, Scribble, Sparkle, Starburst, Underline, Wave } from "../components/Decor";
import { IconArrow, IconBike, IconBowl, IconChef, IconPin, IconSearch } from "../components/Icons";
import RestaurantCard, { RestaurantCardSkeleton } from "../components/RestaurantCard";
import { ErrorState } from "../components/States";

const PAGE_SIZE = 12;

function usePreferredCity() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get("city");
  const fallback = user?.city && CITY_NAMES.includes(user.city) ? user.city : "Bhopal";
  const city = CITY_NAMES.includes(fromUrl) ? fromUrl : fallback;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = params.get("sort") || "";
  const cuisine = CUISINES.includes(params.get("cuisine")) ? params.get("cuisine") : "";
  const set = (next) => {
    const merged = { city, page, cuisine, ...next };
    const p = new URLSearchParams();
    p.set("city", merged.city);
    if (merged.page > 1) p.set("page", merged.page);
    if (merged.cuisine) p.set("cuisine", merged.cuisine);
    if (sort) p.set("sort", sort);
    setParams(p, { replace: false });
  };
  return { city, page, cuisine, set };
}

function Hero({ city, total, onCity, onSearch }) {
  const [q, setQ] = useState("");
  return (
    <section className="hero">
      <div className="hero__inner wrap">
        <div className="hero__copy">
          <p className="hero__kicker hand">hot, fresh &amp; on its way</p>
          <h1 className="display hero__title">
            Hungry?
            <br />
            <span className="hero__title-accent">Order the</span>
            <br />
            good stuff.
          </h1>
          <p className="hero__lede">
            Biryani from the old city, dosa from the corner, pizza from that place you love. Pick a kitchen in {city} and we'll bring it to your door.
          </p>
          <form
            className="finder"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch(q.trim());
            }}
          >
            <span className="finder__brand display">FoodHub</span>
            <label className="finder__city">
              <IconPin width={18} height={18} />
              <span className="sr-only">City</span>
              <select value={city} onChange={(e) => onCity(e.target.value)}>
                {CITY_NAMES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="finder__q">
              <span className="sr-only">Search restaurants</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a kitchen or cuisine" />
              <IconSearch width={18} height={18} />
            </label>
            <button className="btn btn--orange finder__go">Find food</button>
          </form>
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__plate-bg" />
          <img className="hero__plate" src="/food/dosa-top.jpg" alt="" />
          <img className="hero__side hero__side--a" src="/food/biryani.jpg" alt="" />
          <img className="hero__side hero__side--b" src="/food/momos.jpg" alt="" />
          <Starburst className="hero__burst" color="var(--orange)" ink="var(--cream)" size={138} rotate={-14}>
            {total ? (
              <>
                <b>{formatNum(total)}</b>
                kitchens in {city}
              </>
            ) : (
              <>
                <b>Hot</b>
                right now
              </>
            )}
          </Starburst>
          <Scribble className="hero__scribble" arrow="down-left">
            crispy, golden,
            <br />
            ready in minutes
          </Scribble>
          <Sparkle className="hero__sparkle hero__sparkle--1" color="var(--ink)" />
          <Sparkle className="hero__sparkle hero__sparkle--2" color="var(--orange)" />
        </div>
      </div>
      <Wave color="var(--orange)" className="hero__wave" />
    </section>
  );
}

function CuisineBand({ active, onPick }) {
  return (
    <section className="cuisine-band">
      <div className="wrap">
        <div className="cuisine-band__head">
          <h2 className="display">What are you craving?</h2>
          <span className="hand cuisine-band__note">tap one to filter</span>
        </div>
        <div className="cuisine-row" role="list">
          {CUISINES.map((c) => (
            <button key={c} role="listitem" className={`cuisine-chip ${active === c ? "is-active" : ""}`} onClick={() => onPick(active === c ? "" : c)} aria-pressed={active === c}>
              <span className="cuisine-chip__img">
                <img src={CUISINE_PHOTOS[c][0]} alt="" loading="lazy" />
              </span>
              <span className="cuisine-chip__label">{c}</span>
            </button>
          ))}
        </div>
      </div>
      <Wave color="var(--cream)" className="cuisine-band__wave" />
    </section>
  );
}

function Pager({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="pager__info">
        Page <b>{formatNum(page)}</b> of {formatNum(totalPages)}
      </span>
      <button className="btn btn--ink btn--sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next page
      </button>
    </nav>
  );
}

function SearchResults({ q, city, onClear }) {
  // /restaurants/search returns 501 until it's implemented; fall back to the name filter on the city list.
  const search = useQuery({
    queryKey: ["search", q, city],
    queryFn: () => api("/restaurants/search", { query: { q, city }, auth: false }),
    enabled: !!q,
  });
  const fallback = useQuery({
    queryKey: ["restaurants", city, 1, 50],
    queryFn: () => restaurantsApi.list({ city, page: 1, limit: 50 }),
    enabled: !!q && search.error?.status === 501,
  });
  const notReady = search.error?.status === 501;
  const results = notReady
    ? (fallback.data?.restaurants || []).filter((r) => (r.name + " " + r.cuisines.join(" ") + " " + (r.area || "")).toLowerCase().includes(q.toLowerCase()))
    : search.data?.results || [];
  const loading = search.isLoading || (notReady && fallback.isLoading);

  return (
    <section className="listing wrap">
      <div className="listing__head">
        <h2 className="display">
          Results for “{q}”
          <Underline />
        </h2>
        <button className="btn btn--ghost btn--sm" onClick={onClear}>
          Clear search
        </button>
      </div>
      {notReady && (
        <p className="notice">
          Full-text search (<code>/api/restaurants/search</code>) isn't implemented yet, so this checks the first 50 kitchens in {city} by name, cuisine and area.
        </p>
      )}
      {search.error && !notReady && <ErrorState error={search.error} />}
      <div className="grid-cards">
        {loading && Array.from({ length: 4 }, (_, i) => <RestaurantCardSkeleton key={i} />)}
        {!loading && results.map((r) => <RestaurantCard key={r._id} restaurant={r} />)}
      </div>
      {!loading && !results.length && (notReady || !search.error) && <p className="muted center">Nothing matched. Try a cuisine like “biryani” or “pizza”.</p>}
    </section>
  );
}

function TopPerformers() {
  const { data } = useQuery({ queryKey: ["top-performers"], queryFn: restaurantsApi.topPerformers, staleTime: 5 * 60_000 });
  const list = (data?.topPerformers || []).filter((t) => t.restaurant);
  if (!list.length) return null;
  const [first, ...rest] = list;
  return (
    <section className="hitters">
      <Wave color="var(--green)" className="hitters__wave-top" flip />
      <div className="hitters__inner wrap">
        <div className="hitters__copy">
          <h2 className="display hitters__title">
            The heavy
            <br />
            hitters
          </h2>
          <p>The kitchens that delivered the most since September, across every city. Ranked live from the orders collection.</p>
          <Scribble className="hitters__scribble" arrow="down-right">
            our best
            <br />
            sellers
          </Scribble>
        </div>
        <Link to={`/r/${first.restaurant._id}`} className="hitters__lead">
          <img src={photoFor(first.restaurant)} alt="" />
          <Starburst className="hitters__burst" size={96} color="var(--yellow)" rotate={10}>
            Top
            <br />
            pick
          </Starburst>
          <div className="hitters__lead-body">
            <h3 className="display">{first.restaurant.name}</h3>
            <p>
              {first.restaurant.area}, {first.restaurant.city} · {first.restaurant.cuisines.join(" · ")}
            </p>
          </div>
        </Link>
        <ul className="hitters__list">
          {rest.map((t) => (
            <li key={t._id}>
              <Link to={`/r/${t.restaurant._id}`}>
                <img src={photoFor(t.restaurant)} alt="" loading="lazy" />
                <span>
                  <b>{t.restaurant.name}</b>
                  <small>
                    {t.restaurant.area}, {t.restaurant.city}
                  </small>
                </span>
                <IconArrow />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Checker color="var(--green)" size={20} className="hitters__checker" />
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: <IconBowl width={34} height={34} />, small: "First up", title: "Pick a kitchen", text: "Browse every kitchen in your city. Veg only? There's a switch for that." },
    { icon: <IconChef width={34} height={34} />, small: "Then", title: "Build your bag", text: "One kitchen per order, so everything arrives hot and together." },
    { icon: <IconBike width={34} height={34} />, small: "Finally", title: "Track & rate", text: "Watch it go from placed to cooking to delivered, then tell us how it was." },
  ];
  return (
    <section className="how">
      <div className="wrap">
        <h2 className="display how__title">How FoodHub works</h2>
        <div className="how__grid">
          {steps.map((s) => (
            <div key={s.title} className="how__item">
              <span className="how__icon">{s.icon}</span>
              <small>{s.small}</small>
              <h3 className="display">{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { city, page, cuisine, set } = usePreferredCity();
  const [q, setQ] = useState("");
  const [params, setParams] = useSearchParams();
  const az = params.get("sort") === "az";
  const setSort = (v) => {
    const p = new URLSearchParams(params);
    if (v === "az") p.set("sort", "az");
    else p.delete("sort");
    p.delete("page");
    setParams(p);
  };
  const [seed, setSeed] = useState(() => {
    try {
      const v = Number(sessionStorage.getItem("foodhub.seed"));
      if (v) return v;
      const n = Math.floor(Math.random() * 1e9) + 1;
      sessionStorage.setItem("foodhub.seed", String(n));
      return n;
    } catch {
      return Math.floor(Math.random() * 1e9) + 1;
    }
  });

  // A to Z: plain server pagination.
  const azq = useQuery({
    queryKey: ["restaurants", city, page, PAGE_SIZE],
    queryFn: () => restaurantsApi.list({ city, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    enabled: az,
  });
  // Discover: names are sorted and chains have dozens of branches, so any one A-Z page
  // is usually a single chain. Sample 13 random single-item pages instead (in parallel,
  // cards fill in as they arrive) and keep one branch per brand.
  const countq = useQuery({ queryKey: ["restaurants-count", city], queryFn: () => restaurantsApi.list({ city, page: 1, limit: 1 }), enabled: !az });
  const totalCount = countq.data?.total || 0;
  const samplePages = useMemo(() => {
    if (!totalCount) return [];
    const pages = new Set();
    let x = seed;
    while (pages.size < Math.min(PAGE_SIZE + 1, totalCount)) {
      x = (x * 1103515245 + 12345) % 2147483648;
      pages.add(1 + (x % totalCount));
    }
    return [...pages];
  }, [seed, totalCount]);
  const samples = useQueries({
    queries: samplePages.map((pg) => ({
      queryKey: ["restaurants", city, pg, 1],
      queryFn: () => restaurantsApi.list({ city, page: pg, limit: 1 }),
      staleTime: 10 * 60_000,
      enabled: !az,
    })),
  });
  const dq = {
    data: { restaurants: samples.map((q) => q.data?.restaurants?.[0]).filter(Boolean) },
    isLoading: !samples.some((q) => q.data),
    isFetching: samples.some((q) => q.isFetching),
    error: samples.find((q) => q.error)?.error,
    refetch: () => samples.forEach((q) => q.refetch()),
  };
  const pending = az ? 0 : samples.filter((q) => q.isLoading).length;
  const active = az ? azq : dq;
  const total = az ? azq.data?.total : countq.data?.total;
  const isLoading = az ? azq.isLoading : countq.isLoading || dq.isLoading;
  const isFetching = az ? azq.isFetching : false;
  const error = active.error || (!az && countq.error);

  useEffect(() => {
    if (page > 1) document.getElementById("kitchens")?.scrollIntoView({ behavior: "smooth" });
  }, [page]);

  const shown = useMemo(() => {
    let list = active.data?.restaurants || [];
    if (cuisine) list = list.filter((r) => r.cuisines.includes(cuisine));
    if (!az) {
      const seen = new Set();
      const brand = (r) => r.name.split(",")[0].trim();
      list = list.filter((r) => (seen.has(brand(r)) ? false : seen.add(brand(r)))).slice(0, PAGE_SIZE);
    }
    return list;
  }, [active.data, cuisine, az]);

  const shuffle = () => {
    const n = Math.floor(Math.random() * 1e9) + 1;
    try {
      sessionStorage.setItem("foodhub.seed", String(n));
    } catch {
      /* ignore */
    }
    setSeed(n);
  };

  return (
    <>
      <Hero city={city} total={total} onCity={(c) => set({ city: c, page: 1 })} onSearch={setQ} />
      <CuisineBand active={cuisine} onPick={(c) => set({ cuisine: c })} />
      {q ? (
        <SearchResults q={q} city={city} onClear={() => setQ("")} />
      ) : (
        <section className="listing wrap" id="kitchens">
          <div className="listing__head">
            <div>
              <h2 className="display">
                Kitchens in {city}
                <Underline />
              </h2>
              <p className="muted">
                {total ? `${formatNum(total)} places · ${az ? "A to Z" : "a fresh mix every visit"}` : "Finding places near you"}
                {cuisine && ` · ${cuisine} only`}
                {isFetching && !isLoading && " · updating"}
              </p>
            </div>
            <div className="listing__tools">
              <div className="seg" role="radiogroup" aria-label="Order">
                <button role="radio" aria-checked={!az} className={!az ? "is-active" : ""} onClick={() => setSort("discover")}>Discover</button>
                <button role="radio" aria-checked={az} className={az ? "is-active" : ""} onClick={() => setSort("az")}>A to Z</button>
              </div>
              <div className="city-tabs" role="tablist" aria-label="City">
                {CITY_NAMES.map((c) => (
                  <button key={c} role="tab" aria-selected={c === city} className={c === city ? "is-active" : ""} onClick={() => set({ city: c, page: 1 })}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <ErrorState error={error} onRetry={active.refetch} />}
          <div className={`grid-cards ${isFetching && !isLoading ? "is-dim" : ""}`}>
            {isLoading && Array.from({ length: 8 }, (_, i) => <RestaurantCardSkeleton key={i} />)}
            {shown.map((r, i) => (
              <RestaurantCard key={r._id} restaurant={r} featured={!az && !cuisine && i === 0} />
            ))}
            {!isLoading && !cuisine && Array.from({ length: pending }, (_, i) => <RestaurantCardSkeleton key={`p${i}`} />)}
          </div>
          {active.data && cuisine && !shown.length && (
            <p className="muted center">
              No {cuisine} in this batch.{" "}
              {az ? <button className="link-btn" onClick={() => set({ page: page + 1 })}>Try the next page</button> : <button className="link-btn" onClick={shuffle}>Shuffle again</button>} or{" "}
              <button className="link-btn" onClick={() => set({ cuisine: "" })}>show everything</button>.
            </p>
          )}
          {az ? (
            <Pager page={page} totalPages={azq.data?.totalPages} onPage={(p) => set({ page: p })} />
          ) : (
            <div className="pager">
              <button className="btn btn--ink" onClick={shuffle} disabled={pending > 0}>Shuffle the kitchens</button>
              <button className="link-btn" onClick={() => setSort("az")}>or browse all A to Z</button>
            </div>
          )}
        </section>
      )}
      <TopPerformers />
      <HowItWorks />
    </>
  );
}
