import Reveal from '../ui/Reveal';
import StatCounter from '../ui/StatCounter';
import Head from '../ui/Head';
import mira from '../../data/mira';
import type { StatTone } from '../../data/types';

const toneColor: Record<StatTone, string> = {
  risk: 'var(--risk)',
  amber: 'var(--amber)',
  violet: 'var(--violet)',
  cyan: 'var(--cyan)',
};

export default function Stats() {
  return (
    <section style={{ padding: '100px 0' }}>
      <div className="wrap">
        <Head kicker="L'angle mort des directions RH" title="Ce que l'IA change. Sans que personne ne le mesure." max={560} />
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {mira.stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} y={0}>
              <div style={{ background: 'var(--paper)', padding: '34px 26px', height: '100%' }}>
                <div className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 58, lineHeight: 1, color: toneColor[s.tone], marginBottom: 16 }}>
                  <StatCounter value={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink-2)', margin: 0 }}>{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
