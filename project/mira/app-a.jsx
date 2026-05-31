/* ============================================================
   MIRA — Variation A (Éditoriale) — composition
   ============================================================ */
const { motion: M, AnimatePresence: AP, useScroll: useScrollA, useTransform: useTransformA } = window.Motion;
const D = window.MIRA;

/* ---------- Logo ---------- */
function Logo({ dark }) {
  return (
    <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10 }} aria-label="MIRA">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="13" r="12" stroke={dark ? "var(--dk-ink)" : "var(--ink)"} strokeWidth="1.4" opacity=".25" />
        <circle cx="13" cy="13" r="3.4" fill="var(--violet)" />
        <path d="M13 2.5 L15 11 L13 13 Z" fill={dark ? "var(--dk-ink)" : "var(--ink)"} />
        <path d="M13 23.5 L11 15 L13 13 Z" fill="var(--violet)" opacity=".5" />
      </svg>
      <span style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 22, letterSpacing: ".02em", color: dark ? "var(--dk-ink)" : "var(--ink)" }}>MIRA</span>
    </a>
  );
}

/* ---------- Button ---------- */
function Btn({ children, primary, dark, small, href = "#cta", ...p }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999,
    padding: small ? "9px 16px" : "13px 22px", fontSize: small ? 13.5 : 15, fontWeight: 600,
    border: "1px solid transparent", transition: "transform .15s ease, box-shadow .2s ease, background .2s ease",
    whiteSpace: "nowrap",
  };
  const styleMap = primary
    ? { ...base, background: "var(--violet)", color: "#fff", boxShadow: "0 8px 22px -8px rgba(106,69,255,.6)" }
    : dark
      ? { ...base, background: "rgba(255,255,255,.06)", color: "var(--dk-ink)", borderColor: "var(--dk-line)" }
      : { ...base, background: "transparent", color: "var(--ink)", borderColor: "var(--line)" };
  return (
    <motion.a href={href} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} style={styleMap} {...p}>
      {children}
    </motion.a>
  );
}

/* ---------- Nav ---------- */
function Nav() {
  const [solid, setSolid] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 80,
        background: solid ? "rgba(245,243,251,.82)" : "transparent",
        backdropFilter: solid ? "blur(14px) saturate(1.4)" : "none",
        borderBottom: solid ? "1px solid var(--line-soft)" : "1px solid transparent",
        transition: "background .3s, border-color .3s",
      }}
    >
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
        <Logo />
        <nav style={{ display: "flex", gap: 30 }} className="nav-links">
          {D.nav.map((l) => (
            <a key={l.href} href={l.href} style={{ fontSize: 14.5, color: "var(--ink-2)", fontWeight: 500 }} className="nav-link">{l.label}</a>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="#" style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink-1)" }} className="nav-login">Connexion</a>
          <Btn primary small>{D.brand.cta}</Btn>
        </div>
      </div>
    </motion.header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  const { scrollY } = useScrollA();
  const yBlob1 = useTransformA(scrollY, [0, 600], [0, 140]);
  const yBlob2 = useTransformA(scrollY, [0, 600], [0, -90]);
  const yCard = useTransformA(scrollY, [0, 600], [0, 70]);
  return (
    <section id="top" style={{ position: "relative", paddingTop: 150, paddingBottom: 90, overflow: "hidden" }}>
      {/* background */}
      <div className="grid-tex" style={{ position: "absolute", inset: 0, opacity: 0.6, maskImage: "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 75%)" }} />
      <motion.div style={{ position: "absolute", top: -120, right: -80, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(106,69,255,.20), transparent 65%)", filter: "blur(20px)", y: yBlob1 }} />
      <motion.div style={{ position: "absolute", bottom: -160, left: -120, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(67,198,232,.16), transparent 65%)", filter: "blur(20px)", y: yBlob2 }} />

      <div className="wrap hero-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "1.04fr 0.96fr", gap: 56, alignItems: "center" }}>
        <div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 14px", borderRadius: 999, background: "var(--violet-100)", border: "1px solid rgba(106,69,255,.18)", marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--violet)" }} />
            <span className="kicker" style={{ color: "var(--violet-700)" }}>{D.hero.eyebrow}</span>
          </motion.div>

          <h1 className="display" style={{ fontSize: "clamp(40px, 5.2vw, 68px)", margin: "0 0 24px", color: "var(--ink)" }}>
            {[D.hero.h1a, D.hero.h1b].map((line, i) => (
              <motion.span key={i} style={{ display: "block" }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}>{line}</motion.span>
            ))}
            <motion.span className="italic grad" style={{ display: "block" }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}>{D.hero.h1c}</motion.span>
          </h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.45 }}
            style={{ fontSize: 18.5, lineHeight: 1.6, color: "var(--ink-2)", maxWidth: 520, margin: "0 0 34px" }}>
            {D.hero.sub}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }}
            style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Btn primary>{D.brand.cta} <span style={{ fontSize: 17 }}>→</span></Btn>
            <Btn href="#methode">Voir la méthode</Btn>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-3)", marginTop: 16, letterSpacing: ".02em" }}>
            {D.brand.ctaSub}
          </motion.p>
        </div>

        <motion.div style={{ display: "flex", justifyContent: "center", y: yCard }}>
          <DashboardMock />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Refs strip ---------- */
