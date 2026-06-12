import { useRef } from 'react';
import type { ReactNode, PointerEvent } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useMotionPrefs } from '../../hooks/useMotionPrefs';

interface MagneticProps {
  children: ReactNode;
  /** Déplacement max en px (gardé faible : signature, pas gadget). */
  strength?: number;
}

/** Effet magnétique : l'enfant suit légèrement le curseur (spring) et revient
 *  au repos en sortie. Inerte sur tactile et en reduced-motion. */
export default function Magnetic({ children, strength = 6 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced, finePointer } = useMotionPrefs();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 18, mass: 0.5 });
  const y = useSpring(my, { stiffness: 260, damping: 18, mass: 0.5 });

  if (reduced || !finePointer) return <>{children}</>;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const relX = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const relY = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    mx.set(Math.max(-1, Math.min(1, relX)) * strength);
    my.set(Math.max(-1, Math.min(1, relY)) * strength);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ display: 'inline-block', x, y }}
    >
      {children}
    </motion.div>
  );
}
