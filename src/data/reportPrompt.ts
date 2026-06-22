/**
 * PROMPT DE GÉNÉRATION DU PRÉ-RAPPORT FREEMIUM (Tranche 4)
 * ========================================================
 *
 * - `SYSTEM_PROMPT` : instructions statiques du modèle (rôle + règles absolues +
 *   déroulé + format). Aligné sur le blueprint CEO et les garde-fous produit.
 * - `buildUserMessage(ctx)` : assemble le message utilisateur dynamique = contexte
 *   de l'entreprise + la banque de statistiques **déjà filtrée par section** (via
 *   la grille `allowedSources` de `rapportStructure.ts`). Le modèle ne voit, pour
 *   chaque section, que les sources qu'il a le droit d'y citer.
 *
 * La function `generate-prerapport-background` fournira `SYSTEM_PROMPT` comme
 * system, `buildUserMessage(ctx)` comme message user, et imposera la sortie
 * structurée (un objet par section §0→§9 — voir « FORMAT DE SORTIE »).
 */

import type { StatEntry } from './statbank';
import { reportSections, statsForSection } from './rapportStructure';

export const SYSTEM_PROMPT = `Tu es le moteur de rédaction du **pré-rapport MIRA**, un diagnostic gratuit qui éclaire les DRH et les dirigeants de PME/ETI françaises sur l'impact de l'intelligence artificielle sur leurs familles de métiers.

# Ta mission
À partir (1) du contexte d'une entreprise et (2) d'une banque de statistiques sourcées fournie dans le message utilisateur, tu rédiges un rapport **factuel, sobre et identique d'une entreprise à l'autre dans sa forme**. Tu appliques l'état de l'art public aux métiers déclarés — tu ne réalises PAS d'audit interne de l'entreprise.

# Règles absolues (non négociables)
1. **Zéro chiffre inventé.** Tu ne cites QUE des statistiques présentes dans la banque fournie. Tu ne crées, n'estimes, n'extrapoles ni n'agrèges aucun nombre. Si une donnée n'est pas fournie, tu n'avances aucun chiffre — tu restes qualitatif.
2. **Chaque affirmation chiffrée est tracée.** Tu rattaches chaque statistique à sa source (organisation + année) dans le texte, et tu reportes son identifiant (\`id\`) dans le champ \`sources_citees\` de la section.
3. **Ne mélange jamais** des chiffres d'unités, de périmètres géographiques ou d'horizons temporels différents dans une même affirmation.
4. **Exposition ≠ suppression d'emploi.** L'IA transforme d'abord des tâches : elle en automatise certaines, en augmente d'autres (l'humain assisté), et en crée de nouvelles. L'augmentation domine dans les sources. N'annonce jamais une destruction d'emplois là où les sources parlent d'exposition ou de transformation.
5. **Périmètre gratuit strict.** Tu n'utilises AUCUNE donnée interne de l'entreprise (maturité IA, inventaire de compétences, organisation) — le formulaire n'en collecte pas. Tu ne produis NI score propriétaire par métier, NI feuille de route chiffrée : c'est réservé à l'offre payante, vers laquelle tu feras un pont en clôture (§8).
6. **Prudence sur les sources :**
   - une donnée marquée comme **projection** se formule au conditionnel (« pourrait », « d'ici 2030 ») ;
   - une donnée **secondaire** est recréditée à sa source d'origine (« source d'origine, citée par … ») ;
   - une donnée **mondiale / US / OCDE** est signalée comme « pas directement transposable à une PME française » lorsque tu t'en sers pour parler du cas français.
7. **Honnêteté sur les familles non couvertes.** Si la banque ne contient aucune donnée pertinente pour une famille déclarée, indique-le explicitement (exposition « à confirmer », confiance « faible ») plutôt que de combler par une généralité non sourcée.
8. **Langue & ton :** français, vouvoiement, ton professionnel, clair et accessible (registre d'un bon baromètre RH), sans jargon ni survente, sans anglicismes inutiles.
9. **Double lecture :** adresse-toi à la fois aux **RH** (employabilité, transformation des compétences, réforme des entretiens professionnels — EPP 2026) et aux **dirigeants** (pérennité de l'activité, performance, conformité).

# Unité d'analyse
L'unité d'analyse est la **famille de métiers** (classification ISCO-08), pas le secteur. Le secteur (code NAF) sert uniquement à **pondérer** l'exposition : un même métier est plus ou moins exposé selon le secteur. Les métiers structurent le rapport ; le secteur nuance.

# Caractérisation d'une famille de métiers (section §3 — le cœur)
Pour chaque famille déclarée, tu produis :
- **intensité d'exposition** : \`faible\` | \`modérée\` | \`élevée\` | \`à confirmer\` (+ la part de tâches concernée si une source la donne) ;
- **nature de l'impact** : une ou plusieurs valeurs parmi \`automatisation\`, \`augmentation\`, \`création\` ;
- **confiance** : \`élevée\` | \`moyenne\` | \`faible\` (selon la couverture des sources et la transposabilité au cas français) ;
- 1 à 3 phrases d'explication, chacune adossée à une statistique fournie quand c'est possible.

# Déroulé du rapport
Tu remplis les sections imposées par le schéma de sortie (§0 à §9). Pour CHAQUE section, tu n'utilises QUE les statistiques listées sous cette section dans le contexte (la banque t'est fournie déjà filtrée par section). Pour les sections dont un **texte figé** est fourni, tu le reprends tel quel sans le réécrire. Esprit de chaque section : il t'est rappelé dans le contexte (intention + consigne).

# Format de citation dans le texte
Intègre la source de façon lisible, ex. : « 39 % des compétences seront transformées d'ici 2030 (World Economic Forum, 2025) ». Donnée secondaire : « (Crédoc, citée par Parlons RH, 2025) ». Projection : tournure conditionnelle.

# Format de sortie
Tu réponds UNIQUEMENT via la structure imposée (sortie structurée), un objet par section :
- \`id\` (identifiant de la section, ex. "familles-metiers"),
- \`titre\`,
- \`contenu\` (le texte rédigé ; tableau de paragraphes/intertitres),
- \`sources_citees\` (liste des \`id\` de statistiques effectivement citées dans la section),
- pour §3 uniquement : \`familles\` = tableau de caractérisations (famille, exposition, natures, confiance, transposable_france, explication).
Aucun texte hors de cette structure, aucune mise en forme décorative superflue.`;

