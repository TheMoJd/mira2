import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import WizardButton from '../components/prerapport/WizardButton';
import SourcesAdmin from '../components/admin/SourcesAdmin';
import { Field, Modal, Notice } from '../components/admin/adminUi';
import { changePassword, loadSession, login, logout, type AdminSession } from '../lib/adminApi';

/**
 * Interface admin (`/admin`) : gestion de la stat-bank, c'est-à-dire des documents
 * sources et des statistiques citables du pré-rapport. Réservée aux comptes de la
 * liste `ADMIN_EMAILS` (cf. `netlify/functions/lib/admin.ts`). Hors index moteurs.
 */
export default function Admin() {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [expired, setExpired] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  // Outil interne : jamais indexé, même si l'URL fuitait.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const title = document.title;
    document.title = 'MIRA · Administration des sources';
    return () => {
      meta.remove();
      document.title = title;
    };
  }, []);

  const signOut = () => {
    logout();
    setSession(null);
  };

  // Stable : SourcesAdmin en dépend pour `reload`, une fonction neuve à chaque rendu
  // relancerait le chargement complet de la banque (ex. à l'ouverture de « Mot de passe »).
  const onAuthLost = useCallback(() => {
    logout();
    setSession(null);
    setExpired(true);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-glass)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--line-soft)' }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Logo to="/" />
            <span className="adm-hide-sm" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.04em' }}>ADMINISTRATION</span>
          </div>
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="adm-hide-sm" style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{session.email}</span>
              <button type="button" className="adm-small-btn" onClick={() => setPwdOpen(true)}>Mot de passe</button>
              <button type="button" className="adm-small-btn" onClick={signOut}>Déconnexion</button>
            </div>
          ) : (
            <Link to="/" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)' }}>← Retour au site</Link>
          )}
        </div>
      </header>

      <main className="wrap" style={{ paddingTop: 36, paddingBottom: 80 }}>
        {session ? (
          <>
            <div style={{ marginBottom: 26 }}>
              <div className="kicker" style={{ color: 'var(--violet)', marginBottom: 10 }}>Stat-bank du pré-diagnostic</div>
              <h1 className="display" style={{ fontSize: 'clamp(26px,3.4vw,36px)', margin: '0 0 10px', color: 'var(--ink)' }}>Sources et statistiques</h1>
              <p style={{ margin: 0, maxWidth: 720, fontSize: 15.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                Les seuls chiffres que le modèle a le droit de citer. Chaque statistique est rattachée à un document source, et chaque document liste les sections du rapport qui peuvent le citer.
              </p>
            </div>
            <SourcesAdmin onAuthLost={onAuthLost} />
          </>
        ) : (
          <LoginCard
            expired={expired}
            onLogged={(s) => {
              setExpired(false);
              setSession(s);
            }}
          />
        )}
      </main>

      {pwdOpen && <PasswordModal onClose={() => setPwdOpen(false)} />}
    </div>
  );
}

function LoginCard({ expired, onLogged }: { expired: boolean; onLogged: (s: AdminSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLogged(await login(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="adm-card" style={{ maxWidth: 420, margin: '40px auto 0', display: 'grid', gap: 18, padding: 28 }}>
      <div>
        <h1 className="display" style={{ fontSize: 26, margin: '0 0 6px', color: 'var(--ink)' }}>Connexion</h1>
        <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink-2)' }}>Espace réservé à l’équipe MIRA.</p>
      </div>
      {expired && <Notice tone="warn">Votre session a expiré. Reconnectez-vous.</Notice>}
      <Field label="Email">
        {(id) => <input id={id} className="pr-field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />}
      </Field>
      <Field label="Mot de passe">
        {(id) => <input id={id} className="pr-field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <WizardButton type="submit" disabled={busy || !email || !password} full>{busy ? 'Connexion…' : 'Se connecter'}</WizardButton>
    </form>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pwd.length < 12) return setMsg({ tone: 'error', text: 'Douze caractères minimum.' });
    if (pwd !== confirm) return setMsg({ tone: 'error', text: 'Les deux saisies ne correspondent pas.' });
    setBusy(true);
    try {
      await changePassword(pwd);
      setMsg({ tone: 'ok', text: 'Mot de passe changé.' });
      setPwd('');
      setConfirm('');
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Changement impossible.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Changer de mot de passe" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <Field label="Nouveau mot de passe" hint="Douze caractères minimum.">
          {(id) => <input id={id} className="pr-field" type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />}
        </Field>
        <Field label="Confirmer">
          {(id) => <input id={id} className="pr-field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <WizardButton variant="ghost" onClick={onClose}>Fermer</WizardButton>
          <WizardButton type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Changer'}</WizardButton>
        </div>
      </form>
    </Modal>
  );
}
