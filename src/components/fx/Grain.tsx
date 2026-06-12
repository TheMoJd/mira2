// Bruit SVG statique encodé en data-URI : aucune requête réseau, aucune anim.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Voile de grain global au-dessus de la page (pointer-events: none).
 *  Le mix-blend-mode est appliqué via la classe `.grain` (desktop seulement). */
export default function Grain() {
  return (
    <div
      aria-hidden
      className="grain"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 200,
        backgroundImage: NOISE,
        backgroundSize: '180px 180px',
      }}
    />
  );
}
