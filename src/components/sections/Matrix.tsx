import Reveal from '../ui/Reveal';
import Head from '../ui/Head';
import ScatterMatrix from '../charts/ScatterMatrix';
import mira from '../../data/mira';

const legend = [
  ['var(--risk)', 'Exposition forte — à reconvertir'],
  ['var(--violet)', 'Zone mixte — à arbitrer'],
  ['var(--opp)', 'Fort potentiel — à augmenter'],
] as const;

export default function Matrix() {
  return (
    <section style={{ padding: '20px 0 110px' }}>
      <div className="wrap matrix-grid" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 50, alignItems: 'center' }}>
        <div>
          <Head kicker="Scoring d'exposition" title="Chaque métier, situé." sub="MIRA positionne vos filières sur deux axes : l'exposition à l'automatisation et le potentiel d'augmentation par l'IA. La carte de votre transformation, en un coup d'œil." max={420} />
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {legend.map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--ink-2)' }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />{l}
              </div>
            ))}
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
