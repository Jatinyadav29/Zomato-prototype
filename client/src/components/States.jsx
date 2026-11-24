import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Starburst } from "./Decor";

function useElapsed(active = true) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t0 = Date.now();
    const id = setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return s;
}

export function Spinner({ size = 28 }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 50 50" aria-hidden="true">
      <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="90 150" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader({ label = "Loading" }) {
  return (
    <div className="page-loader" role="status">
      <Spinner size={40} />
      <p>{label}</p>
    </div>
  );
}

// Some endpoints scan millions of documents (no indexes). Be honest about it.
export function SlowLoader({ label = "Loading", hint = "This query scans a big collection, so it can take a while." }) {
  const s = useElapsed();
  return (
    <div className="slow-loader" role="status">
      <Spinner />
      <div>
        <strong>{label}</strong>
        {s >= 3 && (
          <p>
            {s}s and counting. {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry, compact = false }) {
  if (error?.status === 501) return <ComingSoon compact={compact} />;
  return (
    <div className={`error-state ${compact ? "error-state--compact" : ""}`} role="alert">
      <strong>{error?.status === 404 ? "Not found" : "Something went wrong"}</strong>
      <p>{error?.message || "Unknown error"}</p>
      {onRetry && (
        <button className="btn btn--sm btn--ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function ComingSoon({ title = "Coming soon", text = "We're still cooking up this one. Check back soon.", compact = false }) {
  return (
    <div className={`coming-soon ${compact ? "coming-soon--compact" : ""}`}>
      <Starburst size={compact ? 64 : 92} color="var(--yellow)" rotate={-10}>
        Soon
      </Starburst>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action && (
        <Link className="btn btn--orange" to={action.to}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%", r = 10, style }) {
  return <span className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}
