/**
 * context.ts — assemblage du contexte de génération (Tranche 4)
 * =============================================================
 * Fonction **pure** qui transforme un lead (+ enrichissement déjà résolu) en
 * `GenerationContext` prêt pour le prompt. Sortie du handler `generate-prerapport-
 * background` pour que toute la logique de mise en forme (mapping ISCO des
 * familles, repli NAF/effectif, date) soit testable sans Supabase ni OpenAI.
 *
 * Le handler garde l'IO (charge le lead, appelle l'enrichissement réseau,
 * persiste) ; ici, zéro effet de bord.
 */

import type { Database } from '../../../src/types/supabase';
import type { GenerationContext } from '../../../src/data/reportPrompt';
import { famillesMetiers } from '../../../src/data/famillesMetiers';
import type { SiretEnrichment } from './enrichment';

type LeadRow = Database['public']['Tables']['leads']['Row'];

/** Résultats d'enrichissement best-effort déjà obtenus par le handler. */
export interface LeadEnrichment {
  /** Enrichissement INSEE Sirene (vide si pas de SIRET ou échec). */
  siret: SiretEnrichment;
  /** Résumé texte du site déclaré (undefined si pas d'URL ou échec). */
  sourceResume?: string;
}

/** Mappe les familles déclarées (texte/champ guidé) vers leurs codes ISCO si on les reconnaît. */
function mapFamilles(declarees: string[]): GenerationContext['famillesDeclarees'] {
  return declarees.map((label) => {
    const match = famillesMetiers.find(
      (f) => f.label.toLowerCase() === label.toLowerCase() || f.id === label,
    );
    return match ? { label: match.label, isco: match.isco } : { label };
  });
}

/**
 * Construit le contexte de génération à partir du lead et de l'enrichissement.
 * `now` est injecté (au lieu d'un `new Date()` interne) pour rester déterministe
 * et testable. Le repli NAF/effectif privilégie la valeur déjà sur le lead, puis
 * celle découverte par l'enrichissement SIRET.
 */
export function buildGenerationContext(
  lead: LeadRow,
  enrichment: LeadEnrichment,
  now: Date,
): GenerationContext {
  const { siret, sourceResume } = enrichment;
  const nafCode = lead.naf_code ?? siret.nafCode;
  const effectifTranche = lead.effectif_tranche ?? siret.effectifTranche;
  const dateRapport = now.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    nomEntreprise: siret.nomEntreprise,
    secteurDeclare: lead.secteur_activite,
    nafCode: nafCode ?? undefined,
    nafLibelle: siret.nafLibelle,
    effectifTranche: effectifTranche ?? undefined,
    categorieEntreprise: siret.categorieEntreprise,
    anneeCreation: siret.anneeCreation,
    localisation: siret.localisation,
    produitsServices: lead.produits_services,
    clients: lead.clients,
    famillesDeclarees: mapFamilles(lead.familles_metiers),
    sourceResume,
    dateRapport,
  };
}
