import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, restaurantsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../cart/CartContext";
import { formatINR, PAYMENT_LABEL, photoFor } from "../lib/constants";
import { Checker, Scribble, Starburst, VegMark } from "../components/Decor";
import { IconMinus, IconPlus, IconTrash } from "../components/Icons";
import { Empty, ErrorState, Spinner } from "../components/States";

const PAY = [
  { id: "upi", label: "UPI", text: "Pay with any UPI app" },
  { id: "card", label: "Card", text: "Debit or credit card" },
  { id: "cod", label: "Cash", text: "Pay when it arrives" },
];

function Placed({ order, restaurant }) {
  return (
    <section className="placed wrap">
      <div className="placed__card">
        <Starburst size={150} color="var(--yellow)" rotate={-8}>
          <b>Order</b> placed!
        </Starburst>
        <h1 className="display">It's cooking soon</h1>
        <p>
          <b>{restaurant?.name}</b> got your order. The kitchen confirmed the total at <b>{formatINR(order.totalAmount)}</b>, paid by {PAYMENT_LABEL[order.paymentMethod]}.
        </p>
        <ul className="placed__items">
          {order.items.map((i) => (
            <li key={i.menuItem}>
              <span>{i.quantity} × {i.name}</span>
              <b>{formatINR(i.price * i.quantity)}</b>
            </li>
          ))}
        </ul>
        <div className="placed__actions">
          <Link to="/orders" className="btn btn--orange">Track my order</Link>
          <Link to="/" className="btn btn--ghost">Keep browsing</Link>
        </div>
      </div>
    </section>
  );
}

export default function Checkout() {
  const { cart, subtotal, setQty, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [pay, setPay] = useState("upi");
  const [placed, setPlaced] = useState(null);

  // Re-check the restaurant: it may have closed since the item went into the bag.
  const rq = useQuery({ queryKey: ["restaurant", cart.restaurant?._id], queryFn: () => restaurantsApi.get(cart.restaurant._id), enabled: !!cart.restaurant });
  const live = rq.data?.restaurant;

  const place = useMutation({
    mutationFn: () =>
      ordersApi.create({
        restaurantId: cart.restaurant._id,
        paymentMethod: pay,
        items: cart.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      }),
    onSuccess: ({ order }) => {
      setPlaced({ order, restaurant: cart.restaurant });
      clear();
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });

  if (placed) return <Placed {...placed} />;
  if (!cart.items.length)
    return (
      <section className="wrap section">
        <Empty title="Your bag is empty" text="Find a kitchen you like and add a few things." action={{ to: "/", label: "Browse kitchens" }} />
      </section>
    );

  const closed = live && !live.isOpen;
  const needLogin = !user;
  const wrongRole = user && user.role !== "customer";

  return (
    <section className="checkout wrap">
      <div className="checkout__head">
        <h1 className="display">Your bag</h1>
        <Scribble arrow="down-right" className="checkout__scribble">almost there!</Scribble>
      </div>
      <div className="checkout__grid">
        <div className="checkout__main">
          <Link to={`/r/${cart.restaurant._id}`} className="checkout__rest">
            <img src={photoFor(cart.restaurant)} alt="" />
            <span>
              <small>Ordering from</small>
              <b className="display">{cart.restaurant.name}</b>
              <em>{[cart.restaurant.area, cart.restaurant.city].filter(Boolean).join(", ")}</em>
            </span>
          </Link>
          <ul className="checkout__items">
            {cart.items.map((i) => (
              <li key={i.menuItemId}>
                <VegMark veg={i.isVeg} />
                <span className="checkout__name">
                  <b>{i.name}</b>
                  <small>{formatINR(i.price)} each</small>
                </span>
                <span className="qty">
                  <button onClick={() => setQty(i.menuItemId, i.quantity - 1)} aria-label="Remove one"><IconMinus width={14} height={14} /></button>
                  <b>{i.quantity}</b>
                  <button onClick={() => setQty(i.menuItemId, i.quantity + 1)} disabled={i.quantity >= 20} aria-label="Add one"><IconPlus width={14} height={14} /></button>
                </span>
                <span className="checkout__line">{formatINR(i.price * i.quantity)}</span>
                <button className="icon-btn" onClick={() => setQty(i.menuItemId, 0)} aria-label={`Remove ${i.name}`}><IconTrash width={18} height={18} /></button>
              </li>
            ))}
          </ul>

          <h2 className="display checkout__sub">How will you pay?</h2>
          <div className="pay-options" role="radiogroup" aria-label="Payment method">
            {PAY.map((p) => (
              <button key={p.id} role="radio" aria-checked={pay === p.id} className={`pay-option ${pay === p.id ? "is-active" : ""}`} onClick={() => setPay(p.id)}>
                <b className="display">{p.label}</b>
                <span>{p.text}</span>
              </button>
            ))}
          </div>
          <p className="muted small">No real payment happens here. The method is saved on the order as a label.</p>
        </div>

        <aside className="checkout__summary">
          <div className="summary-box">
            <h3 className="display">Bill</h3>
            <div className="summary-row"><span>Items ({cart.items.reduce((s, i) => s + i.quantity, 0)})</span><b>{formatINR(subtotal)}</b></div>
            <div className="summary-row"><span>Delivery</span><b>Free</b></div>
            <div className="summary-row summary-row--total"><span>To pay</span><b>{formatINR(subtotal)}</b></div>
            {place.error && <ErrorState error={place.error} compact />}
            {closed && <p className="notice notice--warn">{live.name} just closed. Try again later or pick another kitchen.</p>}
            {needLogin ? (
              <button className="btn btn--orange btn--block" onClick={() => nav("/login", { state: { from: "/checkout" } })}>Log in to order</button>
            ) : wrongRole ? (
              <p className="notice">Owners can't place orders. Log in with a customer account.</p>
            ) : (
              <button className="btn btn--orange btn--block" disabled={place.isPending || closed} onClick={() => place.mutate()}>
                {place.isPending ? <><Spinner size={18} /> Placing order</> : `Place order · ${formatINR(subtotal)}`}
              </button>
            )}
            <button className="link-btn summary-box__clear" onClick={clear}>Empty bag</button>
          </div>
          <Checker color="var(--orange)" size={16} className="summary-checker" />
        </aside>
      </div>
    </section>
  );
}
