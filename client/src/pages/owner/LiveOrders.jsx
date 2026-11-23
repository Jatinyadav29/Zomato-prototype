import { useState } from "react";
import { useParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../../api/endpoints";
import { ACTION_LABEL, formatDateTime, timeAgo, formatINR, NEXT_STATUSES, PAYMENT_LABEL, STATUS_LABEL } from "../../lib/constants";
import { ErrorState, SlowLoader, Spinner } from "../../components/States";
import { toast } from "../../components/toast";

const SLOW_HINT = "Orders are filtered and sorted over a 10 million row collection, so each refresh takes a few seconds.";

function OrderTicket({ order, restaurantId }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (status) => ordersApi.setStatus(order._id, status),
    onSuccess: ({ order: o }) => {
      toast(`Order moved to ${STATUS_LABEL[o.status]}`);
      qc.invalidateQueries({ queryKey: ["owner-orders", restaurantId] });
    },
    onError: (e) => toast(e.message, "red"),
  });
  const next = NEXT_STATUSES[order.status];
  return (
    <article className={`ticket ticket--${order.status}`}>
      <header>
        <b>{order.customer?.name || "Customer"}</b>
        <span className={`ticket__age ${Date.now() - new Date(order.createdAt) > 3600e3 ? "is-late" : ""}`} title={formatDateTime(order.createdAt)}>
          {timeAgo(order.createdAt)}
        </span>
      </header>
      <ul>
        {order.items.map((i, idx) => (
          <li key={idx}>
            <span>{i.quantity}×</span> {i.name}
          </li>
        ))}
      </ul>
      <footer>
        <span className="ticket__meta">
          <span>
            <b>{formatINR(order.totalAmount)}</b> · {PAYMENT_LABEL[order.paymentMethod]}
          </span>
        </span>
        {next.length > 0 && (
          <div className="ticket__actions">
            {next.map((s) => (
              <button key={s} className={`btn btn--sm ${s === "cancelled" ? "btn--ghost" : "btn--orange"}`} disabled={m.isPending} onClick={() => m.mutate(s)}>
                {m.isPending && m.variables === s ? <Spinner size={14} /> : null}
                {ACTION_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </footer>
    </article>
  );
}

function Column({ id, status, title, note }) {
  const q = useQuery({
    queryKey: ["owner-orders", id, status, 1],
    queryFn: () => ordersApi.forRestaurant(id, { status, page: 1, limit: 6 }),
    refetchInterval: 30_000,
  });
  return (
    <section className={`lane lane--${status}`}>
      <header className="lane__head">
        <h3 className="display">{title}</h3>
        <span className="lane__count">{q.data ? formatNumSafe(q.data.total) : "…"}</span>
        {q.isFetching && !q.isLoading && <Spinner size={16} />}
      </header>
      <p className="lane__note">{note}</p>
      {q.isLoading && <SlowLoader label="Loading tickets" hint={SLOW_HINT} />}
      {q.error && <ErrorState error={q.error} onRetry={q.refetch} compact />}
      <div className="lane__list">
        {q.data?.orders.map((o) => <OrderTicket key={o._id} order={o} restaurantId={id} />)}
        {q.data && !q.data.orders.length && <p className="lane__empty">All clear here.</p>}
      </div>
      {q.data?.total > 6 && <p className="lane__more">+{formatNumSafe(q.data.total - 6)} more waiting. The newest 6 are shown; see the rest in the history below.</p>}
    </section>
  );
}
const formatNumSafe = (n) => new Intl.NumberFormat("en-IN").format(n);

function History({ id }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["owner-orders", id, status || "all", page],
    queryFn: () => ordersApi.forRestaurant(id, { status: status || undefined, page, limit: 15 }),
    placeholderData: keepPreviousData,
  });
  return (
    <section className="history">
      <div className="history__head">
        <h2 className="display">Order history</h2>
        <div className="seg" role="radiogroup" aria-label="Status">
          {["", "placed", "preparing", "delivered", "cancelled"].map((s) => (
            <button key={s || "all"} role="radio" aria-checked={status === s} className={status === s ? "is-active" : ""} onClick={() => { setStatus(s); setPage(1); }}>
              {s ? STATUS_LABEL[s] : "All"}
            </button>
          ))}
        </div>
      </div>
      {q.isLoading && <SlowLoader label="Loading order history" hint={SLOW_HINT} />}
      {q.error && <ErrorState error={q.error} onRetry={q.refetch} />}
      {q.data && (
        <div className={`table-wrap ${q.isFetching ? "is-dim" : ""}`}>
          <table className="table">
            <thead>
              <tr><th>When</th><th>Customer</th><th>Items</th><th>Payment</th><th className="num">Total</th><th>Status</th><th>Next step</th></tr>
            </thead>
            <tbody>
              {q.data.orders.map((o) => (
                <HistoryRow key={o._id} o={o} id={id} />
              ))}
            </tbody>
          </table>
          {!q.data.orders.length && <p className="muted center">No orders with this status.</p>}
        </div>
      )}
      {q.data?.totalPages > 1 && (
        <div className="pager">
          <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
          <span className="pager__info">Page <b>{page}</b> of {formatNumSafe(q.data.totalPages)}</span>
          <button className="btn btn--ink btn--sm" disabled={page >= q.data.totalPages} onClick={() => setPage((p) => p + 1)}>Older</button>
        </div>
      )}
    </section>
  );
}

function HistoryRow({ o, id }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (s) => ordersApi.setStatus(o._id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner-orders", id] }),
    onError: (e) => toast(e.message, "red"),
  });
  return (
    <tr>
      <td>{formatDateTime(o.createdAt)}</td>
      <td>{o.customer?.name}</td>
      <td className="table__items">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
      <td>{PAYMENT_LABEL[o.paymentMethod]}</td>
      <td className="num"><b>{formatINR(o.totalAmount)}</b></td>
      <td><span className={`sticker sticker--${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
      <td className="table__actions">
        {NEXT_STATUSES[o.status].map((s) => (
          <button key={s} className={`btn btn--sm ${s === "cancelled" ? "btn--ghost" : "btn--orange"} table__btn`} disabled={m.isPending} onClick={() => m.mutate(s)}>{ACTION_LABEL[s]}</button>
        ))}
      </td>
    </tr>
  );
}

export default function LiveOrders() {
  const { id } = useParams();
  return (
    <div className="live">
      <div className="live__head">
        <h2 className="display">Live orders</h2>
        <p className="muted">Refreshes every 30 seconds. Move tickets forward as the food gets ready.</p>
      </div>
      <div className="lanes">
        <Column id={id} status="placed" title="New" note="Just placed. Start cooking or cancel." />
        <Column id={id} status="preparing" title="On the stove" note="Cooking now. Mark delivered when it's out." />
      </div>
      <History id={id} />
    </div>
  );
}