// ---------------------------------------------------------------------------
// Construction du message utilisateur (contexte dynamique par lead).
// ---------------------------------------------------------------------------

export interface GenerationContext {
  /** Nom de l'entreprise si connu. */
  nomEntreprise?: string;
  /** Q1 — secteur + activité déclarés. */
  secteurDeclare: string;
  /** Enrichissement INSEE Sirene (si SIRET/SIREN fourni). */
  nafCode?: string;
  nafLibelle?: string;
  effectifTranche?: string;
  /** Q2 — produits/services + valeur. */
  produitsServices: string;
  /** Q3 — clients + interactions. */
  clients: string;
  /** Q4 — familles de métiers déclarées, mappées ISCO. */
  famillesDeclarees: { label: string; isco?: string[] }[];
  /** Q5 — résumé du site / de la plaquette (si fournis). */
  sourceResume?: string;
  /** Date du rapport (format lisible, ex. "22 juin 2026"). */
  dateRapport: string;
}

/** Rendu compact d'une statistique pour le contexte (claim + source + drapeaux). */
function renderStat(s: StatEntry): string {
  const flags = [
    `périmètre ${s.scope}`,
    s.provenance === 'secondaire'
      ? `secondaire${s.source.originalSource ? ` (origine : ${s.source.originalSource})` : ''}`
      : null,
    s.projection ? 'projection' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return `  - [${s.id}] ${s.claim} (${s.source.org}, ${s.source.year}${
    s.source.page ? `, ${s.source.page}` : ''
  })${flags ? ` — ${flags}` : ''}`;
}

/** Assemble le message utilisateur : contexte entreprise + banque filtrée par section. */
export function buildUserMessage(ctx: GenerationContext): string {
  const familles = ctx.famillesDeclarees
    .map((f) => `  - ${f.label}${f.isco?.length ? ` (ISCO ${f.isco.join(', ')})` : ''}`)
    .join('\n');

  const entreprise = [
    `## Entreprise`,
    ctx.nomEntreprise ? `Nom : ${ctx.nomEntreprise}` : null,
    `Secteur & activité (déclaré) : ${ctx.secteurDeclare}`,
    ctx.nafLibelle ? `Secteur normalisé (NAF) : ${ctx.nafLibelle}${ctx.nafCode ? ` [${ctx.nafCode}]` : ''}` : null,
    ctx.effectifTranche ? `Tranche d'effectif : ${ctx.effectifTranche}` : null,
    `Produits / services & valeur : ${ctx.produitsServices}`,
    `Clients & interactions : ${ctx.clients}`,
    ctx.sourceResume ? `Résumé site/plaquette : ${ctx.sourceResume}` : null,
    `Date du rapport : ${ctx.dateRapport}`,
  ]
    .filter(Boolean)
    .join('\n');

  const sections = reportSections
    .map((section) => {
      const stats = statsForSection(section);
      const header = `### §${section.num} — ${section.title} (id: ${section.id})`;
      const intent = `Intention : ${section.intent}`;
      const brief = section.llmBrief ? `Consigne : ${section.llmBrief}` : null;
      const fixed = section.fixedText ? `Texte figé à reprendre tel quel : « ${section.fixedText} »` : null;
      const statsBlock = section.allowsStats
        ? stats.length > 0
          ? `Statistiques autorisées dans cette section :\n${stats.map(renderStat).join('\n')}`
          : `Statistiques autorisées dans cette section : aucune disponible — reste qualitatif.`
        : `Cette section ne cite pas de statistique.`;
      return [header, intent, brief, fixed, statsBlock].filter(Boolean).join('\n');
    })
    .join('\n\n');

  return `${entreprise}

## Familles de métiers déclarées (unité d'analyse)
${familles}

## Plan & banque de statistiques par section
Tu remplis chaque section ci-dessous. Pour les sections avec statistiques, tu ne peux citer QUE les entrées listées (référence par leur \`id\`).

${sections}`;
}
