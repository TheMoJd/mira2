import Reveal from '../ui/Reveal';
import Marquee from '../ui/Marquee';
import mira from '../../data/mira';

export default function Refs() {
  return (
    <section style={{ borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)' }}>
      <div className="wrap refs-grid" style={{ padding: '30px 32px', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 36, alignItems: 'center' }}>
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 230, margin: 0, lineHeight: 1.5 }}>
          {mira.refsLead}
        </p>
        <Reveal y={10}>
          <Marquee duration={36}>
            {mira.refs.map((r) => (
              <span key={r} style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink-1)', opacity: 0.78, whiteSpace: 'nowrap' }}>{r}</span>
            ))}
          </Marquee>
        </Reveal>
      </div>
    </section>
  );
}
