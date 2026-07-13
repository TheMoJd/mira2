/**
 * FAMILLES DE MÉTIERS — champ guidé de la Question 4 (Tranche 3 / blueprint CEO)
 * =============================================================================
 *
 * L'unité d'analyse du rapport freemium est la **famille de métiers mappée
 * ISCO-08/ESCO** (le secteur n'est qu'une lentille de pondération — cf.
 * `rapportStructure.ts`). La Q4 (« vos 3 à 6 familles de métiers indispensables »)
 * s'appuie sur cette liste guidée d'~28 familles à libellés lisibles, chacune
 * rattachée à un ou plusieurs sous-grands-groupes ISCO-08 — ce qui ancre
 * l'appariement sémantique texte libre → ISCO et son niveau de confiance.
 *
 * Source : annexe du blueprint moteur (Caroline, 22/06/2026).
 *
 * ⚠️ Les `label` sont STOCKÉS tels quels dans `leads.familles_metiers` et
 * re-mappés par chaîne (`lib/context.mapFamilles`, normalisation tolérante aux
 * anciens séparateurs — / ·). Règle CTO 13/07 : aucun tiret cadratin dans les
 * libellés visibles (séparateur « · »).
 */

export interface FamilleMetier {
  /** Identifiant stable (kebab-case). */
  id: string;
  /** Libellé lisible présenté dans le champ guidé. */
  label: string;
  /** Sous-grands-groupes ISCO-08 couverts (codes à 2 chiffres). */
  isco: string[];
  /** Domaine de regroupement (pour l'affichage). */
  domaine: string;
}

export const famillesMetiers: FamilleMetier[] = [
  // Direction & encadrement
  { id: 'direction-generale', label: 'Direction générale & dirigeants', isco: ['11'], domaine: 'Direction & encadrement' },
  { id: 'management-commercial-admin', label: 'Management commercial & administratif', isco: ['12'], domaine: 'Direction & encadrement' },
  { id: 'management-production-services', label: 'Management de production & services spécialisés', isco: ['13'], domaine: 'Direction & encadrement' },
  { id: 'management-hotellerie-commerce', label: 'Management hôtellerie, commerce & services', isco: ['14'], domaine: 'Direction & encadrement' },

  // Expertise & professions intellectuelles
  { id: 'tech-info-data', label: 'Tech, informatique & data', isco: ['25'], domaine: 'Expertise & professions intellectuelles' },
  { id: 'ingenierie-sciences', label: 'Ingénierie & sciences', isco: ['21'], domaine: 'Expertise & professions intellectuelles' },
  { id: 'sante-praticiens', label: 'Santé · praticiens', isco: ['22'], domaine: 'Expertise & professions intellectuelles' },
  { id: 'enseignement-formation', label: 'Enseignement & formation', isco: ['23'], domaine: 'Expertise & professions intellectuelles' },
  { id: 'gestion-finance-admin', label: 'Gestion, finance & administration', isco: ['24'], domaine: 'Expertise & professions intellectuelles' },
  { id: 'droit-social-culture', label: 'Droit, social & culture', isco: ['26'], domaine: 'Expertise & professions intellectuelles' },

  // Professions intermédiaires & techniciens
  { id: 'techniciens-sciences-ingenierie', label: 'Techniciens sciences & ingénierie', isco: ['31'], domaine: 'Professions intermédiaires & techniciens' },
  { id: 'techniciens-info-telecoms', label: 'Techniciens informatique & télécoms', isco: ['35'], domaine: 'Professions intermédiaires & techniciens' },
  { id: 'intermediaires-sante', label: 'Professions intermédiaires de santé', isco: ['32'], domaine: 'Professions intermédiaires & techniciens' },
  { id: 'intermediaires-gestion-commerce', label: 'Professions intermédiaires gestion & commerce', isco: ['33'], domaine: 'Professions intermédiaires & techniciens' },
  { id: 'intermediaires-droit-social-culture', label: 'Professions intermédiaires droit, social & culture', isco: ['34'], domaine: 'Professions intermédiaires & techniciens' },

  // Administratif & support
  { id: 'employes-admin-bureautique', label: 'Employés administratifs & bureautique', isco: ['41', '44'], domaine: 'Administratif & support' },
  { id: 'relation-client-accueil', label: 'Relation client & accueil', isco: ['42'], domaine: 'Administratif & support' },
  { id: 'comptabilite-paie-donnees', label: 'Comptabilité, paie & gestion des données', isco: ['43'], domaine: 'Administratif & support' },

  // Services, vente & soin
  { id: 'vente-commerce', label: 'Vente & commerce', isco: ['52'], domaine: 'Services, vente & soin' },
  { id: 'services-personnes-hotellerie', label: 'Services aux personnes · hôtellerie, restauration', isco: ['51'], domaine: 'Services, vente & soin' },
  { id: 'soins-aide-personne', label: 'Soins & aide à la personne', isco: ['53'], domaine: 'Services, vente & soin' },
  { id: 'securite-protection', label: 'Sécurité & protection', isco: ['54'], domaine: 'Services, vente & soin' },

  // Production, terrain & artisanat
  { id: 'batiment-second-oeuvre', label: 'Métiers du bâtiment & second œuvre', isco: ['71', '74'], domaine: 'Production, terrain & artisanat' },
  { id: 'industrie-maintenance-qualifies', label: 'Industrie, maintenance & métiers qualifiés', isco: ['72', '73', '75'], domaine: 'Production, terrain & artisanat' },
  { id: 'conduite-machines-production', label: 'Conduite de machines & production industrielle', isco: ['81', '82'], domaine: 'Production, terrain & artisanat' },
  { id: 'transport-logistique', label: 'Transport & logistique', isco: ['83'], domaine: 'Production, terrain & artisanat' },
  { id: 'agriculture-nature-peche', label: 'Agriculture, nature & pêche', isco: ['61', '62', '63', '92'], domaine: 'Production, terrain & artisanat' },
  { id: 'manutention-nettoyage-elementaires', label: 'Manutention, nettoyage & métiers élémentaires', isco: ['91', '93', '94', '95', '96'], domaine: 'Production, terrain & artisanat' },
];

/** Ordre d'affichage des domaines dans le champ guidé. */
export const domainesOrdre: string[] = [
  'Direction & encadrement',
  'Expertise & professions intellectuelles',
  'Professions intermédiaires & techniciens',
  'Administratif & support',
  'Services, vente & soin',
  'Production, terrain & artisanat',
];

/** Familles regroupées par domaine (pour rendu du champ guidé). */
export const famillesParDomaine = (): Record<string, FamilleMetier[]> =>
  famillesMetiers.reduce<Record<string, FamilleMetier[]>>((acc, f) => {
    (acc[f.domaine] ??= []).push(f);
    return acc;
  }, {});

/** Recherche par code ISCO à 2 chiffres → familles couvrant ce code. */
export const famillesByIsco = (isco2: string): FamilleMetier[] =>
  famillesMetiers.filter((f) => f.isco.includes(isco2));
