import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/ui/Logo';
import ContactForm from '../components/contact/ContactForm';
import { contact } from '../data/contact';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Page de la fiche contact (« parcours MIRA / analyse complète »). Reprend le
 *  même habillage épuré que la page du wizard : header léger, fond signature. */
export default function Contact() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Fond signature : halo violet + quadrillage, atténués vers le bas. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)',
          width: 720, height: 480, pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(182,162,255,.28), transparent 65%)', filter: 'blur(50px)',
        }}
      />
      <div
        className="grid-tex"
        aria-hidden
        style={{ position: 'absolute', inset: 0, opacity: 0.7, maskImage: 'linear-gradient(180deg, #000 30%, transparent 75%)' }}
      />

      {/* Header épuré */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
          background: 'rgba(245,243,251,.82)', backdropFilter: 'blur(14px) saturate(1.4)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <Logo to="/" />
          <Link to="/" className="nav-login" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-1)' }}>
            ← Retour au site
          </Link>
        </div>
      </header>

      <main className="wrap" style={{ position: 'relative', maxWidth: 760, paddingTop: 116, paddingBottom: 80 }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ marginBottom: 34 }}
        >
          <div className="kicker" style={{ color: 'var(--violet)', marginBottom: 16 }}>{contact.intro.eyebrow}</div>
          <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: '0 0 16px', color: 'var(--ink)' }}>{contact.intro.title}</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, maxWidth: 600 }}>{contact.intro.sub}</p>
        </motion.div>

        <ContactForm />
      </main>
    </div>
  );
}
