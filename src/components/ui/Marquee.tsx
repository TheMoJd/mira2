import type { ReactNode, CSSProperties } from 'react';
import { useMotionPrefs } from '../../hooks/useMotionPrefs';

interface MarqueeProps {
  children: ReactNode;
  /** Durée d'un tour complet, en secondes. */
  duration?: number;
  /** Espace entre les items, en px. */
  gap?: number;
}

/** Défilement horizontal infini : le contenu est dupliqué (copie aria-hidden)
 *  et la piste translate de -50% en boucle. Pause au survol, fondu sur les
 *  bords via mask-image (classes dans globals.css). Reduced-motion : retombe
 *  sur un simple wrap statique. */
export default function Marquee({ children, duration = 40, gap = 42 }: MarqueeProps) {
  const { reduced } = useMotionPrefs();

  if (reduced) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: `18px ${gap}px`, alignItems: 'center' }}>
        {children}
      </div>
    );
  }

  const vars = { '--marquee-dur': `${duration}s`, '--marquee-gap': `${gap}px` } as CSSProperties;

  return (
    <div className="marquee" style={vars}>
      <div className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
