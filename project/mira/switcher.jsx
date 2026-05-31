/* ============================================================
   MIRA — Floating variation switcher (shared)
   ============================================================ */
function Switcher({ current }) {
  const variants = [
    { key: "a", label: "Éditoriale", href: "index.html" },
    { key: "b", label: "Données", href: "variation-b.html" },
    { key: "c", label: "Manifeste", href: "variation-c.html" },
  ];
  const [hidden, setHidden] = React.useState(false);
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }} animate={{ y: hidden ? 64 : 0, opacity: 1 }} transition={{ delay: 1.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 120 }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 6, background: "rgba(16,10,38,.9)", backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: 6, boxShadow: "0 20px 50px -18px rgba(16,10,38,.7)",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", color: "var(--dk-mut)", padding: "0 10px 0 12px", textTransform: "uppercase" }}>Style</span>
        {variants.map((v) => {
          const on = v.key === current;
          return (
            <a key={v.key} href={v.href} style={{
              fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 999,
              background: on ? "var(--violet)" : "transparent", color: on ? "#fff" : "var(--dk-mut)", transition: "all .2s",
            }}>{v.label}</a>
          );
        })}
      </div>
    </motion.div>
  );
}
window.Switcher = Switcher;
