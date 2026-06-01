import Reveal from '../ui/Reveal';
import Head from '../ui/Head';
import ScatterMatrix from '../charts/ScatterMatrix';
import mira from '../../data/mira';

const legend = [
  ['var(--risk)', 'Exposition forte — à reconvertir'],
  ['var(--violet)', 'Zone mixte — à arbitrer'],
  ['var(--opp)', 'Fort potentiel — à augmenter'],
] as const;

// Échelle de discernement humain : du plus automatisable (délégation à l'IA)
// au plus irremplaçable (full humain).
const discernement = [
  ['Délégation', 'var(--risk)'],
  ['Supervision', 'var(--amber)'],
  ['Co-création', 'var(--violet)'],
  ['Full humain', 'var(--opp)'],
] as const;

export default function Matrix() {
  return (
    <section style={{ padding: '20px 0 110px' }}>
      <div className="wrap matrix-grid" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 50, alignItems: 'center' }}>
        <div>
          <Head kicker="Scoring d'exposition" title="Chaque métier, situé." sub="MIRA ne se limite pas à l'exposition à l'automatisation : le score croise aussi le discernement humain requis et la criticité des données traitées. La carte de votre transformation, en un coup d'œil." max={440} />
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {legend.map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--ink-2)' }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />{l}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 30 }}>
            <div className="kicker" style={{ color: 'var(--ink-3)', fontSize: 11, marginBottom: 12 }}>Niveau de discernement humain</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {discernement.map(([label, color]) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ display: 'block', height: 6, borderRadius: 999, background: color }} />
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-2)', marginTop: 8 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Reveal y={24}>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '20px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <ScatterMatrix jobs={mira.jobs} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
