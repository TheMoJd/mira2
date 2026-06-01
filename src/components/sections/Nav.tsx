import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Verrouille le scroll de la page tant que le menu mobile est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Referme le menu si l'on repasse en desktop (≥ 1000px).
  useEffect(() => {
    if (!open) return;
    const onResize = () => { if (window.innerWidth > 1000) setOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  const opaque = solid || open;

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
        background: opaque ? 'rgba(245,243,251,.82)' : 'transparent',
        backdropFilter: opaque ? 'blur(14px) saturate(1.4)' : 'none',
        borderBottom: opaque ? '1px solid var(--line-soft)' : '1px solid transparent',
        transition: 'background .3s, border-color .3s',
      }}
    >
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
        <Logo />

        <nav className="nav-links">
          {mira.nav.map((l) => (
            <a key={l.href} href={l.href} className="nav-link" style={{ fontSize: 14.5, color: 'var(--ink-2)', fontWeight: 500 }}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <a href="#" className="nav-login" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-1)' }}>Connexion</a>
          <Button primary small>{mira.brand.cta}</Button>
        </div>

        {/* hamburger — affiché en ≤1000px via .mobile-menu-btn (CSS) */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="mobile-menu-btn"
          style={{
            background: 'none', border: 'none', padding: 8, alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink)', fontSize: 22, lineHeight: 1, cursor: 'pointer',
          }}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* panneau de menu mobile */}
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden', background: 'rgba(245,243,251,.98)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--line-soft)' }}
          >
            <div className="wrap" style={{ display: 'flex', flexDirection: 'column', padding: '8px 0 24px' }}>
              {mira.nav.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="nav-link"
                  style={{ fontSize: 16, color: 'var(--ink-1)', fontWeight: 500, padding: '14px 4px', borderBottom: '1px solid var(--line-soft)' }}
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#"
                onClick={() => setOpen(false)}
                style={{ fontSize: 16, color: 'var(--ink-1)', fontWeight: 600, padding: '16px 4px 18px' }}
              >
                Connexion
              </a>
              <span onClick={() => setOpen(false)} style={{ display: 'block' }}>
                <Button primary>{mira.brand.cta} <span style={{ fontSize: 17 }}>→</span></Button>
              </span>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
