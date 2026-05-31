/* ============================================================
   MIRA — Animated primitives & data-viz (framer-motion)
   Exposes components on window.
   ============================================================ */
const { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, animate: fmAnimate } = window.Motion;

/* ---------- hooks ---------- */
function useInViewOnce(margin = "-12% 0px") {
  const ref = React.useRef(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } });
    }, { rootMargin: margin, threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return [ref, seen];
}

function useCountTo(target, active, { dur = 1400, decimals = 0 } = {}) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    let raf, start;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      setVal(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else setVal(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, dur]);
  return decimals ? val.toFixed(decimals) : Math.round(val);
}

/* ---------- Reveal wrapper ---------- */
function Reveal({ children, delay = 0, y = 26, className, as = "div", once = true }) {
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-10% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/* ---------- StatCounter ---------- */
function StatCounter({ value, suffix = "", prefix = "", decimals = 0, dur = 1500 }) {
  const [ref, seen] = useInViewOnce();
  const n = useCountTo(value, seen, { dur, decimals });
  const display = decimals ? Number(n).toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : Number(n).toLocaleString("fr-FR");
  return <span ref={ref} className="tnum">{prefix}{display}{suffix}</span>;
}

/* ---------- RadialGauge ---------- */
function RadialGauge({ value = 61, max = 100, size = 168, stroke = 13, label = "Score de vulnérabilité", dark = false }) {
  const [ref, seen] = useInViewOnce();
  const n = useCountTo(value, seen, { dur: 1600 });
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value / max;
  const track = dark ? "rgba(255,255,255,.12)" : "rgba(22,15,46,.09)";
  return (
    <div ref={ref} style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={"gg" + size} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6a45ff" />
            <stop offset="60%" stopColor="#9a6bff" />
            <stop offset="100%" stopColor="#43c6e8" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#gg${size})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={seen ? { strokeDashoffset: c * (1 - pct) } : {}}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="tnum" style={{ fontFamily: "var(--serif)", fontSize: size * 0.30, lineHeight: 1, color: dark ? "var(--dk-ink)" : "var(--ink)", fontWeight: 500 }}>{n}</div>
          <div className="mono" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".12em", color: dark ? "var(--dk-mut)" : "var(--ink-3)", marginTop: 2 }}>/ {max}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- ExposureBars ---------- */
function ExposureBars({ jobs, dark = false, max = 6 }) {
  const [ref, seen] = useInViewOnce();
  const list = jobs.slice(0, max);
  const col = (e) => (e >= 65 ? "var(--risk)" : e >= 45 ? "var(--amber)" : "var(--opp)");
  return (
    <div ref={ref} style={{ display: "grid", gap: 13 }}>
      {list.map((j, i) => (
        <div key={j.name} style={{ display: "grid", gridTemplateColumns: "118px 1fr 40px", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: dark ? "var(--dk-mut)" : "var(--ink-2)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.name}</span>
          <div style={{ height: 8, borderRadius: 6, background: dark ? "rgba(255,255,255,.08)" : "rgba(22,15,46,.06)", overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", borderRadius: 6, background: col(j.exp) }}
              initial={{ width: 0 }}
              animate={seen ? { width: j.exp + "%" } : {}}
              transition={{ duration: 1.1, delay: 0.1 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="tnum" style={{ fontSize: 12, fontFamily: "var(--mono)", color: dark ? "var(--dk-ink)" : "var(--ink-1)", textAlign: "right" }}>{j.exp}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- ScatterMatrix (risque vs opportunité) ---------- */
function ScatterMatrix({ jobs, dark = false, h = 360 }) {
  const [ref, seen] = useInViewOnce();
  const pad = 44;
  const W = 560, H = h;
  const x = (opp) => pad + (opp / 100) * (W - pad * 2);
  const y = (exp) => pad + (1 - exp / 100) * (H - pad * 2);
  const grid = dark ? "rgba(255,255,255,.07)" : "rgba(22,15,46,.07)";
  const axis = dark ? "var(--dk-mut)" : "var(--ink-3)";
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* quadrant tint top-left (haute expo, faible opp) */}
        <rect x={pad} y={pad} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(239,108,77,.06)" />
        <rect x={pad + (W - pad * 2) / 2} y={pad} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(243,177,63,.06)" />
        <rect x={pad + (W - pad * 2) / 2} y={pad + (H - pad * 2) / 2} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(44,193,143,.07)" />
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={pad + t * (W - pad * 2)} y1={pad} x2={pad + t * (W - pad * 2)} y2={H - pad} stroke={grid} strokeWidth="1" />
            <line x1={pad} y1={pad + t * (H - pad * 2)} x2={W - pad} y2={pad + t * (H - pad * 2)} stroke={grid} strokeWidth="1" />
          </g>
        ))}
        {/* axes labels */}
        <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="11" fontFamily="var(--mono)" fill={axis} letterSpacing="1.5">OPPORTUNITÉ D’AUGMENTATION →</text>
        <text x={14} y={H / 2} textAnchor="middle" fontSize="11" fontFamily="var(--mono)" fill={axis} letterSpacing="1.5" transform={`rotate(-90 14 ${H / 2})`}>EXPOSITION À L’AUTOMATISATION →</text>
        {/* points */}
        {jobs.map((j, i) => {
          const cx = x(j.opp), cy = y(j.exp);
          const col = j.exp >= 65 ? "var(--risk)" : j.opp >= 70 ? "var(--opp)" : "var(--violet)";
          return (
            <motion.g key={j.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={seen ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              <circle cx={cx} cy={cy} r="7" fill={col} />
              <circle cx={cx} cy={cy} r="13" fill={col} opacity="0.16" />
              <text x={cx + 14} y={cy + 4} fontSize="12" fontWeight="600" fill={dark ? "var(--dk-ink)" : "var(--ink-1)"} fontFamily="var(--sans)">{j.name}</text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- DashboardMock (hero centerpiece) ---------- */
function DashboardMock() {
  const jobs = window.MIRA.jobs;
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 540 }}>
      {/* main report card */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        style={{
          position: "relative", background: "var(--dk-1)", border: "1px solid var(--dk-line)",
          borderRadius: "var(--r-lg)", padding: "22px 24px 24px", boxShadow: "var(--shadow-lg)",
          color: "var(--dk-ink)", backdropFilter: "blur(8px)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--violet)", boxShadow: "0 0 0 4px rgba(106,69,255,.2)" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".1em", color: "var(--dk-mut)" }}>RAPPORT DE TRANSFORMATION</span>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 11, color: "var(--opp)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--opp)" }} /> LIVE
          </span>
        </div>
        {/* body grid */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
            <RadialGauge value={61} size={150} dark />
            <span style={{ fontSize: 12, color: "var(--dk-mut)", textAlign: "center", maxWidth: 130, lineHeight: 1.3 }}>Vulnérabilité organisationnelle</span>
          </div>
          <ExposureBars jobs={jobs} dark max={5} />
        </div>
        {/* footer chips */}
        <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--dk-line)" }}>
          {[["12", "métiers"], ["3", "lectures"], ["48", "actions"]].map(([v, l]) => (
            <div key={l} style={{ flex: 1, textAlign: "center" }}>
              <div className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--dk-ink)" }}>{v}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", color: "var(--dk-mut)", textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* floating chip — opportunité */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        style={{
          position: "absolute", right: -26, top: 38, background: "var(--paper)", color: "var(--ink)",
          borderRadius: 14, padding: "12px 15px", boxShadow: "var(--shadow)", border: "1px solid var(--line)",
          display: "flex", alignItems: "center", gap: 11,
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(44,193,143,.14)", color: "var(--opp)", display: "grid", placeItems: "center", fontWeight: 700 }}>↗</span>
        <div>
          <div className="tnum" style={{ fontWeight: 700, fontSize: 16 }}>+82&nbsp;%</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>opportunité Data/IT</div>
        </div>
      </motion.div>

      {/* floating chip — métiers */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        style={{
          position: "absolute", left: -30, bottom: 30, background: "var(--paper)", color: "var(--ink)",
          borderRadius: 14, padding: "11px 14px", boxShadow: "var(--shadow)", border: "1px solid var(--line)",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--risk)" }} />
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>Support client · <span style={{ color: "var(--risk)" }}>exposition 78</span></div>
      </motion.div>
    </div>
  );
}

Object.assign(window, {
  useInViewOnce, useCountTo, Reveal, StatCounter, RadialGauge, ExposureBars, ScatterMatrix, DashboardMock,
});
