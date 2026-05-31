/* ============================================================
   MIRA — Variation A — sections (suite) + composition
   ============================================================ */

/* ---------- Les 3 lectures (tabbed, interactive) ---------- */
function Lectures() {
  const [active, setActive] = React.useState(0);
  const r = D.readings[active];
  return (
    <section id="lectures" style={{ padding: "110px 0" }}>
      <div className="wrap">
        <Head kicker="Un diagnostic, trois lectures" title="Le même rapport, parlé dans trois langues." sub="Chaque niveau hiérarchique reçoit une restitution calibrée — de la vision stratégique consolidée à la fiche individuelle." />
        <div className="lect-grid" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 40, alignItems: "stretch" }}>
          {/* tabs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {D.readings.map((rr, i) => {
              const on = i === active;
              return (
                <button key={rr.key} onClick={() => setActive(i)} style={{
                  textAlign: "left", border: "1px solid", borderColor: on ? "var(--violet)" : "var(--line)",
                  background: on ? "var(--violet-100)" : "var(--paper)", borderRadius: "var(--r)", padding: "20px 22px",
                  transition: "all .25s ease", position: "relative",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: on ? 8 : 0 }}>
                    <span className="tnum" style={{ fontFamily: "var(--mono)", fontSize: 12, color: on ? "var(--violet-700)" : "var(--ink-3)" }}>0{i + 1}</span>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>{rr.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: on ? "var(--violet-700)" : "var(--ink-3)", fontFamily: "var(--mono)" }}>{rr.lead}</span>
                  </div>
                  <AnimatePresence>
                    {on && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)", margin: 0, overflow: "hidden" }}>{rr.desc}</motion.p>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
          {/* preview panel */}
          <div style={{ background: "var(--dk-1)", borderRadius: "var(--r-lg)", padding: "30px 32px", color: "var(--dk-ink)", boxShadow: "var(--shadow)", position: "relative", overflow: "hidden", minHeight: 420 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid var(--dk-line)" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".1em", color: "var(--dk-mut)" }}>LECTURE · {r.label.toUpperCase()}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--violet-300)" }}>MIRA Pro</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.4 }}>
                <LecturePreview which={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function LecturePreview({ which }) {
  if (which === 0) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 26, alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <RadialGauge value={61} size={150} dark />
          <div style={{ fontSize: 12.5, color: "var(--dk-mut)", marginTop: 8 }}>Vulnérabilité globale</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "var(--dk-mut)", marginBottom: 14, fontFamily: "var(--mono)" }}>EXPOSITION PAR FILIÈRE</div>
          <ExposureBars jobs={D.jobs} dark max={5} />
        </div>
      </div>
    );
  }
  if (which === 1) {
    const team = [
      { n: "L. Martin", role: "Chargé support", risk: "élevé", v: 78 },
      { n: "S. Dubois", role: "Comptable", risk: "élevé", v: 71 },
      { n: "A. Petit", role: "Chargé marketing", risk: "modéré", v: 58 },
      { n: "K. Roy", role: "Analyste data", risk: "faible", v: 36 },
    ];
    const rc = (r) => r === "élevé" ? "var(--risk)" : r === "modéré" ? "var(--amber)" : "var(--opp)";
    return (
      <div>
        <div style={{ fontSize: 13, color: "var(--dk-mut)", marginBottom: 16, fontFamily: "var(--mono)" }}>ÉQUIPE OPÉRATIONS · 12 COLLABORATEURS</div>
        <div style={{ display: "grid", gap: 10 }}>
          {team.map((t, i) => (
            <motion.div key={t.n} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center", background: "var(--dk-2)", borderRadius: 12, padding: "13px 16px" }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "#fff" }}>{t.n}</div>
                <div style={{ fontSize: 12, color: "var(--dk-mut)" }}>{t.role}</div>
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: rc(t.risk), border: `1px solid ${rc(t.risk)}`, borderRadius: 999, padding: "3px 10px" }}>{t.risk}</span>
              <span className="tnum" style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--dk-ink)", width: 28, textAlign: "right" }}>{t.v}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }
  // individu
  const skills = [["Pilotage IA", 82], ["Esprit critique", 74], ["Relation client", 68], ["Maîtrise outils", 41], ["Reporting manuel", 28]];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--violet)", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontSize: 22, color: "#fff" }}>LM</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>Léa Martin</div>
          <div style={{ fontSize: 13, color: "var(--dk-mut)" }}>Chargée de support client · exposition 78/100</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "var(--dk-mut)", marginBottom: 14, fontFamily: "var(--mono)" }}>COMPÉTENCES À RENFORCER</div>
      <div style={{ display: "grid", gap: 11 }}>
        {skills.map(([s, v], i) => (
          <div key={s} style={{ display: "grid", gridTemplateColumns: "130px 1fr 34px", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--dk-ink)" }}>{s}</span>
            <div style={{ height: 7, borderRadius: 5, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: v + "%" }} transition={{ delay: 0.15 + i * 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%", background: v >= 60 ? "var(--opp)" : "var(--amber)", borderRadius: 5 }} />
            </div>
            <span className="tnum" style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dk-ink)", textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Matrice d'exposition ---------- */
function Matrix() {
  return (
    <section style={{ padding: "20px 0 110px" }}>
      <div className="wrap matrix-grid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 50, alignItems: "center" }}>
        <div>
          <Head kicker="Scoring d’exposition" title="Chaque métier, situé." sub="MIRA positionne vos filières sur deux axes : l’exposition à l’automatisation et le potentiel d’augmentation par l’IA. La carte de votre transformation, en un coup d’œil." max={420} />
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            {[["var(--risk)", "Exposition forte — à reconvertir"], ["var(--violet)", "Zone mixte — à arbitrer"], ["var(--opp)", "Fort potentiel — à augmenter"]].map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "var(--ink-2)" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />{l}
              </div>
            ))}
          </div>
        </div>
        <Reveal y={24}>
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: "20px 18px", boxShadow: "var(--shadow-sm)" }}>
            <ScatterMatrix jobs={D.jobs} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Différenciation ---------- */
function Diff() {
  return (
    <section id="produit" style={{ padding: "0 0 110px" }}>
      <div className="wrap">
        <Head kicker="La douve" title="Pourquoi MIRA résiste." sub="Un protocole propriétaire, une conformité native et un effet de réseau qui se renforce vague après vague." center max={620} />
        <div className="diff-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {D.diff.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 0.08} y={24}>
              <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: "28px 26px", height: "100%" }}>
                <div className="tnum" style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--violet)", marginBottom: 16 }}>0{i + 1}</div>
                <h3 style={{ fontSize: 18.5, margin: "0 0 9px", color: "var(--ink)", fontWeight: 600 }}>{f.t}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)", margin: 0 }}>{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing + calculator ---------- */
function priceFor(n) {
  if (n >= 1000) return null;
  if (n >= 250) return 12;
  if (n >= 50) return 18;
  return 24;
}
function Pricing() {
  const [n, setN] = React.useState(180);
  const unit = priceFor(n);
  const total = unit ? (unit * n) : null;
  return (
    <section id="tarifs" style={{ padding: "110px 0", background: "var(--paper)", borderTop: "1px solid var(--line-soft)" }}>
      <div className="wrap">
        <Head kicker="Modèle économique" title="Gratuit pour découvrir. Dégressif pour déployer." center max={620} />
        <div className="price-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 30 }}>
          {D.pricing.map((p) => (
            <Reveal key={p.name} y={24}>
              <div style={{
                background: p.featured ? "var(--dk-1)" : "var(--bg)", color: p.featured ? "var(--dk-ink)" : "var(--ink)",
                border: "1px solid", borderColor: p.featured ? "var(--dk-line)" : "var(--line)", borderRadius: "var(--r-lg)",
                padding: "34px 34px", height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
              }}>
                {p.featured && <span style={{ position: "absolute", top: 22, right: 22, fontFamily: "var(--mono)", fontSize: 11, color: "var(--violet-300)", border: "1px solid rgba(106,69,255,.4)", borderRadius: 999, padding: "4px 11px" }}>RECOMMANDÉ</span>}
                <h3 className="serif" style={{ fontSize: 27, margin: "0 0 6px", fontWeight: 500 }}>{p.name}</h3>
                <p style={{ fontSize: 14, color: p.featured ? "var(--dk-mut)" : "var(--ink-2)", margin: "0 0 22px" }}>{p.sub}</p>
                <div style={{ fontFamily: "var(--serif)", fontSize: 34, marginBottom: 24 }}>{p.price}</div>
                <div style={{ display: "grid", gap: 12, marginBottom: 28 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45, color: p.featured ? "var(--dk-ink)" : "var(--ink-1)" }}>
                      <span style={{ color: "var(--violet)", flexShrink: 0 }}>✓</span><span>{f}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "auto" }}>
                  <Btn primary={p.featured} dark={p.featured} href="#cta">{p.cta}</Btn>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* calculator */}
        <Reveal y={20}>
          <div className="calc-grid" style={{ background: "var(--bg-soft)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-lg)", padding: "34px 38px", display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 44, alignItems: "center" }}>
            <div>
              <div className="kicker" style={{ color: "var(--violet)", marginBottom: 18 }}>Estimation MIRA Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <label style={{ fontSize: 15, color: "var(--ink-2)" }}>Effectif couvert</label>
                <span className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 26, color: "var(--ink)" }}>{n >= 1000 ? "1 000+" : n.toLocaleString("fr-FR")} <span style={{ fontSize: 14, color: "var(--ink-3)", fontFamily: "var(--sans)" }}>salariés</span></span>
              </div>
              <input type="range" min="10" max="1000" step="10" value={n} onChange={(e) => setN(+e.target.value)} className="mira-range" style={{ width: "100%" }} />
              <div className="price-tiers" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 22 }}>
                {D.tiers.map((t) => {
                  const lo = parseInt(t.range);
                  const on = (unit && ((lo === 1 && n < 50) || (lo === 50 && n >= 50 && n < 250) || (lo === 250 && n >= 250 && n < 1000))) || (lo === 1000 && n >= 1000);
                  return (
                    <div key={t.range} style={{ background: on ? "var(--violet)" : "var(--paper)", color: on ? "#fff" : "var(--ink-2)", border: "1px solid", borderColor: on ? "var(--violet)" : "var(--line)", borderRadius: 12, padding: "12px 12px", transition: "all .25s" }}>
                      <div style={{ fontSize: 11.5, opacity: 0.9, marginBottom: 4 }}>{t.range}</div>
                      <div className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>{t.price}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid var(--line)", paddingLeft: 40 }} className="calc-total">
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".1em", color: "var(--ink-3)", marginBottom: 10 }}>BUDGET ANNUEL ESTIMÉ</div>
              {total != null ? (
                <React.Fragment>
                  <div className="tnum grad" style={{ fontFamily: "var(--serif)", fontSize: 46, lineHeight: 1 }}>{total.toLocaleString("fr-FR")} €</div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>soit {unit} € / salarié / an</div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <div className="grad" style={{ fontFamily: "var(--serif)", fontSize: 38, lineHeight: 1 }}>Sur devis</div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>Tarif négocié au-delà de 1 000 salariés</div>
                </React.Fragment>
              )}
            </div>
          </div>
        </Reveal>
        <p style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", marginTop: 18, maxWidth: 620, marginInline: "auto", lineHeight: 1.5 }}>{D.tiersNote}</p>
      </div>
    </section>
  );
}

