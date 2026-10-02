import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SYSTEM_PROMPT } from './reportPrompt';
import {
  reportSections,
  CALIBRAGE_COURT,
  LIGNE_PERIMETRE,
  COMMENT_UTILISER_PARAGRAPHES,
  METHODE_PARAGRAPHES,
  SOURCES_SECTION_TITLE,
  CONTACT_URL,
} from './rapportStructure';

/**
 * VERROU ANTI-DÉRIVE DOC / CODE
 * =============================
 *
 * `docs/reference-prompts-mira.md` annonce reproduire les prompts et les textes
 * figés « en intégralité ». C'est la référence que lisent Cyril et Caroline pour
 * valider le fond, et celle que l'équipe modifie quand elle veut changer un texte.
 * Si le code et le doc divergent, le doc ment, et il ment silencieusement : rien
 * ne casse, on relit juste la mauvaise version.
 *
 * Ce test rend la dérive impossible. Toute retouche d'un prompt ou d'un texte figé
 * doit être reportée dans le doc, au caractère près (apostrophes comprises).
 */

const DOC_PATH = 'docs/reference-prompts-mira.md';
// Fins de ligne normalisées : sous Windows (core.autocrlf=true) le doc est extrait en
// CRLF, alors que les template literals du code sont toujours en LF.
const doc = readFileSync(DOC_PATH, 'utf8').replace(/\r\n/g, '\n');

/** Blocs ```text du doc, qui portent les prompts recopiés. */
const textBlocks = [...doc.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);

/** Diagnostic lisible : la première ligne qui diverge, plutôt qu'un diff de 200 lignes. */
function firstDivergence(a: string, b: string): string | null {
  if (a === b) return null;
  const la = a.split('\n');
  const lb = b.split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return `ligne ${i + 1}\n  doc  : ${la[i] ?? '(absente)'}\n  code : ${lb[i] ?? '(absente)'}`;
    }
  }
  return 'longueurs différentes';
}

describe('docs/reference-prompts-mira.md — le doc cite le code sans dériver', () => {
  it('reproduit le prompt système au caractère près', () => {
    const block = textBlocks.find((b) => b.startsWith('Tu es le moteur de rédaction'));
    expect(block, 'aucun bloc de prompt système trouvé dans le doc').toBeDefined();
    expect(firstDivergence(block!, SYSTEM_PROMPT)).toBeNull();
  });

  it('reproduit les deux lignes figées de la première page', () => {
    for (const ligne of [CALIBRAGE_COURT, LIGNE_PERIMETRE]) {
      expect(doc, `ligne figée absente du doc : « ${ligne.slice(0, 60)} … »`).toContain(ligne);
    }
  });

  it('reproduit l’encart §8bis et la méthode §9, paragraphe par paragraphe', () => {
    for (const p of [...COMMENT_UTILISER_PARAGRAPHES, ...METHODE_PARAGRAPHES]) {
      expect(doc, `paragraphe figé absent du doc : « ${p.slice(0, 60)} … »`).toContain(p);
    }
    expect(doc).toContain(CONTACT_URL);
    expect(doc).toContain(SOURCES_SECTION_TITLE);
  });

  it('reproduit l’intention et la consigne de chaque section soumise au modèle', () => {
    for (const section of reportSections) {
      // Les sections figées (§8bis, §9) ne sont pas soumises au modèle : le doc les
      // décrit en prose, il n'a pas à citer leur `intent`.
      if (section.call === 'code') continue;
      expect(doc, `intention §${section.numLabel} absente du doc`).toContain(section.intent);
      if (section.llmBrief) {
        expect(doc, `consigne §${section.numLabel} absente du doc`).toContain(section.llmBrief);
      }
    }
  });

  it('cite l’identifiant de chaque section du déroulé', () => {
    for (const section of reportSections) {
      expect(doc, `id de section absent du doc : ${section.id}`).toContain(section.id);
    }
  });

  it('documente les douze contrôles, un par ligne de tableau', () => {
    for (let n = 1; n <= 12; n++) {
      expect(doc, `contrôle V${n} absent du tableau`).toMatch(new RegExp(`\\|\\s*V${n}\\s*\\|`));
    }
    // Pas de V13 fantôme laissé par une édition.
    expect(doc).not.toMatch(/\|\s*V13\s*\|/);
  });

  it('n’annonce plus les champs retirés par Caroline', () => {
    // Le doc explique que §3 ne les porte plus, mais ne doit plus les demander
    // dans le schéma de sortie ni dans la caractérisation.
    const schema = doc.slice(doc.indexOf('## Schéma de sortie'));
    expect(schema).not.toContain('transposable_france');
    expect(schema).not.toMatch(/confiance`?,/);
  });
});
