import { useRef, useState, useEffect } from 'react';

export function useInViewOnce(margin = '-12% 0px') {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: margin, threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);

  return [ref, seen] as const;
}
