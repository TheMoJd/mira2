import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import Wizard from '../components/prerapport/Wizard';

/** Page du wizard de pré-rapport. Header épuré (pas la nav marketing, dont les
 *  ancres n'existent pas ici), fond signature cohérent avec la landing. */
export default function PreRapport() {
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
        <Wizard />
        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)', marginTop: 22, lineHeight: 1.5 }}>
          Vos données ne sont utilisées que pour produire votre pré-diagnostic.
        </p>
      </main>
    </div>
  );
}
