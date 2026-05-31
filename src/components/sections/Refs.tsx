import Reveal from '../ui/Reveal';
import mira from '../../data/mira';

export default function Refs() {
  return (
    <section style={{ borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)' }}>
      <div className="wrap" style={{ padding: '30px 32px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 36, alignItems: 'center' }}>
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 230, margin: 0, lineHeight: 1.5 }}>
          {mira.refsLead}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 42px', alignItems: 'center' }}>
          {mira.refs.map((r, i) => (
            <Reveal key={r} delay={i * 0.06} y={10}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink-1)', opacity: 0.78, whiteSpace: 'nowrap' }}>{r}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
