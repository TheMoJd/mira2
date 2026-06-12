import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);

  return matches;
}

/** Préférences motion/pointeur consommées par tous les effets décoratifs :
 *  `reduced` coupe les animations, `finePointer` réserve les interactions
 *  curseur (spotlight, magnetic, tilt) aux dispositifs à souris. */
export function useMotionPrefs() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const finePointer = useMediaQuery('(pointer: fine)');
  return { reduced, finePointer };
}
