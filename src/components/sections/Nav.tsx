import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import mira from '../../data/mira';

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
        background: solid ? 'rgba(245,243,251,.82)' : 'transparent',
        backdropFilter: solid ? 'blur(14px) saturate(1.4)' : 'none',
        borderBottom: solid ? '1px solid var(--line-soft)' : '1px solid transparent',
        transition: 'background .3s, border-color .3s',
      }}
    >
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
        <Logo />

        <nav style={{ display: 'flex', gap: 30 }} className="nav-links">
          {mira.nav.map((l) => (
            <a key={l.href} href={l.href} className="nav-link" style={{ fontSize: 14.5, color: 'var(--ink-2)', fontWeight: 500 }}>
              {l.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="#" className="nav-login" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-1)' }}>Connexion</a>
          <Button primary small>{mira.brand.cta}</Button>
        </div>

        {/* mobile hamburger — hidden on desktop via CSS */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          style={{
            display: 'none', background: 'none', border: 'none', padding: 8,
            color: 'var(--ink)', fontSize: 22, cursor: 'pointer',
          }}
          className="mobile-menu-btn"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>
    </motion.header>
  );
}
