import { motion, useScroll, useTransform } from 'framer-motion';
import Button from '../ui/Button';
import Reveal from '../ui/Reveal';
import DashboardMock from '../charts/DashboardMock';
import mira from '../../data/mira';

// Métriques d'en-tête, purement présentationnelles et propres au hero —
// même convention que les `const` locaux de Matrix/Lectures/Footer.
const ticker = [
  { k: 'Vulnérabilité moy.', v: '61', s: '/100', c: 'var(--risk)' },
  { k: 'Métiers cartographiés', v: '12', s: 'filières', c: 'var(--violet)' },
  { k: 'Opportunité Data/IT', v: '+82', s: '%', c: 'var(--opp)' },
  { k: 'Rapports croisés', v: '5', s: 'sources', c: 'var(--cyan)' },
];

export default function Hero() {
  const { scrollY } = useScroll();
  const yCard = useTransform(scrollY, [0, 600], [0, 60]);
  const { eyebrow, h1a, h1b, sub } = mira.hero;

  return (
    <section id="top" style={{ position: 'relative', paddingTop: 142, paddingBottom: 0, overflow: 'hidden' }}>
      <div className="grid-tex" style={{ position: 'absolute', inset: 0, opacity: 1, maskImage: 'linear-gradient(180deg, #000 40%, transparent 95%)' }} />

      <div className="wrap hero-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 50, alignItems: 'center', paddingBottom: 56 }}>
        <div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 26, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--violet-700)', textTransform: 'uppercase', border: '1px solid var(--line)', background: 'var(--paper)', padding: '7px 13px', borderRadius: 6 }}
          >
            <span style={{ width: 7, height: 7, background: 'var(--opp)', borderRadius: '50%' }} /> {eyebrow}
          </motion.div>

          <h1 className="display" style={{ fontSize: 'clamp(38px,5vw,62px)', margin: '0 0 22px', color: 'var(--ink)' }}>
            <motion.span style={{ display: 'block' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {h1a}
            </motion.span>
            <motion.span className="grad" style={{ display: 'block' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}>
              {h1b}
            </motion.span>
          </h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 500, margin: '0 0 30px' }}>
            {sub}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button primary>{mira.brand.cta} <span style={{ fontSize: 17 }}>→</span></Button>
            <Button href="#lectures">Explorer un rapport</Button>
          </motion.div>
        </div>

        <motion.div style={{ display: 'flex', justifyContent: 'center', y: yCard }}>
          <DashboardMock />
        </motion.div>
      </div>

      {/* live ticker */}
      <div style={{ position: 'relative', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="wrap ticker-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {ticker.map((t, i) => (
            <Reveal key={t.k} delay={i * 0.07} y={0}>
              <div style={{ padding: '22px 24px', borderLeft: i ? '1px solid var(--line)' : 'none' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>{t.k}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 32, color: t.c }}>{t.v}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t.s}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
