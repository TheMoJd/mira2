import { useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import { motion, useScroll, useTransform } from 'framer-motion';
import Reveal from '../ui/Reveal';
import Head from '../ui/Head';
import SpotlightCard from '../ui/SpotlightCard';
import { useMotionPrefs, useMediaQuery } from '../../hooks/useMotionPrefs';
import mira from '../../data/mira';
import type { Phase } from '../../data/types';

const halo = (
  <div style={{ position: 'absolute', top: '10%', left: '50%', width: 700, height: 700, transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(53,19,125,.34), transparent 60%)', filter: 'blur(30px)' }} />
);

const head = (
  <Head dark split kicker="Le protocole en 3 phases" title="Du pré-rapport sectoriel au plan de transformation." sub="MIRA n'est pas un chatbot RH. C'est un protocole de diagnostic structuré qui produit une intelligence organisationnelle actionnable." center max={680} />
);

export default function Methode() {
  const { reduced } = useMotionPrefs();
  const desktop = useMediaQuery('(min-width: 1001px)');
  // Storytelling épinglé sur desktop avec motion OK ; sinon la grille
  // d'origine reste le rendu de référence (mobile, reduced-motion).
  const pinned = desktop && !reduced;

  return (
    <section id="methode" style={{ background: 'var(--dk)', color: 'var(--dk-ink)', position: 'relative' }}>
      {pinned ? <MethodePinned /> : <MethodeGrid />}
    </section>
  );
}

/* ---------- Variante fallback : la grille 3 colonnes d'origine ---------- */

function MethodeGrid() {
  return (
    <div style={{ padding: '110px 0', position: 'relative', overflow: 'hidden' }}>
      {halo}
      <div className="wrap" style={{ position: 'relative' }}>
        {head}
        <div className="phases-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {mira.phases.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.1} y={30}>
              <SpotlightCard dark>
                <div style={{ background: 'linear-gradient(180deg, var(--dk-2), var(--dk-1))', border: '1px solid var(--dk-line)', borderRadius: 'var(--r-lg)', padding: '30px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                    <span className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 40, color: 'var(--violet-300)' }}>{p.n}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--violet-300)', border: '1px solid rgba(182,162,255,.35)', borderRadius: 999, padding: '5px 11px' }}>{p.tag}</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: '0 0 6px', color: '#fff', fontWeight: 500 }}>{p.title}</h3>
                  {p.role && <div style={{ fontSize: 13, color: 'var(--violet-300)', marginBottom: 16, fontWeight: 500 }}>{p.role}</div>}
                  <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--dk-mut)', margin: '0 0 20px' }}>{p.body}</p>
                  <div style={{ marginTop: 'auto', display: 'grid', gap: 9, paddingTop: 18, borderTop: '1px solid var(--dk-line)' }}>
                    {p.points.map((pt) => (
                      <div key={pt} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--dk-ink)' }}>
                        <span style={{ color: 'var(--violet)', marginTop: 1 }}>—</span>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Variante desktop : storytelling épinglé au scroll ---------- */

function MethodePinned() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  return (
    // 300vh de piste : le contenu sticky reste à l'écran pendant que le
    // scroll fait défiler les 3 phases. Pas d'overflow hidden ici (il
    // casserait le sticky) — il vit sur l'enfant sticky.
    <div ref={ref} style={{ height: '300vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', padding: '90px 0 48px' }}>
        {halo}
        <div className="wrap" style={{ position: 'relative', width: '100%' }}>
          {head}

          {/* scène : les 3 panneaux superposés se relaient au scroll */}
          <div style={{ position: 'relative', minHeight: 340 }}>
            {mira.phases.map((p, i) => (
              <PhasePane key={p.n} phase={p} index={i} total={mira.phases.length} progress={scrollYProgress} />
            ))}
          </div>

          {/* ligne de progression */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 40 }}>
            <span className="tnum" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dk-mut)' }}>01</span>
            <div style={{ flex: 1, height: 2, background: 'var(--dk-line)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div style={{ scaleX: scrollYProgress, transformOrigin: '0 50%', height: '100%', background: 'linear-gradient(90deg, var(--violet-300), var(--cyan))' }} />
            </div>
            <span className="tnum" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dk-mut)' }}>03</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PhasePaneProps {
  phase: Phase;
  index: number;
  total: number;
  progress: MotionValue<number>;
}

function PhasePane({ phase: p, index, total, progress }: PhasePaneProps) {
  const seg = 1 / total;
  const start = index * seg;
  const end = start + seg;
  const fade = seg * 0.22;

  // Première phase visible dès l'arrivée, dernière visible jusqu'à la sortie.
  const first = index === 0;
  const last = index === total - 1;
  const opacity = useTransform(
    progress,
    first ? [end - fade, end] : last ? [start, start + fade] : [start, start + fade, end - fade, end],
    first ? [1, 0] : last ? [0, 1] : [0, 1, 1, 0]
  );
  const y = useTransform(
    progress,
    first ? [end - fade, end] : [start, start + fade],
    first ? [0, -36] : [36, 0]
  );

  return (
    <motion.div style={{ position: 'absolute', inset: 0, opacity, y, pointerEvents: 'none' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.4fr 0.6fr', gap: 60, alignItems: 'center', height: '100%' }}>
        <div style={{ textAlign: 'right' }}>
          <div className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(90px,11vw,150px)', lineHeight: 1, color: 'var(--violet-300)' }}>{p.n}</div>
          <span style={{ display: 'inline-block', marginTop: 16, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--violet-300)', border: '1px solid rgba(182,162,255,.35)', borderRadius: 999, padding: '5px 11px' }}>{p.tag}</span>
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, margin: '0 0 8px', color: '#fff', fontWeight: 500 }}>{p.title}</h3>
          {p.role && <div style={{ fontSize: 14, color: 'var(--violet-300)', marginBottom: 14, fontWeight: 500 }}>{p.role}</div>}
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--dk-mut)', margin: '0 0 20px', maxWidth: 520 }}>{p.body}</p>
          <div style={{ display: 'grid', gap: 9, paddingTop: 18, borderTop: '1px solid var(--dk-line)', maxWidth: 520 }}>
            {p.points.map((pt) => (
              <div key={pt} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--dk-ink)' }}>
                <span style={{ color: 'var(--violet-300)', marginTop: 1 }}>—</span>
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
