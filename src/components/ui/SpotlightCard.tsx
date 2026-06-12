import { useRef } from 'react';
import type { ReactNode, CSSProperties, PointerEvent } from 'react';
import { useMotionPrefs } from '../../hooks/useMotionPrefs';

interface SpotlightCardProps {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
}

/** Wrapper qui suit le curseur avec un halo radial (pseudo-élément `.spotlight::after`,
 *  pointer-events: none — voir globals.css). Les coordonnées sont poussées en
 *  custom properties pour rester hors du cycle de rendu React. */
export default function SpotlightCard({ children, dark, style }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { finePointer } = useMotionPrefs();

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      className={dark ? 'spotlight spotlight-dark' : 'spotlight'}
      style={{ borderRadius: 'var(--r-lg)', height: '100%', ...style }}
      onPointerMove={finePointer ? onMove : undefined}
    >
      {children}
    </div>
  );
}
