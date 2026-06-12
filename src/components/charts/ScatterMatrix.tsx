import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import type { Job } from '../../data/types';

interface ScatterMatrixProps {
  jobs: Job[];
  dark?: boolean;
  h?: number;
}

export default function ScatterMatrix({ jobs, dark = false, h = 360 }: ScatterMatrixProps) {
  const [ref, seen] = useInViewOnce();
  const [hover, setHover] = useState<string | null>(null);
  const pad = 44;
  const W = 560;
  const H = h;
  const xPos = (opp: number) => pad + (opp / 100) * (W - pad * 2);
  const yPos = (exp: number) => pad + (1 - exp / 100) * (H - pad * 2);
  const grid = dark ? 'rgba(255,255,255,.07)' : 'rgba(22,15,46,.07)';
  const axis = dark ? 'var(--dk-mut)' : 'var(--ink-3)';
  const hovered = hover ? jobs.find((j) => j.name === hover) : undefined;

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* quadrant tints */}
        <rect x={pad} y={pad} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(239,108,77,.06)" />
        <rect x={pad + (W - pad * 2) / 2} y={pad} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(243,177,63,.06)" />
        <rect x={pad + (W - pad * 2) / 2} y={pad + (H - pad * 2) / 2} width={(W - pad * 2) / 2} height={(H - pad * 2) / 2} fill="rgba(44,193,143,.07)" />

        {/* grid lines — dessinées à l'entrée dans le viewport */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, ti) => (
          <g key={t}>
            <motion.line
              x1={pad + t * (W - pad * 2)} y1={pad} x2={pad + t * (W - pad * 2)} y2={H - pad}
              stroke={grid} strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={seen ? { pathLength: 1 } : {}}
              transition={{ duration: 0.7, delay: ti * 0.06, ease: 'easeOut' }}
            />
            <motion.line
              x1={pad} y1={pad + t * (H - pad * 2)} x2={W - pad} y2={pad + t * (H - pad * 2)}
              stroke={grid} strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={seen ? { pathLength: 1 } : {}}
              transition={{ duration: 0.7, delay: 0.05 + ti * 0.06, ease: 'easeOut' }}
            />
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
          const isHover = hover === j.name;
          return (
            <motion.g
              key={j.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={seen ? { opacity: 1, scale: 1 } : {}}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 + i * 0.07 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              onPointerEnter={() => setHover(j.name)}
              onPointerLeave={() => setHover(null)}
            >
              {/* zone de hit élargie (tap mobile compris) */}
              <circle cx={cx} cy={cy} r="20" fill="transparent" />
              <motion.circle
                cx={cx} cy={cy} fill={col} opacity={isHover ? 0.26 : 0.16}
                initial={{ r: 13 }}
                animate={{ r: isHover ? 17 : 13 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              />
              <motion.circle
                cx={cx} cy={cy} fill={col}
                initial={{ r: 7 }}
                animate={{ r: isHover ? 9 : 7 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              />
              <text x={cx + 14} y={cy + 4} fontSize="12" fontWeight="600" fill={dark ? 'var(--dk-ink)' : 'var(--ink-1)'} fontFamily="var(--sans)">
                {j.name}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* tooltip HTML positionné en % du conteneur (pas de foreignObject : bugs Safari) */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key={hovered.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${(xPos(hovered.opp) / W) * 100}%`,
              top: `${(yPos(hovered.exp) / H) * 100}%`,
              transform: 'translate(-50%, -135%)',
              pointerEvents: 'none',
              background: dark ? 'var(--paper)' : 'var(--ink)',
              color: dark ? 'var(--ink)' : 'var(--dk-ink)',
              borderRadius: 10,
              padding: '8px 12px',
              boxShadow: 'var(--shadow)',
              fontSize: 12.5,
              whiteSpace: 'nowrap',
              zIndex: 5,
            }}
          >
            <strong>{hovered.name}</strong>
            <span style={{ opacity: 0.75 }}> · exposition {hovered.exp} · opportunité {hovered.opp}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
