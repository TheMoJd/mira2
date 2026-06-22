/** Modèle de données du formulaire de pré-rapport freemium.
 *
 *  Cette forme est volontairement partageable avec le backend (Tranche 2/4) :
 *  la function `submit` recevra ce même objet (hors `plaquette`, qui transitera
 *  en upload séparé). Garder ce type comme source de vérité du contrat d'entrée.
 */
export interface PreRapportForm {
  /** SIRET — optionnel (14 chiffres). Pré-qualifie le lead, pas moteur de valeur. */
  siret: string;
  /** Q1 — Secteur + ce que fait concrètement l'entreprise. */
  secteurActivite: string;
  /** Q2 — Produits/services + valeur apportée aux clients. */
  produitsServices: string;
  /** Q3 — Clients/bénéficiaires + modes d'interaction. */
  clients: string;
  /** Q4 — 3 à 6 grandes familles de métiers indispensables. */
  famillesMetiers: string[];
  /** Q5a — Site web (optionnel). */
  siteUrl: string;
  /** Q5b — Plaquette / présentation (optionnel). Non sérialisé : upload à part. */
  plaquette: File | null;
  /** Email professionnel — requis (gate de génération + destinataire du PDF). */
  email: string;
  /** Consentement RGPD — requis. */
  consentRgpd: boolean;
}

/** Erreurs de validation, indexées par champ. */
export type PreRapportErrors = Partial<Record<keyof PreRapportForm, string>>;

export const emptyPreRapportForm: PreRapportForm = {
  siret: '',
  secteurActivite: '',
  produitsServices: '',
  clients: '',
  famillesMetiers: [],
  siteUrl: '',
  plaquette: null,
  email: '',
  consentRgpd: false,
};
