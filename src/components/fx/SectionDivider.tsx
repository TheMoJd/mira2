interface SectionDividerProps {
  /** Couleur (token CSS) de la section au-dessus. */
  from: string;
  /** Couleur de la section en-dessous — celle de la vague. */
  to: string;
  /** Miroir horizontal pour varier la même courbe. */
  flip?: boolean;
}

/** Transition en courbe douce entre deux sections de couleurs différentes.
 *  Hauteur fixe (70px) + preserveAspectRatio none ⇒ zéro CLS. */
export default function SectionDivider({ from, to, flip }: SectionDividerProps) {
  return (
    <div aria-hidden style={{ background: from, lineHeight: 0, transform: flip ? 'scaleX(-1)' : undefined }}>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 70 }}>
        <path d="M0,70 L0,46 C240,10 480,2 720,18 C960,34 1200,62 1440,26 L1440,70 Z" fill={to} />
      </svg>
    </div>
  );
}
