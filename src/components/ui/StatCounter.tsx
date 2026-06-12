import { motion } from 'framer-motion';
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
    <motion.span
      ref={ref as React.RefObject<HTMLSpanElement>}
      className="tnum"
      style={{ display: 'inline-block' }}
      initial={{ filter: 'blur(6px)', opacity: 0.3 }}
      animate={seen ? { filter: 'blur(0px)', opacity: 1 } : {}}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      {prefix}{display}{suffix}
    </motion.span>
  );
}
