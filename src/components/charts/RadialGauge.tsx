import { useId } from 'react';
import { motion } from 'framer-motion';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { useCountTo } from '../../hooks/useCountTo';

interface RadialGaugeProps {
  value?: number;
  max?: number;
  size?: number;
  stroke?: number;
  dark?: boolean;
}

export default function RadialGauge({ value = 61, max = 100, size = 168, stroke = 13, dark = false }: RadialGaugeProps) {
  const uid = useId();
  const gradId = `gauge-grad-${uid.replace(/:/g, '')}`;
  const [ref, seen] = useInViewOnce();
  const n = useCountTo(value, seen, { dur: 1600 });
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value / max;
  const track = dark ? 'rgba(255,255,255,.12)' : 'rgba(22,15,46,.09)';

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6a45ff" />
            <stop offset="60%" stopColor="#9a6bff" />
            <stop offset="100%" stopColor="#43c6e8" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={seen ? { strokeDashoffset: c * (1 - pct) } : {}}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: size * 0.30, lineHeight: 1, color: dark ? 'var(--dk-ink)' : 'var(--ink)', fontWeight: 500 }}>
            {n}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: dark ? 'var(--dk-mut)' : 'var(--ink-3)', marginTop: 2 }}>
            / {max}
          </div>
        </div>
      </div>
    </div>
  );
}
