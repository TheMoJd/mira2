import { useState, useEffect } from 'react';

export function useCountTo(
  target: number,
  active: boolean,
  options: { dur?: number; decimals?: number } = {}
): string | number {
  const { dur = 1400, decimals = 0 } = options;
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf: number;
    let start: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      setVal(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else setVal(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, dur]);

  return decimals ? val.toFixed(decimals) : Math.round(val);
}
