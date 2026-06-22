import { Link } from 'react-router-dom';

interface LogoProps {
  dark?: boolean;
  /** Destination du logo. `#ancre` → lien natif (scroll dans la page courante) ;
   *  `/route` → navigation routeur. Par défaut `#top` (comportement landing). */
  to?: string;
}

export default function Logo({ dark = false, to = '#top' }: LogoProps) {
  const color = dark ? 'var(--dk-ink)' : 'var(--ink)';
  const style: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };

  const inner = (
    <>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="13" r="12" stroke={color} strokeWidth="1.4" opacity=".25" />
        <circle cx="13" cy="13" r="3.4" fill="var(--violet)" />
        <path d="M13 2.5 L15 11 L13 13 Z" fill={color} />
        <path d="M13 23.5 L11 15 L13 13 Z" fill="var(--violet)" opacity=".5" />
      </svg>
      <span style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, letterSpacing: '.02em', color }}>MIRA</span>
    </>
  );

  return to.startsWith('#') ? (
    <a href={to} style={style} aria-label="MIRA">{inner}</a>
  ) : (
    <Link to={to} style={style} aria-label="MIRA">{inner}</Link>
  );
}
