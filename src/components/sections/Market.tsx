import Reveal from '../ui/Reveal';
import StatCounter from '../ui/StatCounter';
import mira from '../../data/mira';

export default function Market() {
  const m = mira.market;
  return (
    <section style={{ padding: '20px 0 100px' }}>
      <div className="wrap">
        <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 50, alignItems: 'center', background: 'var(--bg-soft)', borderRadius: 'var(--r-xl)', padding: '56px 56px', border: '1px solid var(--line-soft)' }}>
          <div>
            <Reveal>
              <div className="kicker" style={{ color: 'var(--violet)', marginBottom: 16 }}>{m.kicker}</div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="display" style={{ fontSize: 'clamp(28px,3.2vw,42px)', margin: '0 0 20px' }}>{m.title}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p style={{ fontSize: 17.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, maxWidth: 460 }}>{m.body}</p>
            </Reveal>
          </div>
          <div style={{ display: 'grid', gap: 18 }}>
            <Reveal delay={0.1}>
              <div style={{ background: 'var(--paper)', borderRadius: 'var(--r-lg)', padding: '28px 30px', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="tnum grad" style={{ fontFamily: 'var(--serif)', fontSize: 56, lineHeight: 1 }}>
                  <StatCounter value={m.big.value} suffix={m.big.suffix} decimals={1} />
                </div>
                <p style={{ fontSize: 14.5, color: 'var(--ink-2)', margin: '12px 0 0', lineHeight: 1.5 }}>{m.big.label}</p>
              </div>
            </Reveal>
            <Reveal delay={0.18}>
              <div style={{ background: 'var(--dk-1)', color: 'var(--dk-ink)', borderRadius: 'var(--r-lg)', padding: '24px 30px', display: 'flex', alignItems: 'center', gap: 22 }}>
                <div className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 52, lineHeight: 1, color: '#fff' }}>
                  <StatCounter value={m.side.value} prefix={m.side.prefix} />
                </div>
                <p style={{ fontSize: 14, color: 'var(--dk-mut)', margin: 0, lineHeight: 1.5 }}>{m.side.label}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
