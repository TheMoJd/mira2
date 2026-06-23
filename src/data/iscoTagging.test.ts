import { describe, it, expect } from 'vitest';
import { statbank, statsForFamille, iscoCoverage } from './statbank';
import { buildUserMessage } from './reportPrompt';
import type { GenerationContext } from './reportPrompt';
import { famillesMetiers } from './famillesMetiers';
import { enforceSectionGrid } from './rapportStructure';

describe('rattachement ISCO des statistiques', () => {
  it('tous les codes isco sont des sous-grands-groupes ISCO-08 à 2 chiffres connus', () => {
    const known = new Set(famillesMetiers.flatMap((f) => f.isco));
    for (const s of statbank) {
      for (const code of s.isco ?? []) {
        expect(/^\d{2}$/.test(code), `${s.id} code "${code}"`).toBe(true);
        expect(known.has(code), `${s.id} → ISCO ${code} absent de famillesMetiers`).toBe(true);
      }
    }
  });

  it('statsForFamille ne renvoie que des stats dont l’isco intersecte', () => {
    for (const s of statsForFamille(['43'])) {
      expect(s.isco?.includes('43')).toBe(true);
    }
  });

  it('les familles de terrain ajoutées via DARES sont désormais couvertes', () => {
    // 91 nettoyage, 53 aide à la personne, 93 manutention, 71 bâtiment, 52 vente,
    // 72 maintenance (tension §6/§7), 83 conducteurs (tension §6/§7)
    for (const code of ['91', '53', '93', '71', '52', '72', '83']) {
      expect(statsForFamille([code]).length, `ISCO ${code} sans stat directe`).toBeGreaterThan(0);
    }
  });

  it('expose une carte de couverture par code ISCO', () => {
    const cov = iscoCoverage();
    expect(cov['43']).toBeGreaterThan(0); // admin/compta (déjà couvert)
    expect(cov['91']).toBeGreaterThan(0); // nettoyage (nouveau)
  });

  it('le prompt §3 ajoute un rattachement DIRECT pour une famille couverte', () => {
    const ctx: GenerationContext = {
      secteurDeclare: 'Test',
      produitsServices: 'Test',
      clients: 'Test',
      famillesDeclarees: [{ label: 'Manutention, nettoyage & métiers élémentaires', isco: ['91', '93'] }],
      dateRapport: '1 janvier 2026',
    };
    const msg = buildUserMessage(ctx);
    expect(msg).toContain('Rattachement par famille déclarée');
    // la consigne §3-terrain doit pousser la source directe en priorité dans la famille
    expect(msg).toContain('DIRECTE');
    expect(msg).toContain('EN PRIORITÉ');
  });
});

describe('enforceSectionGrid (garde-fou grille)', () => {
  it('retire une citation hors section autorisée et garde les valides', () => {
    const report = {
      sections: [
        // §7 n'autorise PAS S12 (pwc) ; ocde-2024-adoption-moyenne-8 (S05) est autorisé.
        {
          id: 'repere-sectoriel',
          sources_citees: ['pwc-2025-skills-changing-faster-66', 'ocde-2024-adoption-moyenne-8'],
        },
        // §0 (perimetre) ne cite aucune stat → tout est retiré.
        { id: 'perimetre', sources_citees: ['wef-2025-skills-transformed-39'] },
      ],
    };
    enforceSectionGrid(report);
    expect(report.sections[0].sources_citees).toEqual(['ocde-2024-adoption-moyenne-8']);
    expect(report.sections[1].sources_citees).toEqual([]);
  });
});
