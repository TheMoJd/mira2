import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface WizardButtonProps {
  children: ReactNode;
  /** Style visuel. `primary` = pilule violette (CTA), `ghost` = contour discret. */
  variant?: 'primary' | 'ghost';
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  /** Occupe toute la largeur disponible (utile en mobile / écran de succès). */
  full?: boolean;
}

/** Bouton d'action du wizard. Reprend l'allure du `Button` de la landing
 *  (pilule, easing, micro-interactions) mais en vrai `<button>` — sémantique
 *  correcte pour des actions de formulaire (submit, focus clavier). */
export default function WizardButton({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  full = false,
}: WizardButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    padding: '13px 24px',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'var(--sans)',
    border: '1px solid transparent',
    width: full ? '100%' : undefined,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'box-shadow .2s ease, background .2s ease, opacity .2s ease',
  };

  const style: React.CSSProperties =
    variant === 'primary'
      ? { ...base, background: 'var(--violet)', color: '#fff', boxShadow: '0 8px 22px -8px rgba(53,19,125,.6)' }
      : { ...base, background: 'transparent', color: 'var(--ink-1)', borderColor: 'var(--line)' };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      style={style}
    >
      {children}
    </motion.button>
  );
}
