import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { CITY_NAMES } from "../lib/constants";
import { Logo } from "../components/Layout";
import { Checker, Scribble, Starburst } from "../components/Decor";
import { Spinner } from "../components/States";

function AuthShell({ title, kicker, sub, children, art = "/food/biryani.jpg" }) {
  return (
    <div className="auth">
      <div className="auth__art">
        <div className="auth__art-top">
          <Logo light />
        </div>
        <h2 className="display auth__shout">
          Good food.
          <br />
          Good mood.
        </h2>
        <div className="auth__plate">
          <img src={art} alt="" />
          <Starburst className="auth__burst" size={118} color="var(--yellow)" rotate={-12}>
            <b>Hot</b> &amp; fresh
          </Starburst>
        </div>
        <Scribble className="auth__scribble" arrow="down-left">
          your table
          <br />
          is waiting
        </Scribble>
        <Checker color="var(--orange-deep)" size={20} className="auth__checker" />
      </div>
      <div className="auth__panel">
        <div className="auth__form-wrap">
          <p className="hand auth__kicker">{kicker}</p>
          <h1 className="display auth__title">{title}</h1>
          {sub && <p className="auth__sub">{sub}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

function useRedirect() {
  const loc = useLocation();
  return (user) => loc.state?.from || (user.role === "owner" ? "/owner" : "/");
}

export function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const target = useRedirect();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={target(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await login(form);
      nav(target(u), { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const demo = (email) => setForm({ email, password: "password123" });

  return (
    <AuthShell title="Welcome back" kicker="hungry again?" sub="Log in to order from kitchens across 8 cities, or to run your own.">
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {err && <p className="form__error" role="alert">{err}</p>}
        <button className="btn btn--orange btn--block" disabled={busy}>{busy ? <><Spinner size={18} /> Logging in</> : "Log in"}</button>
      </form>
      <div className="demo-box">
        <span><b>Just looking?</b> Fill in a demo account</span>
        <div>
          <button className="btn btn--sm demo-btn demo-btn--eat" type="button" onClick={() => demo("customer@foodhub.com")}>I'm eating</button>
          <button className="btn btn--sm demo-btn demo-btn--cook" type="button" onClick={() => demo("owner@foodhub.com")}>I'm cooking</button>
        </div>
      </div>
      <p className="auth__switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer", city: "Bhopal" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.role === "owner" ? "/owner" : "/"} replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (form.password.length < 6) return setErr("Password needs at least 6 characters.");
    setBusy(true);
    try {
      const u = await register(form);
      nav(u.role === "owner" ? "/owner" : "/", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Join FoodHub" kicker="pull up a chair" sub="Eat from kitchens across 8 cities, or put yours on the map." art="/food/pizza.jpg">
      <form className="form" onSubmit={submit}>
        <div className="seg seg--big" role="radiogroup" aria-label="I want to">
          <button type="button" role="radio" aria-checked={form.role === "customer"} className={form.role === "customer" ? "is-active" : ""} onClick={() => setForm({ ...form, role: "customer" })}>I want to eat</button>
          <button type="button" role="radio" aria-checked={form.role === "owner"} className={form.role === "owner" ? "is-active" : ""} onClick={() => setForm({ ...form, role: "owner" })}>I run a kitchen</button>
        </div>
        <label className="field">
          <span>Name</span>
          <input required autoComplete="name" value={form.name} onChange={set("name")} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Password</span>
            <input type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={set("password")} />
          </label>
          <label className="field">
            <span>City</span>
            <select value={form.city} onChange={set("city")}>
              {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        {err && <p className="form__error" role="alert">{err}</p>}
        <button className="btn btn--orange btn--block" disabled={busy}>{busy ? <><Spinner size={18} /> Creating account</> : "Create account"}</button>
      </form>
      <p className="auth__switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
