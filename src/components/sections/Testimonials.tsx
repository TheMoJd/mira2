import Reveal from '../ui/Reveal';
import Head from '../ui/Head';
import SpotlightCard from '../ui/SpotlightCard';

/**
 * Témoignages — preuve sociale sur la landing.
 *
 * ⚠️ PLACEHOLDER (cf. TODO.md · C1) : témoignages FICTIFS à remplacer par de vrais
 * retours clients dès qu'ils sont disponibles. Volontairement sans nom d'entreprise
 * réel (rôle + secteur seulement) pour ne pas usurper d'identité. Data locale au
 * composant (exception présentationnelle assumée, cf. CLAUDE.md).
 */
const temoignages = [
  {
    quote:
      'Le pré-diagnostic a posé des mots clairs sur ce que nos managers pressentaient. On a enfin une lecture commune de ce qui s’automatise et de ce qui s’augmente, métier par métier.',
    who: 'Directrice des Ressources Humaines',
    org: 'ETI industrielle · 400 salariés',
    initials: 'DRH',
  },
  {
    quote:
      'En dix minutes, on a obtenu une cartographie sourcée que notre comité de direction a prise au sérieux. C’est devenu le point de départ de notre feuille de route compétences.',
    who: 'Directeur Général',
    org: 'PME de services · 140 salariés',
    initials: 'DG',
  },
  {
    quote:
      'Ce que j’ai apprécié : chaque chiffre est sourcé, et la posture reste honnête sur ce qui n’est pas encore documenté. On sent un outil de diagnostic, pas un argumentaire commercial.',
    who: 'Responsable Transformation IA',
    org: 'Réseau de distribution · 320 salariés',
    initials: 'RH',
  },
] as const;

export default function Testimonials() {
  return (
    <section id="temoignages" style={{ padding: '0 0 110px' }}>
      <div className="wrap">
        <Head
          kicker="Ils ont lancé leur pré-diagnostic"
          title="Une lecture externe qui éclaire la décision."
          sub="Premiers retours de DRH et de dirigeants ayant testé le pré-diagnostic MIRA."
          center
          max={620}
        />
        <div className="diff-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {temoignages.map((t, i) => (
            <Reveal key={t.who} delay={(i % 3) * 0.08} y={24}>
              <SpotlightCard>
                <figure
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    margin: 0,
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-lg)',
                    padding: '28px 26px',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{ fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 0.8, color: 'var(--violet)', marginBottom: 12 }}
                  >
                    “
                  </div>
                  <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', flex: 1 }}>
                    {t.quote}
                  </blockquote>
                  <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        background: 'var(--violet-100)',
                        color: 'var(--violet-700)',
                        fontSize: 12,
                        fontWeight: 700,
                        flex: '0 0 auto',
                      }}
                    >
                      {t.initials}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{t.who}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{t.org}</span>
                    </span>
                  </figcaption>
                </figure>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
