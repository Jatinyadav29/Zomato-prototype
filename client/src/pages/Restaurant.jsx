import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { menuApi, restaurantsApi, reviewsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../cart/CartContext";
import { dishPhoto, formatDate, formatINR, photoFor } from "../lib/constants";
import { Checker, Eyes, Scribble, Sparkle, Stars, Starburst, VegMark } from "../components/Decor";
import { IconBack, IconMinus, IconPin, IconPlus } from "../components/Icons";
import { ErrorState, PageLoader, Skeleton } from "../components/States";
import { toast } from "../components/toast";

const CALLOUTS = ["chef's pick", "hot & tasty", "fresh daily", "made to order", "crowd fave", "worth it"];

function QtyControl({ qty, onAdd, onSet, disabled }) {
  if (!qty)
    return (
      <button className="add-btn" onClick={onAdd} disabled={disabled} aria-label="Add to bag">
        <IconPlus width={16} height={16} /> Add
      </button>
    );
  return (
    <span className="qty">
      <button onClick={() => onSet(qty - 1)} aria-label="Remove one">
        <IconMinus width={14} height={14} />
      </button>
      <b>{qty}</b>
      <button onClick={() => onSet(qty + 1)} disabled={qty >= 20} aria-label="Add one">
        <IconPlus width={14} height={14} />
      </button>
    </span>
  );
}

function photoForCategory(category, items, restaurant) {
  return dishPhoto(category, null) || dishPhoto(items.map((i) => i.name).join(" "), photoFor(restaurant));
}

function MenuBlock({ category, items, restaurant, index, canOrder, withPhoto }) {
  const { cart, addItem, setQty } = useCart();
  const qtyOf = (id) => (cart.restaurant?._id === restaurant._id ? cart.items.find((i) => i.menuItemId === id)?.quantity || 0 : 0);
  const tone = index % 3 === 1 ? "green" : "orange";
  return (
    <section className={`menu-block menu-block--${tone}`} id={`cat-${category.replace(/\W+/g, "-")}`}>
      <header className="menu-block__head">
        <h2 className="display">{category}</h2>
        {index % 2 === 0 && !withPhoto && <span className="hand menu-block__callout">{CALLOUTS[index % CALLOUTS.length]}</span>}
      </header>
      {withPhoto && (
        <div className="menu-block__photo" aria-hidden="true">
          <img src={photoForCategory(category, items, restaurant)} alt="" loading="lazy" />
          <span className="hand">{CALLOUTS[index % CALLOUTS.length]}</span>
        </div>
      )}
      <ul className="menu-list">
        {items.map((item) => (
          <li key={item._id} className={`menu-item ${item.isAvailable ? "" : "is-off"}`}>
            <VegMark veg={item.isVeg} />
            <div className="menu-item__name">
              <b>{item.name}</b>
              {!item.isAvailable && <small>Sold out for now</small>}
            </div>
            <span className="menu-item__dots" aria-hidden="true" />
            <span className="menu-item__price">{formatINR(item.price)}</span>
            {canOrder && (
              <QtyControl
                qty={qtyOf(item._id)}
                disabled={!item.isAvailable}
                onAdd={() => {
                  if (addItem(restaurant, item)) toast(`${item.name} added to your bag`);
                }}
                onSet={(q) => setQty(item._id, q)}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BagPanel({ restaurant, menu = [], canOrder }) {
  const { cart, subtotal, setQty, addItem } = useCart();
  const nav = useNavigate();
  const treat = menu.filter((m) => m.isAvailable).reduce((b, m) => (!b || m.price > b.price ? m : b), null);
  const mine = cart.restaurant?._id === restaurant._id;
  const items = mine ? cart.items : [];
  return (
    <aside className="bag-panel">
      <div className="bag-panel__box">
        <h3 className="display">Your bag</h3>
        {!items.length ? (
          <p className="bag-panel__empty">
            Nothing here yet. Tap <b>Add</b> on anything that looks good.
            {cart.items.length > 0 && !mine && (
              <>
                <br />
                <small>
                  You have a bag from <Link to={`/r/${cart.restaurant._id}`}>{cart.restaurant.name}</Link>.
                </small>
              </>
            )}
          </p>
        ) : (
          <>
            <ul className="bag-panel__items">
              {items.map((i) => (
                <li key={i.menuItemId}>
                  <span className="bag-panel__name">{i.name}</span>
                  <span className="qty qty--light">
                    <button onClick={() => setQty(i.menuItemId, i.quantity - 1)} aria-label={`Remove one ${i.name}`}>
                      <IconMinus width={12} height={12} />
                    </button>
                    <b>{i.quantity}</b>
                    <button onClick={() => setQty(i.menuItemId, i.quantity + 1)} disabled={i.quantity >= 20} aria-label={`Add one ${i.name}`}>
                      <IconPlus width={12} height={12} />
                    </button>
                  </span>
                  <span className="bag-panel__price">{formatINR(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="bag-panel__total">
              <span>Subtotal</span>
              <b>{formatINR(subtotal)}</b>
            </div>
            <button className="btn btn--orange btn--block" onClick={() => nav("/checkout")} disabled={!restaurant.isOpen}>
              {restaurant.isOpen ? "Go to checkout" : "Kitchen is closed"}
            </button>
          </>
        )}
      </div>
      {treat && (
        <div className="treat">
          <div className="treat__photo">
            <img src={dishPhoto(treat.name, null) || dishPhoto(treat.category, photoFor(restaurant))} alt="" loading="lazy" />
            <Starburst className="treat__burst" size={84} color="var(--yellow)" rotate={12}>
              Treat
              <br />
              yourself
            </Starburst>
          </div>
          <small>The big plate here</small>
          <b className="display">{treat.name}</b>
          <div className="treat__row">
            <span className="display">{formatINR(treat.price)}</span>
            {canOrder && (
              <button className="btn btn--sm btn--orange" onClick={() => addItem(restaurant, treat) && toast(`${treat.name} added to your bag`)}>
                <IconPlus width={16} height={16} /> Add
              </button>
            )}
          </div>
        </div>
      )}
      <div className="bag-panel__promise">
        <b className="display">Take away &amp; delivery</b>
        <p>Prices are checked by the kitchen when you order, so the total you see after ordering is the real one.</p>
      </div>
    </aside>
  );
}

function MobileBagBar({ restaurant }) {
  const { cart, count, subtotal } = useCart();
  if (cart.restaurant?._id !== restaurant._id || !count) return null;
  return (
    <Link to="/checkout" className="mobile-bag">
      <span>
        <b>{count} item{count > 1 ? "s" : ""}</b> · {formatINR(subtotal)}
      </span>
      <span className="mobile-bag__go">View bag</span>
    </Link>
  );
}

function Reviews({ id }) {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ["reviews", id, page],
    queryFn: () => reviewsApi.forRestaurant(id, { page, limit: 6 }),
    placeholderData: keepPreviousData,
  });
  return (
    <section className="reviews wrap">
      <div className="reviews__head">
        <h2 className="display">What people said</h2>
        {data && <span className="muted">{data.total} reviews</span>}
      </div>
      {error && <ErrorState error={error} compact />}
      <div className={`reviews__grid ${isFetching && !isLoading ? "is-dim" : ""}`}>
        {isLoading && Array.from({ length: 3 }, (_, i) => <div key={i} className="review"><Skeleton h={18} w="40%" /><Skeleton h={14} style={{ marginTop: 14 }} /><Skeleton h={14} w="80%" style={{ marginTop: 8 }} /></div>)}
        {data?.reviews.map((r) => (
          <article key={r._id} className="review">
            <Stars value={r.rating} />
            <p>{r.comment || <span className="muted">No words, just stars.</span>}</p>
            <footer>
              <b>{r.customer?.name || "A FoodHub eater"}</b>
              <span>{formatDate(r.createdAt)}</span>
            </footer>
          </article>
        ))}
      </div>
      {data && !data.reviews.length && <p className="muted">No reviews yet. Be the first after your order is delivered.</p>}
      {data?.totalPages > 1 && (
        <div className="pager">
          <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
          <span className="pager__info">Page <b>{page}</b> of {data.totalPages}</span>
          <button className="btn btn--ink btn--sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Older</button>
        </div>
      )}
    </section>
  );
}

export default function Restaurant() {
  const { id } = useParams();
  const { user } = useAuth();
  const [vegFilter, setVegFilter] = useState(""); // "", "true", "false"
  const rq = useQuery({ queryKey: ["restaurant", id], queryFn: () => restaurantsApi.get(id) });
  const mq = useQuery({
    queryKey: ["menu", id, vegFilter],
    queryFn: () => menuApi.list(id, { isVeg: vegFilter || undefined }),
    placeholderData: keepPreviousData,
  });

  const groups = useMemo(() => {
    const map = new Map();
    for (const item of mq.data?.menuItems || []) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    return [...map.entries()];
  }, [mq.data]);

  if (rq.isLoading) return <PageLoader label="Opening the menu" />;
  if (rq.error) return <div className="wrap section"><ErrorState error={rq.error} onRetry={rq.refetch} /></div>;
  const r = rq.data.restaurant;
  const canOrder = r.isOpen && user?.role !== "owner";
  const half = Math.ceil(groups.length / 2);

  return (
    <>
      <section className="r-hero">
        <div className="r-hero__inner wrap">
          <div className="r-hero__copy">
            <Link to={`/?city=${encodeURIComponent(r.city)}`} className="back-link">
              <IconBack width={18} height={18} /> All kitchens in {r.city}
            </Link>
            <h1 className="display r-hero__name">{r.name}</h1>
            <div className="r-hero__meta">
              <span className={`status-pill ${r.isOpen ? "status-pill--open" : "status-pill--closed"}`}>{r.isOpen ? "Open now" : "Closed"}</span>
              <span className="r-hero__where">
                <IconPin width={16} height={16} />
                {[r.area, r.city].filter(Boolean).join(", ")}
              </span>
            </div>
            <div className="r-hero__tags">
              {r.cuisines.map((c) => (
                <span key={c} className="tag">{c}</span>
              ))}
            </div>
            {r.owner?.name && <p className="r-hero__owner">Run by {r.owner.name}</p>}
            {!r.isOpen && <p className="notice notice--warn">This kitchen isn't taking orders right now. You can still browse the menu.</p>}
            {user?.role === "owner" && <p className="notice">You're logged in as an owner. Log in with a customer account to order.</p>}
          </div>
          <div className="r-hero__art" aria-hidden="true">
            <Checker className="r-hero__checker" color="var(--orange)" size={26} />
            <img src={photoFor(r)} alt="" className="r-hero__photo" />
            <Starburst className="r-hero__burst" color="var(--green)" ink="var(--cream)" size={112} rotate={12}>
              {mq.data ? (
                <>
                  <b>{mq.data.count}</b> dishes
                </>
              ) : (
                <>Fresh</>
              )}
            </Starburst>
            <Scribble className="r-hero__scribble" arrow="down-right">
              fresh
              <br />
              &amp; juicy
            </Scribble>
          </div>
        </div>
      </section>

      <div className="menu-toolbar">
        <div className="wrap menu-toolbar__inner">
          <nav className="menu-toolbar__cats" aria-label="Menu sections">
            {groups.map(([cat]) => (
              <a key={cat} href={`#cat-${cat.replace(/\W+/g, "-")}`}>{cat}</a>
            ))}
          </nav>
          <div className="seg" role="radiogroup" aria-label="Diet">
            {[["", "All"], ["true", "Veg"], ["false", "Non-veg"]].map(([v, label]) => (
              <button key={label} role="radio" aria-checked={vegFilter === v} className={vegFilter === v ? "is-active" : ""} onClick={() => setVegFilter(v)}>
                {v === "true" && <VegMark veg />}
                {v === "false" && <VegMark veg={false} />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="menu-poster wrap">
        <div className="menu-poster__main">
          <div className="menu-poster__title">
            <h2 className="display">Menu</h2>
            <div className="menu-poster__aside">
              <span>{r.cuisines.join(" / ")}</span>
              <Sparkle color="var(--orange)" />
            </div>
          </div>
          {mq.error && <ErrorState error={mq.error} onRetry={mq.refetch} />}
          {mq.isLoading ? (
            <div className="menu-cols">
              {[0, 1].map((c) => (
                <div key={c}>
                  <Skeleton h={54} w="60%" />
                  {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} h={20} style={{ marginTop: 18 }} />)}
                </div>
              ))}
            </div>
          ) : groups.length ? (
            <div className={`menu-cols ${mq.isFetching ? "is-dim" : ""}`}>
              <div>{groups.slice(0, half).map(([cat, items], i) => <MenuBlock key={cat} category={cat} items={items} restaurant={r} index={i * 2} canOrder={canOrder} withPhoto={i % 2 === 0} />)}</div>
              <div>{groups.slice(half).map(([cat, items], i) => <MenuBlock key={cat} category={cat} items={items} restaurant={r} index={i * 2 + 1} canOrder={canOrder} withPhoto={i % 2 === 1} />)}</div>
            </div>
          ) : (
            <p className="muted">No dishes match this filter.</p>
          )}
          <div className="menu-poster__foot" aria-hidden="true">
            <span className="display">Eat · Order · Repeat</span>
            <Eyes />
          </div>
        </div>
        <BagPanel restaurant={r} menu={mq.data?.menuItems} canOrder={canOrder} />
      </section>

      <Reviews id={id} />
      <MobileBagBar restaurant={r} />
    </>
  );
}
