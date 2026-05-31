/* ============================================================
   MIRA — Variation C (Manifeste) — bold editorial / ivory
   Reuses shared sections; custom oversized hero.
   ============================================================ */

function HeroC() {
  const { useScroll, useTransform } = window.Motion;
  const { scrollY } = useScroll();
  const yCard = useTransform(scrollY, [0, 700], [0, 90]);
  const yWord = useTransform(scrollY, [0, 700], [0, -40]);
  return (
    <section id="top" style={{ position: "relative", paddingTop: 168, paddingBottom: 70, overflow: "hidden", textAlign: "center" }}>
      <motion.div style={{ position: "absolute", top: 80, left: "50%", x: "-50%", width: 760, height: 520, background: "radial-gradient(circle, rgba(106,69,255,.14), transparent 62%)", filter: "blur(30px)", y: yWord }} />
      <div className="wrap" style={{ position: "relative", maxWidth: 1000 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 30, fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--violet-700)" }}>
          <span style={{ width: 26, height: 1, background: "var(--violet)" }} /> Intelligence RH augmentée <span style={{ width: 26, height: 1, background: "var(--violet)" }} />
        </motion.div>

        <h1 className="display" style={{ fontSize: "clamp(44px,6.6vw,92px)", margin: "0 auto 30px", lineHeight: 0.98, maxWidth: 980 }}>
          <motion.span style={{ display: "block" }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>L’IA redessine la carte</motion.span>
          <motion.span style={{ display: "block" }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>des compétences.</motion.span>
          <motion.span className="italic grad" style={{ display: "block" }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}>MIRA donne la boussole.</motion.span>
        </h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ fontSize: 19.5, lineHeight: 1.6, color: "var(--ink-2)", maxWidth: 600, margin: "0 auto 36px" }}>
          {D.hero.sub}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 70 }}>
          <Btn primary>{D.brand.cta} <span style={{ fontSize: 17 }}>→</span></Btn>
          <Btn href="#methode">Lire la méthode</Btn>
        </motion.div>

        <motion.div style={{ display: "flex", justifyContent: "center", y: yCard }}>
          <DashboardMock />
        </motion.div>
      </div>
    </section>
  );
}
window.HeroC = HeroC;
