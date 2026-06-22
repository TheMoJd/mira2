/**
 * SCHÉMA DE SORTIE STRUCTURÉE — génération du pré-rapport (Tranche 4)
 * ===================================================================
 *
 * Contrat de sortie imposé au modèle via le `response_format` d'OpenAI
 * (`{ type: 'json_schema', strict: true }`). Le modèle est contraint de
 * produire exactement les 10 sections §0→§9 et la caractérisation par famille
 * en §3 — pas de texte hors structure.
 *
 * - `RESPONSE_FORMAT` : objet à passer tel quel à l'API OpenAI.
 * - `PreRapportOutput` & co. : types TS de la réponse parsée (function + template PDF).
 *
 * Contraintes du mode strict OpenAI respectées ici : racine = objet, TOUTES les
 * propriétés dans `required`, `additionalProperties: false` partout, champs
 * optionnels exprimés en union `["type", "null"]` (pas de clé absente).
 */

import type { ExpositionLevel, ImpactNature, ConfidenceLevel } from './rapportStructure';
import { reportSections } from './rapportStructure';

/** Ids de sections autorisés (dérivés de la structure → toujours synchrones). */
const SECTION_IDS = reportSections.map((s) => s.id);

// --- Types de la réponse parsée -------------------------------------------

export interface ReportBloc {
  /** Intertitre de bloc, ou null pour un simple paragraphe. */
  intertitre: string | null;
  paragraphes: string[];
}

export interface ReportFamille {
  famille: string;
  exposition: ExpositionLevel;
  natures: ImpactNature[];
  /** Part de tâches concernée si une source la donne (ex. « jusqu'à 82 % »), sinon null. */
  part_taches: string | null;
  confiance: ConfidenceLevel;
  /** false → mention « non directement transposable à une PME française ». */
  transposable_france: boolean;
  explication: string;
}

export interface ReportSectionOutput {
  id: string;
  titre: string;
  contenu: ReportBloc[];
  /** Identifiants (`id`) des statistiques de la stat-bank citées dans la section. */
  sources_citees: string[];
  /** Caractérisations par famille — uniquement pour §3, sinon null. */
  familles: ReportFamille[] | null;
}

export interface PreRapportOutput {
  sections: ReportSectionOutput[];
}

// --- Schéma JSON pour OpenAI (response_format) ----------------------------

export const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'prerapport_mira',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['sections'],
      properties: {
        sections: {
          type: 'array',
          description: 'Les 10 sections du rapport, dans l’ordre §0 → §9.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'titre', 'contenu', 'sources_citees', 'familles'],
            properties: {
              id: {
                type: 'string',
                description: 'Identifiant de la section.',
                enum: SECTION_IDS,
              },
              titre: { type: 'string' },
              contenu: {
                type: 'array',
                description: 'Blocs de contenu (intertitre optionnel + paragraphes).',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['intertitre', 'paragraphes'],
                  properties: {
                    intertitre: { type: ['string', 'null'] },
                    paragraphes: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              sources_citees: {
                type: 'array',
                description: 'Ids des statistiques citées (doit correspondre aux stats fournies pour cette section).',
                items: { type: 'string' },
              },
              familles: {
                type: ['array', 'null'],
                description: 'Caractérisations par famille de métiers — uniquement pour la section §3 (id "familles-metiers"), sinon null.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'famille',
                    'exposition',
                    'natures',
                    'part_taches',
                    'confiance',
                    'transposable_france',
                    'explication',
                  ],
                  properties: {
                    famille: { type: 'string' },
                    exposition: {
                      type: 'string',
                      enum: ['faible', 'modérée', 'élevée', 'à confirmer'],
                    },
                    natures: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['automatisation', 'augmentation', 'création'],
                      },
                    },
                    part_taches: { type: ['string', 'null'] },
                    confiance: {
                      type: 'string',
                      enum: ['élevée', 'moyenne', 'faible'],
                    },
                    transposable_france: { type: 'boolean' },
                    explication: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
