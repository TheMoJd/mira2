import Reveal from '../ui/Reveal';
import Button from '../ui/Button';
import mira from '../../data/mira';

export default function FinalCTA() {
  return (
    <section id="cta" style={{ padding: '40px 0 110px' }}>
      <div className="wrap">
        <div style={{ position: 'relative', background: 'var(--dk)', color: 'var(--dk-ink)', borderRadius: 'var(--r-xl)', padding: '84px 56px', textAlign: 'center', overflow: 'hidden' }}>
          <div className="grid-tex" style={{ position: 'absolute', inset: 0, opacity: 0.4, maskImage: 'radial-gradient(80% 80% at 50% 0%, #000, transparent 75%)' }} />
          <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(circle, rgba(53,19,125,.45), transparent 60%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'relative' }}>
            <Reveal>
              <div className="kicker" style={{ color: 'var(--violet-300)', marginBottom: 22 }}>Validation en moins de 90 jours</div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="display" style={{ fontSize: 'clamp(32px,4.4vw,58px)', margin: '0 0 22px', color: '#fff', maxWidth: 760, marginInline: 'auto' }}>
                Donnez à vos équipes RH la <span style={{ fontStyle: 'italic', background: 'linear-gradient(105deg, var(--violet) 0%, #9a6bff 55%, var(--cyan) 130%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>boussole</span> qui leur manque.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p style={{ fontSize: 18, color: 'var(--dk-mut)', maxWidth: 540, margin: '0 auto 34px', lineHeight: 1.6 }}>
                Lancez votre pré-diagnostic sectoriel offert en 10 minutes. Sans engagement.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button primary href="/pre-diagnostic">{mira.brand.cta} <span style={{ fontSize: 17 }}>→</span></Button>
                <Button dark href="#tarifs">Voir les tarifs</Button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
