import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, ordersApi } from "../../api/endpoints";
import { formatDate, formatINR, formatNum, istDate } from "../../lib/constants";
import { Scribble, Starburst, Stars } from "../../components/Decor";
import { ErrorState, SlowLoader, Skeleton } from "../../components/States";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function shiftDays(ymd, delta) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Single-series bar chart: one hue, no legend (the title names it),
// rounded data-ends on the baseline, 2px gaps, hover tooltip, table fallback.
function RevenueBars({ days, from, to }) {
  const [hover, setHover] = useState(null);
  const series = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d.revenue]));
    const out = [];
    for (let d = from; d <= to; d = shiftDays(d, 1)) out.push({ date: d, revenue: byDate.get(d) || 0 });
    return out;
  }, [days, from, to]);
  const max = Math.max(1, ...series.map((d) => d.revenue));
  const nice = niceMax(max);
  const W = 760, H = 260, padL = 60, padB = 30, padT = 26;
  const bw = (W - padL) / series.length;
  const ticks = [0, nice / 2, nice];
  const labelEvery = Math.ceil(series.length / 8);

  return (
    <div className="bars">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Revenue per day from ${from} to ${to}`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => {
          const y = padT + (H - padB - padT) * (1 - t / nice);
          return (
            <g key={t}>
              <line x1={padL} x2={W} y1={y} y2={y} className="bars__grid" />
              <text x={padL - 10} y={y + 4} textAnchor="end" className="bars__tick">{shortINR(t)}</text>
            </g>
          );
        })}
        {series.map((d, i) => {
          const h = ((H - padB - padT) * d.revenue) / nice;
          const w = Math.max(1, Math.min(bw - 2, 44));
          const x = padL + i * bw + (bw - w) / 2;
          const y = H - padB - h;
          const r = Math.min(4, w / 2, h);
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * bw} y={padT} width={bw} height={H - padB - padT} fill="transparent" />
              {h > 0 && d.revenue === max && series.length <= 31 && (
                <text x={x + w / 2} y={y - 8} textAnchor="middle" className="bars__value">{shortINR(d.revenue)}</text>
              )}
              {h > 0 && (
                <path
                  className={`bars__bar ${hover === i ? "is-hover" : ""} ${d.revenue === max ? "is-best" : ""}`}
                  d={`M${x},${H - padB} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${H - padB} Z`}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={padL + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="bars__tick">
                  {d.date.slice(8)}/{d.date.slice(5, 7)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={W} y1={H - padB} y2={H - padB} className="bars__axis" />
      </svg>
      {hover !== null && (
        <div className="bars__tip" style={{ left: `${((padL + hover * bw + bw / 2) / W) * 100}%` }}>
          <b>{formatINR(series[hover].revenue)}</b>
          <span>{formatDate(series[hover].date + "T06:30:00Z")}</span>
        </div>
      )}
      <details className="bars__table">
        <summary>Show as table</summary>
        <table>
          <thead><tr><th>Date</th><th>Delivered revenue</th></tr></thead>
          <tbody>{series.map((d) => <tr key={d.date}><td>{d.date}</td><td>{formatINR(d.revenue)}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
function shortINR(v) {
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(v % 1e5 ? 1 : 0)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
  return `₹${v}`;
}

function AnalyticsTile({ id, kind, title, render, soon }) {
  const q = useQuery({ queryKey: ["analytics", id, kind], queryFn: () => analyticsApi.restaurant(id, kind), staleTime: 5 * 60_000 });
  return (
    <div className="dash-card dash-card--tile" title={`GET /api/analytics/restaurants/:id/${kind}`}>
      <h3 className="display">{title}</h3>
      {q.isLoading && <Skeleton h={60} />}
      {q.error && (q.error.status === 501 ? <p className="tile-soon"><span className="tile-soon__tag">Coming soon</span>{soon}</p> : <ErrorState error={q.error} compact />)}
      {q.data && render(q.data)}
    </div>
  );
}

export default function Dashboard() {
  const { id } = useParams();
  const [range, setRange] = useState(7);
  const [anchor, setAnchor] = useState("auto"); // "auto" | "today"
  // Seeded data stops at the seed date, so "last 7 days from today" is often empty.
  // The newest delivered order tells us where the data really ends.
  const latest = useQuery({
    queryKey: ["latest-delivered", id],
    queryFn: () => ordersApi.forRestaurant(id, { status: "delivered", page: 1, limit: 1 }),
    staleTime: 5 * 60_000,
  });
  const today = istDate();
  const latestDay = latest.data?.orders?.[0] ? istDate(new Date(latest.data.orders[0].createdAt)) : null;
  const to = anchor === "auto" && latestDay && latestDay < today ? latestDay : today;
  const from = shiftDays(to, -(range - 1));
  const anchored = to !== today;
  const rev = useQuery({
    queryKey: ["revenue", id, from, to],
    queryFn: () => analyticsApi.revenue(id, { from, to: to + "T23:59:59+05:30" }),
    enabled: anchor === "today" || !latest.isLoading,
  });
  const top = useQuery({ queryKey: ["top-customers", id], queryFn: () => analyticsApi.topCustomers(id, { limit: 3 }) });

  const days = rev.data?.days || [];
  const best = days.reduce((b, d) => (!b || d.revenue > b.revenue ? d : b), null);
  const avg = days.length ? Math.round(rev.data.totalRevenue / range) : 0;

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h2 className="display">Delivered revenue</h2>
          <p className="muted">
            Only delivered orders count. Days run on India time.
            {anchored && (
              <>
                {" "}Showing the {range} days up to your latest delivery.{" "}
                <button className="link-btn" onClick={() => setAnchor("today")}>Use today instead</button>
              </>
            )}
            {anchor === "today" && latestDay && latestDay < today && (
              <>
                {" "}
                <button className="link-btn" onClick={() => setAnchor("auto")}>Jump to latest data</button>
              </>
            )}
          </p>
        </div>
        <div className="seg" role="radiogroup" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r.days} role="radio" aria-checked={range === r.days} className={range === r.days ? "is-active" : ""} onClick={() => setRange(r.days)}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="dash__stats">
        <div className="stat stat--orange">
          <span>Revenue, {range} days{anchored ? ` to ${formatDate(to + "T06:30:00Z")}` : ""}</span>
          <b className="display">{rev.data ? formatINR(rev.data.totalRevenue) : "…"}</b>
        </div>
        <div className="stat stat--green">
          <span>Average per day</span>
          <b className="display">{rev.data ? formatINR(avg) : "…"}</b>
        </div>
        <div className="stat stat--yellow">
          <span>Best day</span>
          <b className="display">{best ? formatINR(best.revenue) : rev.data ? "None yet" : "…"}</b>
          {best && <small>{formatDate(best.date + "T06:30:00Z")}</small>}
        </div>
      </div>

      <div className="dash__grid">
        <div className="dash-card dash-card--chart">
          <div className="dash-card__head">
            <h3 className="display">Revenue per day</h3>
            <span className="muted small">{formatDate(from + "T06:30:00Z")} to {formatDate(to + "T06:30:00Z")}</span>
          </div>
          {(rev.isLoading || (anchor === "auto" && latest.isLoading)) && <SlowLoader label="Adding up delivered orders" />}
          {rev.error && <ErrorState error={rev.error} onRetry={rev.refetch} />}
          {rev.data && !(anchor === "auto" && latest.isLoading) && (days.length ? <RevenueBars days={days} from={from} to={to} /> : <p className="muted">No delivered orders in this range.</p>)}
        </div>

        <div className="dash-card dash-card--green">
          <div className="dash-card__head">
            <h3 className="display">Top customers</h3>
            <Starburst size={64} color="var(--yellow)" rotate={14}>VIP</Starburst>
          </div>
          {top.isLoading && <SlowLoader label="Ranking customers" />}
          {top.error && <ErrorState error={top.error} compact />}
          {top.data && (
            <ul className="vip-list">
              {top.data.customers.map((c) => (
                <li key={c.customerId}>
                  <span className="vip-list__avatar">{(c.name || "?").slice(0, 1)}</span>
                  <span className="vip-list__who">
                    <b>{c.name || "Unknown customer"}</b>
                    <small>{formatNum(c.orders)} orders · avg {formatINR(Math.round(c.totalSpent / c.orders))}</small>
                  </span>
                  <b className="vip-list__spent">{formatINR(c.totalSpent)}</b>
                </li>
              ))}
              {!top.data.customers.length && <li className="muted">No delivered orders yet.</li>}
            </ul>
          )}
          <Scribble arrow="down-left" className="vip-scribble">say thanks!</Scribble>
        </div>
      </div>

      <div className="dash__more-head">
        <h2 className="display dash__more">More insights</h2>
        <Starburst size={78} color="var(--orange)" ink="var(--cream)" rotate={-8}>On the stove</Starburst>
      </div>
      <div className="dash__tiles">
        <AnalyticsTile id={id} kind="top-dishes" title="Top dishes" soon="Your best sellers, ranked by plates sold." render={(d) => (
          <ol className="mini-list">{d.dishes.map((x) => <li key={x.menuItemId}><span>{x.name}</span><b>{formatNum(x.quantitySold)} sold</b></li>)}</ol>
        )} />
        <AnalyticsTile id={id} kind="peak-hours" title="Peak hours" soon="When the orders rush in, hour by hour." render={(d) => {
          const m = Math.max(1, ...d.hours.map((h) => h.orders));
          return <div className="mini-bars">{d.hours.map((h) => <span key={h.hour} title={`${h.hour}:00 · ${h.orders} orders`} style={{ height: `${(h.orders / m) * 100}%` }} className={h.hour === d.peakHour ? "is-peak" : ""} />)}</div>;
        }} />
        <AnalyticsTile id={id} kind="status-breakdown" title="Order outcomes" soon="How many orders get delivered or cancelled." render={(d) => (
          <ul className="mini-list">{d.statuses.map((s) => <li key={s.status}><span>{s.status}</span><b>{s.percentage}%</b></li>)}</ul>
        )} />
        <AnalyticsTile id={id} kind="ratings" title="Ratings" soon="Your average stars and the latest reviews." render={(d) => (
          <div className="mini-rating"><b className="display">{d.averageRating?.toFixed?.(1)}</b><Stars value={Math.round(d.averageRating)} /><small>{formatNum(d.totalReviews)} reviews</small></div>
        )} />
      </div>
    </div>
  );
}
