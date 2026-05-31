import { motion } from 'framer-motion';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import type { Job } from '../../data/types';

interface ScatterMatrixProps {
  jobs: Job[];
  dark?: boolean;
  h?: number;
}

export default function ScatterMatrix({ jobs, dark = false, h = 360 }: ScatterMatrixProps) {
  const [ref, seen] = useInViewOnce();
  const pad = 44;
  const W = 560;
  const H = h;
  const xPos = (opp: number) => pad + (opp / 100) * (W - pad * 2);
  const yPos = (exp: number) => pad + (1 - exp / 100) * (H - pad * 2);
  const grid = dark ? 'rgba(255,255,255,.07)' : 'rgba(22,15,46,.07)';
  const axis = dark ? 'var(--dk-mut)' : 'var(--ink-3)';

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* quadrant tints */}
        <rect x={pad} y={pad} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(239,108,77,.06)" />
        <rect x={pad + (W - pad * 2) / 2} y={pad} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(243,177,63,.06)" />
        <rect x={pad + (W - pad * 2) / 2} y={pad + (H - pad * 2) / 2} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(44,193,143,.07)" />

        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={pad + t * (W - pad * 2)} y1={pad} x2={pad + t * (W - pad * 2)} y2={H - pad} stroke={grid} strokeWidth="1" />
            <line x1={pad} y1={pad + t * (H - pad * 2)} x2={W - pad} y2={pad + t * (H - pad * 2)} stroke={grid} strokeWidth="1" />
          </g>
        ))}

        {/* axis labels */}
        <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="11" fontFamily="var(--mono)" fill={axis} letterSpacing="1.5">
          OPPORTUNITÉ D'AUGMENTATION →
        </text>
        <text x={14} y={H / 2} textAnchor="middle" fontSize="11" fontFamily="var(--mono)" fill={axis} letterSpacing="1.5" transform={`rotate(-90 14 ${H / 2})`}>
          EXPOSITION À L'AUTOMATISATION →
        </text>

        {/* data points */}
        {jobs.map((j, i) => {
          const cx = xPos(j.opp);
          const cy = yPos(j.exp);
          const col = j.exp >= 65 ? 'var(--risk)' : j.opp >= 70 ? 'var(--opp)' : 'var(--violet)';
          return (
            <motion.g
              key={j.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={seen ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              <circle cx={cx} cy={cy} r="7" fill={col} />
              <circle cx={cx} cy={cy} r="13" fill={col} opacity="0.16" />
              <text x={cx + 14} y={cy + 4} fontSize="12" fontWeight="600" fill={dark ? 'var(--dk-ink)' : 'var(--ink-1)'} fontFamily="var(--sans)">
                {j.name}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
