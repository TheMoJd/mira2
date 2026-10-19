import { useCallback, useEffect, useId, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/** Primitives de l'interface admin. Outil interne : sobre, dense, lisible. */

interface ModalProps {
  title: string;
  onClose: () => void;
  /** Saisie en cours non enregistrée ? Si oui, fermer demande confirmation. */
  isDirty?: () => boolean;
  children: ReactNode;
}

/**
 * Fenêtre modale. Échap, la croix et un clic sur le fond passent par `requestClose`,
 * qui demande confirmation s'il y a une saisie en cours : un geste réflexe ne doit pas
 * effacer dix minutes de saisie. Les refs gardent les écouteurs stables même si le
 * parent repasse des fonctions neuves à chaque rendu.
 */
export function Modal({ title, onClose, isDirty, children }: ModalProps) {
  const latest = useRef({ onClose, isDirty });
  latest.current = { onClose, isDirty };
  /** Le clic a-t-il COMMENCÉ sur le fond ? (une sélection de texte tirée hors d'un champ ne ferme rien) */
  const downOnBackdrop = useRef(false);

  const requestClose = useCallback(() => {
    const { onClose: close, isDirty: dirty } = latest.current;
    if (dirty?.() && !window.confirm('Abandonner la saisie en cours ? Elle ne sera pas enregistrée.')) return;
    close();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Échap sert d'abord à refermer une liste de suggestions ou un menu déroulant.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'SELECT' || (t.tagName === 'INPUT' && t.hasAttribute('list')))) return;
      requestClose();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [requestClose]);

  return (
    <div
      className="adm-overlay"
      role="presentation"
      onMouseDown={(e) => (downOnBackdrop.current = e.target === e.currentTarget)}
      onMouseUp={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) requestClose();
        downOnBackdrop.current = false;
      }}
    >
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <h2 className="display" style={{ fontSize: 24, margin: 0, color: 'var(--ink)' }}>{title}</h2>
          <button type="button" className="adm-icon-btn" onClick={requestClose} aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Suivi « saisie modifiée » d'un formulaire : compare l'état courant à celui du
 * premier rendu et prévient le parent à chaque changement.
 */
export function useDirtyTracking(current: unknown, onDirtyChange?: (dirty: boolean) => void): void {
  const snapshot = useRef<string | null>(null);
  const serialized = JSON.stringify(current);
  if (snapshot.current === null) snapshot.current = serialized;
  const dirty = serialized !== snapshot.current;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
}

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
  style?: CSSProperties;
}

/** Libellé + champ + aide + erreur, reliés pour l'accessibilité. */
export function Field({ label, hint, error, children, style }: FieldProps) {
  const id = useId();
  return (
    <div style={style}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 7 }}>
        {label}
      </label>
      {children(id)}
      {hint && !error && <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)' }}>{hint}</p>}
      {error && <p role="alert" style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--risk)' }}>{error}</p>}
    </div>
  );
}

type Tone = 'violet' | 'neutral' | 'risk' | 'amber' | 'opp';
const TONES: Record<Tone, CSSProperties> = {
  violet: { background: 'var(--violet-100)', color: 'var(--violet)' },
  neutral: { background: 'var(--bg-soft)', color: 'var(--ink-2)' },
  risk: { background: 'rgba(239,108,77,.12)', color: '#b8432a' },
  amber: { background: 'rgba(243,177,63,.18)', color: '#8a5a07' },
  opp: { background: 'rgba(44,193,143,.14)', color: '#17775a' },
};

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      style={{
        ...TONES[tone],
        display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999,
        padding: '3px 9px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** Bouton texte compact des lignes de liste. */
export function SmallButton({
  children, onClick, danger, disabled,
}: { children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={`adm-small-btn${danger ? ' adm-small-btn--danger' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** Bandeau de message (succès, erreur, avertissement). */
export function Notice({ tone, children }: { tone: 'ok' | 'error' | 'warn'; children: ReactNode }) {
  const palette = {
    ok: { bg: 'rgba(44,193,143,.12)', fg: '#17775a' },
    error: { bg: 'rgba(239,108,77,.12)', fg: '#b8432a' },
    warn: { bg: 'rgba(243,177,63,.16)', fg: '#7a4f05' },
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{ background: palette.bg, color: palette.fg, borderRadius: 'var(--r-sm)', padding: '11px 14px', fontSize: 14, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}
