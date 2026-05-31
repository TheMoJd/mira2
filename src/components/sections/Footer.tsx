import Logo from '../ui/Logo';
import mira from '../../data/mira';

const footerLinks = [
  ['Produit', ['Le pré-rapport', 'Entretiens augmentés', 'Les 3 lectures', 'Tarifs']],
  ['Ressources', ['Méthodologie', 'Sources de référence', 'Conformité RGPD', 'Loi Avenir']],
  ['Société', ["L'équipe", 'Contact', 'Mentions légales', 'DPA']],
] as const;

export default function Footer() {
  return (
    <footer style={{ background: 'var(--paper)', borderTop: '1px solid var(--line-soft)', padding: '56px 0 40px' }}>
      <div className="wrap footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 36 }}>
        <div>
          <Logo />
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '16px 0 0', maxWidth: 280, lineHeight: 1.6 }}>
            {mira.brand.full} sur les ressources humaines et les aptitudes professionnelles.
          </p>
        </div>
        {footerLinks.map(([heading, items]) => (
          <div key={heading}>
            <div className="kicker" style={{ color: 'var(--ink-3)', marginBottom: 16 }}>{heading}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {items.map((it) => (
                <a key={it} href="#" style={{ fontSize: 14, color: 'var(--ink-2)' }}>{it}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="wrap" style={{ marginTop: 44, paddingTop: 24, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>© 2026 MIRA · Mapping des Impacts et des Risques IA</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>L'IA redessine la carte. MIRA donne la boussole.</span>
      </div>
    </footer>
  );
}
