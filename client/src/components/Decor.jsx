// Hand-made SVG decoration shared across pages: wavy edges, checker strips,
// starburst stickers, hand-drawn arrows and squiggles.

export function Wave({ color = "var(--orange)", flip = false, className = "" }) {
  // One smooth repeating scallop; drawn as a filled band so it can sit on top of the next section.
  return (
    <svg className={`wave ${flip ? "wave--flip" : ""} ${className}`} viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill={color}
        d="M0 20 Q 30 0 60 20 T 120 20 T 180 20 T 240 20 T 300 20 T 360 20 T 420 20 T 480 20 T 540 20 T 600 20 T 660 20 T 720 20 T 780 20 T 840 20 T 900 20 T 960 20 T 1020 20 T 1080 20 T 1140 20 T 1200 20 T 1260 20 T 1320 20 T 1380 20 T 1440 20 V 40 H 0 Z"
      />
    </svg>
  );
}

export function Checker({ className = "", color = "var(--orange)", size = 22, style }) {
  return <div className={`checker ${className}`} style={{ "--check": color, "--check-size": `${size}px`, ...style }} aria-hidden="true" />;
}

export function Starburst({ children, color = "var(--yellow)", ink = "var(--ink)", size = 120, points = 14, className = "", rotate = -12 }) {
  const r1 = 50, r2 = 41;
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  return (
    <div className={`starburst ${className}`} style={{ width: size, height: size, transform: `rotate(${rotate}deg)`, color: ink }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon points={pts.join(" ")} fill={color} />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function Scribble({ children, className = "", arrow = "down-right" }) {
  return (
    <span className={`scribble scribble--${arrow} ${className}`}>
      <span className="scribble__text">{children}</span>
      <svg className="scribble__arrow" viewBox="0 0 60 40" aria-hidden="true">
        <path d="M4 6 C 18 30, 34 34, 52 26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M44 20 L53 26 L45 33" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Underline({ color = "var(--orange)" }) {
  return (
    <svg className="underline-swash" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3 10 C 50 2, 120 2, 197 7" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Sparkle({ className = "", color = "currentColor" }) {
  return (
    <svg className={`sparkle ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1 C 13 9, 15 11, 23 12 C 15 13, 13 15, 12 23 C 11 15, 9 13, 1 12 C 9 11, 11 9, 12 1 Z" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Eyes({ className = "" }) {
  return (
    <svg className={`eyes ${className}`} viewBox="0 0 64 36" aria-hidden="true">
      <ellipse cx="18" cy="18" rx="14" ry="16" fill="#fff" stroke="var(--ink)" strokeWidth="2.4" />
      <ellipse cx="46" cy="18" rx="14" ry="16" fill="#fff" stroke="var(--ink)" strokeWidth="2.4" />
      <circle cx="23" cy="22" r="6" fill="var(--ink)" />
      <circle cx="51" cy="22" r="6" fill="var(--ink)" />
    </svg>
  );
}

export function VegMark({ veg }) {
  return (
    <span className={`vegmark ${veg ? "vegmark--veg" : "vegmark--non"}`} title={veg ? "Vegetarian" : "Non-vegetarian"} aria-label={veg ? "Vegetarian" : "Non-vegetarian"}>
      <i />
    </span>
  );
}

export function Stars({ value = 0, size = 18, onChange }) {
  return (
    <span className="stars" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        const star = (
          <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.5l1.3-6.6L2.5 9.3l6.6-.8z" fill={on ? "var(--orange)" : "none"} stroke={on ? "var(--orange)" : "var(--ink-3)"} strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        );
        return onChange ? (
          <button key={n} type="button" className="stars__btn" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)}>
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}
