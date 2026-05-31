import { motion, useScroll, useTransform } from 'framer-motion';
import Button from '../ui/Button';
import DashboardMock from '../charts/DashboardMock';
import mira from '../../data/mira';

export default function Hero() {
  const { scrollY } = useScroll();
  const yBlob1 = useTransform(scrollY, [0, 600], [0, 140]);
  const yBlob2 = useTransform(scrollY, [0, 600], [0, -90]);
  const yCard = useTransform(scrollY, [0, 600], [0, 70]);

  return (
    <section id="top" style={{ position: 'relative', paddingTop: 150, paddingBottom: 90, overflow: 'hidden' }}>
      {/* bg texture */}
      <div className="grid-tex" style={{ position: 'absolute', inset: 0, opacity: 0.6, maskImage: 'radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 75%)' }} />
      <motion.div style={{ position: 'absolute', top: -120, right: -80, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(106,69,255,.20), transparent 65%)', filter: 'blur(20px)', y: yBlob1 }} />
      <motion.div style={{ position: 'absolute', bottom: -160, left: -120, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(67,198,232,.16), transparent 65%)', filter: 'blur(20px)', y: yBlob2 }} />

      <div className="wrap hero-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.04fr 0.96fr', gap: 56, alignItems: 'center' }}>
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 14px', borderRadius: 999, background: 'var(--violet-100)', border: '1px solid rgba(106,69,255,.18)', marginBottom: 26 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--violet)' }} />
            <span className="kicker" style={{ color: 'var(--violet-700)' }}>{mira.hero.eyebrow}</span>
          </motion.div>

          <h1 className="display" style={{ fontSize: 'clamp(40px, 5.2vw, 68px)', margin: '0 0 24px', color: 'var(--ink)' }}>
            {[mira.hero.h1a, mira.hero.h1b].map((line, i) => (
              <motion.span key={i} style={{ display: 'block' }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}>
                {line}
              </motion.span>
            ))}
            <motion.span className="italic grad" style={{ display: 'block' }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}>
              {mira.hero.h1c}
            </motion.span>
          </h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.45 }}
            style={{ fontSize: 18.5, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 520, margin: '0 0 34px' }}>
            {mira.hero.sub}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }}
            style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button primary>{mira.brand.cta} <span style={{ fontSize: 17 }}>→</span></Button>
            <Button href="#methode">Voir la méthode</Button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-3)', marginTop: 16, letterSpacing: '.02em' }}>
            {mira.brand.ctaSub}
          </motion.p>
        </div>

        <motion.div style={{ display: 'flex', justifyContent: 'center', y: yCard }}>
          <DashboardMock />
        </motion.div>
      </div>
    </section>
  );
}
