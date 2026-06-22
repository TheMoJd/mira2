import { describe, it, expect } from 'vitest';
import { buildUserMessage } from './reportPrompt';
import type { GenerationContext } from './reportPrompt';
import { reportSections, statsForSection } from './rapportStructure';
import { statsBySource } from './statbank';

const ctx: GenerationContext = {
  secteurDeclare: 'Hébergement et cloud computing',
  produitsServices: 'Serveurs, cloud public et privé',
  clients: 'Développeurs, PME, grands comptes',
  famillesDeclarees: [{ label: 'Tech, informatique & data' }],
  dateRapport: '1 janvier 2026',
};

/** Découpe le message en blocs de section et extrait id de section + ids de stats. */
function sectionBlocks(message: string) {
  return message
    .split('\n### §')
    .slice(1)
    .map((raw) => {
      const id = raw.match(/\(id: ([^)]+)\)/)?.[1] ?? '';
      const statIds = [...raw.matchAll(/- \[([^\]]+)\]/g)].map((m) => m[1]);
      return { id, statIds };
    });
}

describe('buildUserMessage — verrou de périmètre des sources', () => {
  const msg = buildUserMessage(ctx);
  const blocks = sectionBlocks(msg);

  it('produit un bloc par section (10)', () => {
    expect(blocks).toHaveLength(10);
  });

  it('chaque section n’expose QUE les stats autorisées par sa grille (égalité stricte)', () => {
    for (const block of blocks) {
      const section = reportSections.find((s) => s.id === block.id)!;
      const allowed = statsForSection(section).map((s) => s.id).sort();
      expect(block.statIds.sort(), `section ${block.id}`).toEqual(allowed);
    }
  });

  it('le cœur §3 admet la couche France RH (FR1/FR2) mais exclut CEGOS (FR3) et Neobrain (FR4)', () => {
    const s3 = blocks.find((b) => b.id === 'familles-metiers')!;
    const excluded = new Set([...statsBySource('FR3'), ...statsBySource('FR4')].map((s) => s.id));
    expect(s3.statIds.some((id) => excluded.has(id))).toBe(false);
  });

  it('reprend le contexte entreprise et les familles déclarées', () => {
    expect(msg).toContain('Hébergement et cloud computing');
    expect(msg).toContain('Tech, informatique & data');
  });

  it('inclut le texte figé de la section Sources & méthode', () => {
    const s9 = reportSections.find((s) => s.id === 'sources-methode')!;
    expect(msg).toContain(s9.fixedText!.slice(0, 40));
  });
});
