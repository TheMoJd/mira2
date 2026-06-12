import { useState, useEffect } from 'react';

/** Renvoie l'id de la section actuellement « lue » parmi `ids`.
 *  Une bande médiane du viewport (rootMargin) sert de zone de détection pour
 *  que la section active corresponde à ce que l'utilisateur regarde, pas à ce
 *  qui effleure le bord de l'écran. */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(',');

  useEffect(() => {
    const sections = key
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        const order = key.split(',');
        setActive(order.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: '-30% 0px -55% 0px' }
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);

  return active;
}
