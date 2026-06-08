import { useState } from 'react';
import Reveal from '../ui/Reveal';
import Button from '../ui/Button';
import Head from '../ui/Head';
import mira from '../../data/mira';

function priceFor(n: number): number | null {
  if (n >= 1000) return null;
  if (n >= 250) return 12;
  if (n >= 50) return 18;
  return 24;
}

function isTierActive(range: string, n: number): boolean {
  const lo = parseInt(range);
  if (lo === 1) return n < 50;
  if (lo === 50) return n >= 50 && n < 250;
  if (lo === 250) return n >= 250 && n < 1000;
  return n >= 1000;
}

export default function Pricing() {
  const [n, setN] = useState(180);
  const unit = priceFor(n);
  const total = unit ? unit * n : null;

  return (
    <section id="tarifs" style={{ padding: '110px 0', background: 'var(--paper)', borderTop: '1px solid var(--line-soft)' }}>
      <div className="wrap">
        <Head kicker="Modèle économique" title="Gratuit pour découvrir. Dégressif pour déployer." center max={620} />

        <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 30 }}>
          {mira.pricing.map((p) => (
            <Reveal key={p.name} y={24}>
              <div style={{
                background: p.featured ? 'var(--dk-1)' : 'var(--bg)', color: p.featured ? 'var(--dk-ink)' : 'var(--ink)',
                border: '1px solid', borderColor: p.featured ? 'var(--dk-line)' : 'var(--line)', borderRadius: 'var(--r-lg)',
                padding: '34px 34px', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
              }}>
                {p.featured && (
                  <span style={{ position: 'absolute', top: 22, right: 22, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--violet-300)', border: '1px solid rgba(182,162,255,.4)', borderRadius: 999, padding: '4px 11px' }}>
                    RECOMMANDÉ
                  </span>
                )}
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 27, margin: '0 0 6px', fontWeight: 500 }}>{p.name}</h3>
                <p style={{ fontSize: 14, color: p.featured ? 'var(--dk-mut)' : 'var(--ink-2)', margin: '0 0 22px' }}>{p.sub}</p>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 34, marginBottom: 24 }}>{p.price}</div>
                <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.45, color: p.featured ? 'var(--dk-ink)' : 'var(--ink-1)' }}>
                      <span style={{ color: 'var(--violet)', flexShrink: 0 }}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <Button primary={p.featured} dark={p.featured} href="#cta">{p.cta}</Button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* calculator */}
        <Reveal y={20}>
          <div className="calc-grid" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-lg)', padding: '34px 38px', display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 44, alignItems: 'center' }}>
            <div>
              <div className="kicker" style={{ color: 'var(--violet)', marginBottom: 18 }}>Estimation MIRA Pro</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 15, color: 'var(--ink-2)' }}>Effectif couvert</label>
                <span className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)' }}>
                  {n >= 1000 ? '1 000+' : n.toLocaleString('fr-FR')}
                  {' '}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>salariés</span>
                </span>
              </div>
              <input
                type="range" min="10" max="1000" step="10"
                value={n} onChange={(e) => setN(+e.target.value)}
                className="mira-range" style={{ width: '100%' }}
              />
              <div className="price-tiers" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 22 }}>
                {mira.tiers.map((t) => {
                  const on = isTierActive(t.range, n);
                  return (
                    <div key={t.range} style={{ background: on ? 'var(--violet)' : 'var(--paper)', color: on ? '#fff' : 'var(--ink-2)', border: '1px solid', borderColor: on ? 'var(--violet)' : 'var(--line)', borderRadius: 12, padding: '12px 12px', transition: 'all .25s' }}>
                      <div style={{ fontSize: 11.5, opacity: 0.9, marginBottom: 4 }}>{t.range}</div>
                      <div className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>{t.price}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="calc-total" style={{ textAlign: 'center', borderLeft: '1px solid var(--line)', paddingLeft: 40 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', color: 'var(--ink-3)', marginBottom: 10 }}>BUDGET ANNUEL ESTIMÉ</div>
              {total != null ? (
                <>
                  <div className="tnum grad" style={{ fontFamily: 'var(--serif)', fontSize: 46, lineHeight: 1 }}>{total.toLocaleString('fr-FR')} €</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8 }}>soit {unit} € / salarié / an</div>
                </>
              ) : (
                <>
                  <div className="grad" style={{ fontFamily: 'var(--serif)', fontSize: 38, lineHeight: 1 }}>Sur devis</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8 }}>Tarif négocié au-delà de 1 000 salariés</div>
                </>
              )}
            </div>
          </div>
        </Reveal>

        <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginTop: 18, maxWidth: 620, marginInline: 'auto', lineHeight: 1.5 }}>{mira.tiersNote}</p>
      </div>
    </section>
  );
}
