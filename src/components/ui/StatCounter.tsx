import { useInViewOnce } from '../../hooks/useInViewOnce';
import { useCountTo } from '../../hooks/useCountTo';

interface StatCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  dur?: number;
}

export default function StatCounter({ value, suffix = '', prefix = '', decimals = 0, dur = 1500 }: StatCounterProps) {
  const [ref, seen] = useInViewOnce();
  const n = useCountTo(value, seen, { dur, decimals });
  const display = decimals
    ? Number(n).toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Number(n).toLocaleString('fr-FR');
  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className="tnum">
      {prefix}{display}{suffix}
    </span>
  );
}
