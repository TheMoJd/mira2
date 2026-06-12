import Reveal from '../ui/Reveal';
import Head from '../ui/Head';
import SpotlightCard from '../ui/SpotlightCard';
import mira from '../../data/mira';

export default function Diff() {
  return (
    <section id="produit" style={{ padding: '0 0 110px' }}>
      <div className="wrap">
        <Head kicker="Ce qui nous distingue" title="MIRA renforce votre orientation." sub="Un protocole propriétaire, une conformité native et un effet de réseau qui se renforce vague après vague." center max={620} />
        <div className="diff-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {mira.diff.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 0.08} y={24}>
              <SpotlightCard>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '28px 26px', height: '100%' }}>
                  <div className="tnum" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--violet)', marginBottom: 16 }}>0{i + 1}</div>
                  <h3 style={{ fontSize: 18.5, margin: '0 0 9px', color: 'var(--ink)', fontWeight: 600 }}>{f.t}</h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>{f.d}</p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
