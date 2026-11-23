import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { ordersApi, reviewsApi } from "../api/endpoints";
import { formatDateTime, formatINR, PAYMENT_LABEL, photoFor, STATUS_LABEL } from "../lib/constants";
import { Scribble, Stars } from "../components/Decor";
import Modal from "../components/Modal";
import { ErrorState, SlowLoader, Spinner } from "../components/States";
import { toast } from "../components/toast";

// The API can't tell us if an order was reviewed, so remember 201/409 answers locally.
const REVIEWED_KEY = "foodhub.reviewed.v1";
function loadReviewed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(REVIEWED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveReviewed(set) {
  try {
    localStorage.setItem(REVIEWED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

const STEPS = ["placed", "preparing", "delivered"];

function Progress({ status }) {
  if (status === "cancelled") return <div className="progress progress--cancelled">This order was cancelled by the kitchen.</div>;
  if (status === "delivered") return null;
  const at = STEPS.indexOf(status);
  return (
    <ol className="progress" aria-label={`Status: ${STATUS_LABEL[status]}`}>
      {STEPS.map((s, i) => (
        <li key={s} className={i <= at ? "is-done" : ""}>
          <span className="progress__dot" />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}

function RateModal({ order, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const m = useMutation({
    mutationFn: () => reviewsApi.create({ orderId: order._id, rating, comment: comment.trim() }),
    onSuccess: () => {
      toast("Thanks! Your review is live.");
      onDone(order._id);
    },
    onError: (e) => {
      if (e.status === 409) {
        toast("You already reviewed this order.");
        onDone(order._id);
      }
    },
  });
  return (
    <Modal open onClose={onClose} title="Rate your order">
      <form
        className="rate-form"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <p className="modal__text">
          How was <b>{order.restaurant?.name}</b>?
        </p>
        <Stars value={rating} onChange={setRating} size={36} />
        <label className="field">
          <span>Tell them more (optional)</span>
          <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder="The biryani was spot on, the raita could be colder…" />
        </label>
        {m.error && m.error.status !== 409 && <ErrorState error={m.error} compact />}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Later</button>
          <button className="btn btn--orange" disabled={m.isPending}>{m.isPending ? <><Spinner size={16} /> Sending</> : "Post review"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Orders() {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(null);
  const [reviewed, setReviewed] = useState(loadReviewed);
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["my-orders", page],
    queryFn: () => ordersApi.mine({ page, limit: 10 }),
    placeholderData: keepPreviousData,
    // Poll only while something is still on its way.
    refetchInterval: (q) => (q.state.data?.orders?.some((o) => o.status === "placed" || o.status === "preparing") ? 30_000 : false),
  });

  const markReviewed = (id) => {
    const next = new Set(reviewed);
    next.add(id);
    setReviewed(next);
    saveReviewed(next);
    setRating(null);
  };

  return (
    <section className="orders wrap">
      <div className="orders__head">
        <h1 className="display">My orders</h1>
        <Scribble arrow="down-right" className="orders__scribble">hot off the pan</Scribble>
        {data && <span className="muted">{data.total} orders so far</span>}
      </div>
      {isLoading && <SlowLoader label="Fetching your orders" hint="The orders collection has millions of rows and no index on customer yet, so this can take a minute or more." />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && !data.orders.length && (
        <div className="empty">
          <strong>No orders yet</strong>
          <p>Your first one is a few taps away.</p>
          <Link to="/" className="btn btn--orange">Find food</Link>
        </div>
      )}
      <div className={`orders__list ${isFetching && !isLoading ? "is-dim" : ""}`}>
        {data?.orders.map((o) => {
          const r = o.restaurant || {};
          const done = reviewed.has(o._id);
          return (
            <article key={o._id} className={`order-card order-card--${o.status}`}>
              <Link to={r._id ? `/r/${r._id}` : "#"} className="order-card__media">
                <span className={`sticker sticker--${o.status} order-card__stamp`}>{STATUS_LABEL[o.status]}</span>
                <img src={photoFor(r, o.items.map((i) => i.name).join(" "))} alt="" loading="lazy" />
              </Link>
              <div className="order-card__body">
                <header>
                  <div className="order-card__title">
                    <h2 className="display">{r.name || "Restaurant"}</h2>
                    <p className="muted">{[r.area, r.city].filter(Boolean).join(", ")} · <span className="nowrap">{formatDateTime(o.createdAt)}</span></p>
                  </div>
                </header>
                <p className="order-card__items">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</p>
                <Progress status={o.status} />
                <footer>
                  <span>
                    <b>{formatINR(o.totalAmount)}</b> · {PAYMENT_LABEL[o.paymentMethod]}
                  </span>
                  {o.status === "delivered" &&
                    (done ? (
                      <span className="pill pill--green">Reviewed</span>
                    ) : (
                      <button className="btn btn--sm btn--ghost" onClick={() => setRating(o)}>Rate order</button>
                    ))}
                </footer>
              </div>
            </article>
          );
        })}
      </div>
      {data?.totalPages > 1 && (
        <div className="pager">
          <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
          <span className="pager__info">Page <b>{page}</b> of {data.totalPages}</span>
          <button className="btn btn--ink btn--sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Older</button>
        </div>
      )}
      {rating && <RateModal order={rating} onClose={() => setRating(null)} onDone={markReviewed} />}
    </section>
  );
}
