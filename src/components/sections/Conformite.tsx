import Reveal from '../ui/Reveal';
import Head from '../ui/Head';
import mira from '../../data/mira';

export default function Conformite() {
  return (
    <section id="conformite" style={{ padding: '110px 0' }}>
      <div className="wrap">
        <Head kicker="Conformité & éthique" title="Conçu pour le cadre légal français." sub="MIRA s'inscrit nativement dans l'entretien professionnel obligatoire, respecte le RGPD et produit des diagnostics — jamais des décisions." max={640} />
        <div className="conf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {mira.compliance.map((c, i) => (
            <Reveal key={c.t} delay={i * 0.08} y={22}>
              <div style={{ borderTop: '2px solid var(--violet)', paddingTop: 22 }}>
                <h3 style={{ fontSize: 19, margin: '0 0 10px', fontWeight: 600 }}>{c.t}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
