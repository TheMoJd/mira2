import { motion } from 'framer-motion';
import { useMotionPrefs } from '../../hooks/useMotionPrefs';

const EASE = [0.22, 1, 0.36, 1] as const;

interface SplitTextProps {
  text: string;
  /** true → déclenche à l'entrée dans le viewport ; false → au mount (hero). */
  inView?: boolean;
  delay?: number;
  stagger?: number;
  duration?: number;
}

/** Reveal typographique : chaque mot monte depuis un masque (overflow hidden).
 *  Le padding-bottom .12em garde les descendantes de Newsreader hors du crop.
 *  A11y : le texte complet est exposé via aria-label, les mots sont décoratifs.
 *  Reduced-motion : rendu direct sans masque. */
export default function SplitText({ text, inView = false, delay = 0, stagger = 0.05, duration = 0.85 }: SplitTextProps) {
  const { reduced } = useMotionPrefs();

  if (reduced) return <span>{text}</span>;

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  const word = {
    hidden: { y: '115%' },
    visible: { y: '0%', transition: { duration, ease: EASE } },
  };

  return (
    <motion.span
      aria-label={text}
      variants={container}
      initial="hidden"
      {...(inView
        ? { whileInView: 'visible', viewport: { once: true, margin: '-10% 0px' } }
        : { animate: 'visible' })}
    >
      {text.split(' ').map((w, i, arr) => (
        <span
          key={`${w}-${i}`}
          aria-hidden
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.12em', marginBottom: '-0.12em' }}
        >
          <motion.span variants={word} style={{ display: 'inline-block' }}>
            {w}
            {i < arr.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
