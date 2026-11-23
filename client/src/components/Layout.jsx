import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../cart/CartContext";
import { Checker, Eyes, Sparkle } from "./Decor";
import { IconBag, IconLogout, IconUser } from "./Icons";
import Modal from "./Modal";
import { onToast } from "./toast";

export function Logo({ light = false }) {
  return (
    <Link to="/" className={`logo ${light ? "logo--light" : ""}`} aria-label="FoodHub home">
      <span className="logo__mark">F</span>
      <span className="logo__word">FoodHub</span>
    </Link>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setMenuOpen(false);
  }, [loc.pathname]);

  return (
    <header className="site-header">
      <div className="site-header__inner wrap">
        <nav className="site-nav site-nav--left" aria-label="Primary">
          <NavLink to="/" end>Restaurants</NavLink>
          {user?.role === "customer" && <NavLink to="/orders">My orders</NavLink>}
          {user?.role === "owner" && <NavLink to="/owner">My kitchens</NavLink>}
        </nav>
        <Logo />
        <div className="site-nav site-nav--right">
          {user === undefined ? null : user ? (
            <div className="account">
              <button className="account__btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                <IconUser />
                <span>{user.name.split(" ")[0]}</span>
              </button>
              {menuOpen && (
                <div className="account__menu">
                  <p className="account__who">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <span className="pill pill--tiny">{user.role}{user.city ? ` · ${user.city}` : ""}</span>
                  </p>
                  {user.role === "customer" && <Link to="/orders">My orders</Link>}
                  {user.role === "owner" && <Link to="/owner">My kitchens</Link>}
                  <button
                    onClick={async () => {
                      await logout();
                      nav("/");
                    }}
                  >
                    <IconLogout /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-link">Log in</Link>
          )}
          {user?.role !== "owner" && (
            <Link to="/checkout" className="bag-btn" aria-label={`Bag, ${count} items`}>
              <IconBag />
              {count > 0 && <span className="bag-btn__count">{count}</span>}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Checker color="var(--ink)" size={18} className="site-footer__checker" />
      <div className="site-footer__body wrap">
        <div className="site-footer__brand">
          <Logo light />
          <p className="hand">eat. order. repeat.</p>
        </div>
        <div className="site-footer__big display">
          Good food
          <br />
          good mood
          <Sparkle className="site-footer__sparkle" color="var(--yellow)" />
        </div>
        <div className="site-footer__cols">
          <div>
            <h4>Eat</h4>
            <Link to="/">Restaurants</Link>
            <Link to="/orders">My orders</Link>
            <Link to="/checkout">Bag</Link>
          </div>
          <div>
            <h4>Cook</h4>
            <Link to="/owner">My kitchens</Link>
            <Link to="/owner/new">Open a kitchen</Link>
            <Link to="/register">Join FoodHub</Link>
          </div>
        </div>
        <Eyes className="site-footer__eyes" />
      </div>
      <div className="site-footer__legal wrap">
        <span>FoodHub, a teaching project on MongoDB aggregation.</span>
        <span>Food photos from Unsplash, see CREDITS.md.</span>
      </div>
    </footer>
  );
}

function CartConflict() {
  const { conflict, resolveConflict, cart } = useCart();
  return (
    <Modal open={!!conflict} onClose={() => resolveConflict(false)} title="Start a new bag?">
      <p className="modal__text">
        Your bag has food from <strong>{cart.restaurant?.name}</strong>. One order can only come from one kitchen. Empty it and add{" "}
        <strong>{conflict?.item.name}</strong> from <strong>{conflict?.restaurant.name}</strong>?
      </p>
      <div className="modal__actions">
        <button className="btn btn--ghost" onClick={() => resolveConflict(false)}>
          Keep my bag
        </button>
        <button className="btn btn--orange" onClick={() => resolveConflict(true)}>
          Start fresh
        </button>
      </div>
    </Modal>
  );
}

function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(
    () =>
      onToast((t) => {
        setItems((xs) => [...xs, t]);
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 2600);
      }),
    [],
  );
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
      <CartConflict />
      <Toasts />
    </div>
  );
}
