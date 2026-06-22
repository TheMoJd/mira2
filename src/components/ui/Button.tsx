import { motion } from 'framer-motion';
import type { ReactNode, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Magnetic from './Magnetic';
import { scrollToAnchor } from '../../lib/scroll';

interface ButtonProps {
  children: ReactNode;
  primary?: boolean;
  dark?: boolean;
  small?: boolean;
  href?: string;
}

export default function Button({ children, primary, dark, small, href = '#cta' }: ButtonProps) {
  const navigate = useNavigate();
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

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Ancre interne → scroll lissé dans la page courante.
    if (href.startsWith('#')) {
      e.preventDefault();
      scrollToAnchor(href);
      return;
    }
    // Route interne → navigation SPA (sans rechargement complet).
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
      return;
    }
    // Lien externe (http…) → comportement natif.
  };

  return (
    <Magnetic>
      <motion.a href={href} onClick={onClick} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} style={style}>
        {children}
      </motion.a>
    </Magnetic>
  );
}