function Refs() {
  return (
    <section style={{ borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)", background: "var(--paper)" }}>
      <div className="wrap" style={{ padding: "30px 32px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 36, alignItems: "center" }}>
        <p style={{ fontSize: 13.5, color: "var(--ink-3)", maxWidth: 230, margin: 0, lineHeight: 1.5 }}>{D.refsLead}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "18px 42px", alignItems: "center" }}>
          {D.refs.map((r, i) => (
            <Reveal key={r} delay={i * 0.06} y={10}>
              <span className="serif" style={{ fontSize: 19, color: "var(--ink-1)", opacity: 0.78, whiteSpace: "nowrap" }}>{r}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Section heading ---------- */
function Head({ kicker, title, sub, center, dark, max = 640 }) {
  return (
    <div style={{ maxWidth: max, margin: center ? "0 auto" : 0, textAlign: center ? "center" : "left", marginBottom: 50 }}>
      <Reveal y={14}><div className="kicker" style={{ color: "var(--violet)", marginBottom: 16 }}>{kicker}</div></Reveal>
      <Reveal y={18} delay={0.05}><h2 className="display" style={{ fontSize: "clamp(30px,3.6vw,46px)", margin: 0, color: dark ? "var(--dk-ink)" : "var(--ink)" }}>{title}</h2></Reveal>
      {sub && <Reveal y={16} delay={0.1}><p style={{ fontSize: 18, lineHeight: 1.6, color: dark ? "var(--dk-mut)" : "var(--ink-2)", marginTop: 18 }}>{sub}</p></Reveal>}
    </div>
  );
}

/* ---------- Stats ---------- */
function Stats() {
  const toneCol = { risk: "var(--risk)", amber: "var(--amber)", violet: "var(--violet)", cyan: "var(--cyan)" };
  return (
    <section style={{ padding: "100px 0" }}>
      <div className="wrap">
        <Head kicker="L’angle mort des directions RH" title="Ce que l’IA change. Sans que personne ne le mesure." max={560} />
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
          {D.stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} y={0}>
              <div style={{ background: "var(--paper)", padding: "34px 26px", height: "100%" }}>
                <div className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 58, lineHeight: 1, color: toneCol[s.tone], marginBottom: 16 }}>
                  <StatCounter value={s.value} suffix={s.suffix} decimals={s.decimals || 0} />
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink-2)", margin: 0 }}>{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Market moment (light editorial w/ big numbers) ---------- */
function Market() {
  const m = D.market;
  return (
    <section style={{ padding: "20px 0 100px" }}>
      <div className="wrap">
        <div className="market-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 50, alignItems: "center", background: "var(--bg-soft)", borderRadius: "var(--r-xl)", padding: "56px 56px", border: "1px solid var(--line-soft)" }}>
          <div>
            <Reveal><div className="kicker" style={{ color: "var(--violet)", marginBottom: 16 }}>{m.kicker}</div></Reveal>
            <Reveal delay={0.05}><h2 className="display" style={{ fontSize: "clamp(28px,3.2vw,42px)", margin: "0 0 20px" }}>{m.title}</h2></Reveal>
            <Reveal delay={0.1}><p style={{ fontSize: 17.5, lineHeight: 1.6, color: "var(--ink-2)", margin: 0, maxWidth: 460 }}>{m.body}</p></Reveal>
          </div>
          <div style={{ display: "grid", gap: 18 }}>
            <Reveal delay={0.1}>
              <div style={{ background: "var(--paper)", borderRadius: "var(--r-lg)", padding: "28px 30px", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
                <div className="tnum grad" style={{ fontFamily: "var(--serif)", fontSize: 56, lineHeight: 1 }}><StatCounter value={m.big.value} suffix={m.big.suffix} decimals={1} /></div>
                <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "12px 0 0", lineHeight: 1.5 }}>{m.big.label}</p>
              </div>
            </Reveal>
            <Reveal delay={0.18}>
              <div style={{ background: "var(--dk-1)", color: "var(--dk-ink)", borderRadius: "var(--r-lg)", padding: "24px 30px", display: "flex", alignItems: "center", gap: 22 }}>
                <div className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 52, lineHeight: 1, color: "#fff" }}><StatCounter value={m.side.value} prefix={m.side.prefix} /></div>
                <p style={{ fontSize: 14, color: "var(--dk-mut)", margin: 0, lineHeight: 1.5 }}>{m.side.label}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Méthode (3 phases) — dark band ---------- */
function Methode() {
  return (
    <section id="methode" style={{ background: "var(--dk)", color: "var(--dk-ink)", padding: "110px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "10%", left: "50%", width: 700, height: 700, transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(106,69,255,.16), transparent 60%)", filter: "blur(30px)" }} />
      <div className="wrap" style={{ position: "relative" }}>
        <Head dark kicker="Le protocole en 3 phases" title="Du pré-rapport sectoriel au plan de transformation." sub="MIRA n’est pas un chatbot RH. C’est un protocole de diagnostic structuré qui produit une intelligence organisationnelle actionnable." center max={680} />
        <div className="phases-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
          {D.phases.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.1} y={30}>
              <div style={{ background: "linear-gradient(180deg, var(--dk-2), var(--dk-1))", border: "1px solid var(--dk-line)", borderRadius: "var(--r-lg)", padding: "30px 28px", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                  <span className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 40, color: "var(--violet-300)" }}>{p.n}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--violet)", border: "1px solid rgba(106,69,255,.35)", borderRadius: 999, padding: "5px 11px" }}>{p.tag}</span>
                </div>
                <h3 className="serif" style={{ fontSize: 24, margin: "0 0 6px", color: "#fff", fontWeight: 500 }}>{p.title}</h3>
                <div style={{ fontSize: 13, color: "var(--violet-300)", marginBottom: 16, fontWeight: 500 }}>{p.role}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--dk-mut)", margin: "0 0 20px" }}>{p.body}</p>
                <div style={{ marginTop: "auto", display: "grid", gap: 9, paddingTop: 18, borderTop: "1px solid var(--dk-line)" }}>
                  {p.points.map((pt) => (
                    <div key={pt} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--dk-ink)" }}>
                      <span style={{ color: "var(--violet)", marginTop: 1 }}>—</span><span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Logo, Btn, Nav, Hero, Refs, Head, Stats, Market, Methode });
