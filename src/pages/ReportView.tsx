/**
 * ReportView — page `/rapport/:leadId` (livraison par email)
 * ==========================================================
 * Depuis le passage en livraison email-only, cette page n'affiche plus le
 * rapport : le pré-rapport est envoyé en PDF directement par email. On conserve
 * la route pour que les anciens liens (favoris, partages) tombent sur un message
 * clair plutôt que sur une page introuvable.
 */
import { Link } from 'react-router-dom';

export default function ReportView() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 460 }}>
        <div
          aria-hidden
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            margin: '0 auto 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--violet-100)',
            color: 'var(--violet)',
            fontSize: 30,
          }}
        >
          ✓
        </div>
        <h1
          style={{
            fontFamily: 'var(--serif, Georgia, serif)',
            fontSize: 'clamp(22px,4vw,28px)',
            fontWeight: 500,
            color: 'var(--ink)',
            margin: '0 0 12px',
          }}
        >
          Votre pré-diagnostic arrive par email
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 24px' }}>
          Nous livrons votre pré-diagnostic MIRA en PDF directement par email, d’ici 1 à 2 minutes après
          votre demande. Pensez à vérifier vos courriers indésirables.
        </p>
        <Link
          to="/"
          className="mira-btn-primary"
          style={{
            fontWeight: 600,
            padding: '10px 18px',
            borderRadius: 'var(--r-sm, 10px)',
            textDecoration: 'none',
          }}
        >
          Retour à l’accueil
        </Link>
      </div>
    </div>
  );
}