/* ---------- Conformité ---------- */
function Conformite() {
  return (
    <section id="conformite" style={{ padding: "110px 0" }}>
      <div className="wrap">
        <Head kicker="Conformité & éthique" title="Conçu pour le cadre légal français." sub="MIRA s’inscrit nativement dans l’entretien professionnel obligatoire, respecte le RGPD et produit des diagnostics — jamais des décisions." max={640} />
        <div className="conf-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {D.compliance.map((c, i) => (
            <Reveal key={c.t} delay={i * 0.08} y={22}>
              <div style={{ borderTop: "2px solid var(--violet)", paddingTop: 22 }}>
                <h3 style={{ fontSize: 19, margin: "0 0 10px", fontWeight: 600 }}>{c.t}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)", margin: 0 }}>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function FinalCTA() {
  return (
    <section id="cta" style={{ padding: "40px 0 110px" }}>
      <div className="wrap">
        <div style={{ position: "relative", background: "var(--dk)", color: "var(--dk-ink)", borderRadius: "var(--r-xl)", padding: "84px 56px", textAlign: "center", overflow: "hidden" }}>
          <div className="grid-tex" style={{ position: "absolute", inset: 0, opacity: 0.4, maskImage: "radial-gradient(80% 80% at 50% 0%, #000, transparent 75%)" }} />
          <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(circle, rgba(106,69,255,.3), transparent 60%)", filter: "blur(40px)" }} />
          <div style={{ position: "relative" }}>
            <Reveal><div className="kicker" style={{ color: "var(--violet-300)", marginBottom: 22 }}>Validation en moins de 90 jours</div></Reveal>
            <Reveal delay={0.05}><h2 className="display" style={{ fontSize: "clamp(32px,4.4vw,58px)", margin: "0 0 22px", color: "#fff", maxWidth: 760, marginInline: "auto" }}>Donnez à vos équipes RH la <span className="italic grad">boussole</span> qui leur manque.</h2></Reveal>
            <Reveal delay={0.1}><p style={{ fontSize: 18, color: "var(--dk-mut)", maxWidth: 540, margin: "0 auto 34px", lineHeight: 1.6 }}>Lancez votre pré-rapport sectoriel gratuit en 10 minutes. Sans engagement, sans carte bancaire.</p></Reveal>
            <Reveal delay={0.15}>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <Btn primary>{D.brand.cta} <span style={{ fontSize: 17 }}>→</span></Btn>
                <Btn dark href="#tarifs">Voir les tarifs</Btn>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer style={{ background: "var(--paper)", borderTop: "1px solid var(--line-soft)", padding: "56px 0 40px" }}>
      <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 36 }}>
        <div>
          <Logo />
          <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "16px 0 0", maxWidth: 280, lineHeight: 1.6 }}>{D.brand.full} sur les ressources humaines et les aptitudes professionnelles.</p>
        </div>
        {[["Produit", ["Le pré-rapport", "Entretiens augmentés", "Les 3 lectures", "Tarifs"]], ["Ressources", ["Méthodologie", "Sources de référence", "Conformité RGPD", "Loi Avenir"]], ["Société", ["L’équipe", "Contact", "Mentions légales", "DPA"]]].map(([h, items]) => (
          <div key={h}>
            <div className="kicker" style={{ color: "var(--ink-3)", marginBottom: 16 }}>{h}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((it) => <a key={it} href="#" style={{ fontSize: 14, color: "var(--ink-2)" }}>{it}</a>)}
            </div>
          </div>
        ))}
      </div>
      <div className="wrap" style={{ marginTop: 44, paddingTop: 24, borderTop: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ink-3)" }}>© 2026 MIRA · Mapping des Impacts et des Risques IA</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>L’IA redessine la carte. MIRA donne la boussole.</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Lectures, LecturePreview, Matrix, Diff, Pricing, Conformite, FinalCTA, Footer });
