import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuApi, ordersApi, restaurantsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../cart/CartContext";
import { CUISINE_PHOTOS, formatINR, guessCuisine, PAYMENT_LABEL, photoFor } from "../lib/constants";
import { Scribble, Starburst, VegMark } from "../components/Decor";
import { IconMinus, IconPlus, IconTrash } from "../components/Icons";
import { toast } from "../components/toast";
import { Empty, ErrorState, Spinner } from "../components/States";

const PAY = [
  { id: "upi", label: "UPI", text: "Pay with any UPI app" },
  { id: "card", label: "Card", text: "Debit or credit card" },
  { id: "cod", label: "Cash", text: "Pay when it arrives" },
];

function dishPhoto(text, restaurant) {
  const c = guessCuisine(text);
  return c ? CUISINE_PHOTOS[c][text.length % CUISINE_PHOTOS[c].length] : photoFor(restaurant);
}

const SIDE_CATEGORIES = ["Desserts", "Indian Sweets", "Beverages", "Ice Cream & Kulfi", "Breads", "Sides", "Bakes"];

function Extras({ restaurant }) {
  const { cart, addItem } = useCart();
  const q = useQuery({ queryKey: ["menu", restaurant._id, ""], queryFn: () => menuApi.list(restaurant._id) });
  const inBag = new Set(cart.items.map((i) => i.menuItemId));
  const pool = (q.data?.menuItems || []).filter((m) => m.isAvailable && !inBag.has(m._id));
  const picks = [...pool.filter((m) => SIDE_CATEGORIES.includes(m.category)), ...pool.filter((m) => !SIDE_CATEGORIES.includes(m.category))].slice(0, 4);
  if (!picks.length) return null;
  return (
    <section className="extras">
      <div className="extras__head">
        <h2 className="display">Forgot something?</h2>
        <span className="hand">sweet endings, cold drinks</span>
      </div>
      <div className="extras__grid">
        {picks.map((m) => {
          const c = guessCuisine(`${m.category} ${m.name}`);
          const img = c ? CUISINE_PHOTOS[c][m.name.length % CUISINE_PHOTOS[c].length] : photoFor(restaurant);
          return (
            <article key={m._id} className="extra">
              <img src={img} alt="" loading="lazy" />
              <div>
                <small>{m.category}</small>
                <b>{m.name}</b>
                <span>{formatINR(m.price)}</span>
              </div>
              <button className="add-btn" onClick={() => addItem(restaurant, m) && toast(`${m.name} added`)} aria-label={`Add ${m.name}`}>
                <IconPlus width={16} height={16} /> Add
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

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
                <img className="checkout__thumb" src={dishPhoto(i.name, cart.restaurant)} alt="" loading="lazy" />
                <span className="checkout__name">
                  <b>{i.name}</b>
                  <small><VegMark veg={i.isVeg} /> {formatINR(i.price)} each</small>
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
                {pay === p.id && <span className="pay-option__check" aria-hidden="true">✓</span>}
                <b className="display">{p.label}</b>
                <span>{p.text}</span>
              </button>
            ))}
          </div>
          <p className="muted small">No real payment happens here. The method is saved on the order as a label.</p>
          <Extras restaurant={cart.restaurant} />
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
          <div className="summary-note">
            <Starburst size={86} color="var(--orange)" ink="var(--cream)" rotate={-10}>
              Free
              <br />
              delivery
            </Starburst>
            <p>
              <b>Hot food, one kitchen, one trip.</b> The kitchen checks every price when you order, so the total after ordering is the real one.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
