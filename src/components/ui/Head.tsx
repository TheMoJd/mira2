import Reveal from './Reveal';
import SplitText from './SplitText';

interface HeadProps {
  kicker: string;
  title: string;
  sub?: string;
  center?: boolean;
  dark?: boolean;
  max?: number;
  /** true → le titre se révèle mot à mot (SplitText) au lieu du fade Reveal.
   *  À réserver aux sections fortes pour ne pas sur-animer la page. */
  split?: boolean;
}

export default function Head({ kicker, title, sub, center, dark, max = 640, split }: HeadProps) {
  return (
    <div style={{ maxWidth: max, margin: center ? '0 auto' : 0, textAlign: center ? 'center' : 'left', marginBottom: 50 }}>
      <Reveal y={14}>
        <div className="kicker" style={{ color: dark ? 'var(--violet-300)' : 'var(--violet)', marginBottom: 16 }}>{kicker}</div>
      </Reveal>
      {split ? (
        <h2 className="display" style={{ fontSize: 'clamp(30px,3.6vw,46px)', margin: 0, color: dark ? 'var(--dk-ink)' : 'var(--ink)' }}>
          <SplitText text={title} inView delay={0.05} stagger={0.04} duration={0.7} />
        </h2>
      ) : (
        <Reveal y={18} delay={0.05}>
          <h2 className="display" style={{ fontSize: 'clamp(30px,3.6vw,46px)', margin: 0, color: dark ? 'var(--dk-ink)' : 'var(--ink)' }}>
            {title}
          </h2>
        </Reveal>
      )}
      {sub && (
        <Reveal y={16} delay={0.1}>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: dark ? 'var(--dk-mut)' : 'var(--ink-2)', marginTop: 18 }}>{sub}</p>
        </Reveal>
      )}
    </div>
  );
}
