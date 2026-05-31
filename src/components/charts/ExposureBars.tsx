import { motion } from 'framer-motion';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import type { Job } from '../../data/types';

interface ExposureBarsProps {
  jobs: Job[];
  dark?: boolean;
  max?: number;
}

function barColor(exp: number) {
  if (exp >= 65) return 'var(--risk)';
  if (exp >= 45) return 'var(--amber)';
  return 'var(--opp)';
}

export default function ExposureBars({ jobs, dark = false, max = 6 }: ExposureBarsProps) {
  const [ref, seen] = useInViewOnce();
  const list = jobs.slice(0, max);

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} style={{ display: 'grid', gap: 13 }}>
      {list.map((j, i) => (
        <div key={j.name} style={{ display: 'grid', gridTemplateColumns: '118px 1fr 40px', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: dark ? 'var(--dk-mut)' : 'var(--ink-2)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {j.name}
          </span>
          <div style={{ height: 8, borderRadius: 6, background: dark ? 'rgba(255,255,255,.08)' : 'rgba(22,15,46,.06)', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: 6, background: barColor(j.exp) }}
              initial={{ width: 0 }}
              animate={seen ? { width: `${j.exp}%` } : {}}
              transition={{ duration: 1.1, delay: 0.1 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="tnum" style={{ fontSize: 12, fontFamily: 'var(--mono)', color: dark ? 'var(--dk-ink)' : 'var(--ink-1)', textAlign: 'right' }}>
            {j.exp}
          </span>
        </div>
      ))}
    </div>
  );
}
