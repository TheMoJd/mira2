import Reveal from './Reveal';

interface HeadProps {
  kicker: string;
  title: string;
  sub?: string;
  center?: boolean;
  dark?: boolean;
  max?: number;
}

export default function Head({ kicker, title, sub, center, dark, max = 640 }: HeadProps) {
  return (
    <div style={{ maxWidth: max, margin: center ? '0 auto' : 0, textAlign: center ? 'center' : 'left', marginBottom: 50 }}>
      <Reveal y={14}>
        <div className="kicker" style={{ color: 'var(--violet)', marginBottom: 16 }}>{kicker}</div>
      </Reveal>
      <Reveal y={18} delay={0.05}>
        <h2 className="display" style={{ fontSize: 'clamp(30px,3.6vw,46px)', margin: 0, color: dark ? 'var(--dk-ink)' : 'var(--ink)' }}>
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal y={16} delay={0.1}>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: dark ? 'var(--dk-mut)' : 'var(--ink-2)', marginTop: 18 }}>{sub}</p>
        </Reveal>
      )}
    </div>
  );
}
