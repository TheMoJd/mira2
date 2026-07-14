import Logo from '../ui/Logo';
import mira from '../../data/mira';

/** Liens de pied de page, alignés sur les noms de sections v2 (nav) ; les
 *  entrées sans destination réelle gardent `#` en attendant leurs pages. */
const footerLinks = [
  ['Produit', [
    { label: 'Le pré-diagnostic', href: '/pre-diagnostic' },
    { label: 'Le produit', href: '#produit' },
    { label: 'Feuille de route', href: '#lectures' },
    { label: 'Accompagnement', href: '#tarifs' },
  ]],
  ['Ressources', [
    { label: 'Méthodologie', href: '#methode' },
    { label: 'Sources de référence', href: '#' },
    { label: 'Conformité RGPD', href: '#conformite' },
    { label: 'Loi Avenir', href: '#' },
  ]],
  ['Société', [
    { label: "L'équipe", href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Mentions légales', href: '#' },
    { label: 'DPA', href: '#' },
  ]],
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
                <a key={it.label} href={it.href} style={{ fontSize: 14, color: 'var(--ink-2)' }}>{it.label}</a>
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
