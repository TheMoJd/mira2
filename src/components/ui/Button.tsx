import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  primary?: boolean;
  dark?: boolean;
  small?: boolean;
  href?: string;
}

export default function Button({ children, primary, dark, small, href = '#cta' }: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999,
    padding: small ? '9px 16px' : '13px 22px',
    fontSize: small ? 13.5 : 15, fontWeight: 600,
    border: '1px solid transparent',
    transition: 'transform .15s ease, box-shadow .2s ease, background .2s ease',
    whiteSpace: 'nowrap',
  };
  const style: React.CSSProperties = primary
    ? { ...base, background: 'var(--violet)', color: '#fff', boxShadow: '0 8px 22px -8px rgba(53,19,125,.6)' }
    : dark
      ? { ...base, background: 'rgba(255,255,255,.06)', color: 'var(--dk-ink)', borderColor: 'var(--dk-line)' }
      : { ...base, background: 'transparent', color: 'var(--ink)', borderColor: 'var(--line)' };

  return (
    <motion.a href={href} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} style={style}>
      {children}
    </motion.a>
  );
}
