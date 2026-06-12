import Lenis from 'lenis';

/** Singleton Lenis : smooth scroll inertiel, desktop uniquement.
 *  Inactif si prefers-reduced-motion ou pointeur grossier (le tactile garde
 *  le scroll natif). Les ancres passent par scrollToAnchor() pour profiter
 *  du lissage — le scroll-behavior: smooth CSS a été retiré pour éviter le
 *  double-lissage. */
let lenis: Lenis | null = null;

export function initSmoothScroll(): void {
  if (lenis || typeof window === 'undefined') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (reduced || !fine) return;

  lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    syncTouch: false,
  });

  const raf = (time: number) => {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

/** Hauteur du header fixe, pour ne pas masquer le haut des sections ciblées. */
const HEADER_OFFSET = -70;

export function scrollToAnchor(hash: string): void {
  const id = hash.startsWith('#') ? hash : `#${hash}`;
  if (lenis) {
    lenis.scrollTo(id, { offset: HEADER_OFFSET });
  } else {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}

/** Verrouillage du scroll (menu mobile) quand Lenis est actif ;
 *  le lock body.overflow reste le fallback quand il ne l'est pas. */
export function stopScroll(): void {
  lenis?.stop();
}

export function startScroll(): void {
  lenis?.start();
}
