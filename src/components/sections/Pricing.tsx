import Reveal from '../ui/Reveal';
import Button from '../ui/Button';
import Head from '../ui/Head';
import SpotlightCard from '../ui/SpotlightCard';
import mira from '../../data/mira';

export default function Pricing() {
  return (
    <section id="tarifs" style={{ padding: '110px 0', background: 'var(--paper)', borderTop: '1px solid var(--line-soft)' }}>
      <div className="wrap">
        <Head split kicker="Nos offres" title="Accompagnement sur-mesure et progressif" sub="Vous êtes DRH, directeurs généraux de PME et d'ETI, responsables du développement des compétences, dirigeants. Vous sentez que l'IA va bousculer vos métiers sans savoir encore où ni comment." center max={620} />

        <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          {mira.pricing.map((p) => (
            <Reveal key={p.name} y={24}>
              <SpotlightCard dark={p.featured}>
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
                  {/* Discover (offert) → wizard de pré-diagnostic ; Pro → fiche contact. */}
                  <Button primary={p.featured} dark={p.featured} href={p.featured ? '/contact' : '/pre-diagnostic'}>{p.cta}</Button>
                </div>
              </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
