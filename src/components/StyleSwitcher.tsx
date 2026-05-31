import { motion } from 'framer-motion';
import { useStyle } from '../context/StyleContext';
import type { Variation } from '../data/types';

const variants: { key: Variation; label: string }[] = [
  { key: 'a', label: 'Éditoriale' },
  { key: 'b', label: 'Données' },
  { key: 'c', label: 'Manifeste' },
];

export default function StyleSwitcher() {
  const { variation, setVariation } = useStyle();

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      // `x: '-50%'` centers via framer-motion's own transform. A CSS
      // `transform: translateX(-50%)` would be overwritten by the `y` animation.
      style={{ position: 'fixed', bottom: 22, left: '50%', x: '-50%', zIndex: 120, maxWidth: 'calc(100vw - 24px)' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(16,10,38,.9)', backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,.12)', borderRadius: 999,
        padding: 6, boxShadow: '0 20px 50px -18px rgba(16,10,38,.7)',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.12em', color: 'var(--dk-mut)', padding: '0 10px 0 12px', textTransform: 'uppercase' }}>
          Style
        </span>
        {variants.map((v) => {
          const on = v.key === variation;
          return (
            <button
              key={v.key}
              onClick={() => setVariation(v.key)}
              style={{
                fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 999, border: 'none',
                background: on ? 'var(--violet)' : 'transparent',
                color: on ? '#fff' : 'var(--dk-mut)',
                transition: 'all .2s', cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
