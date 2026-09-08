import { describe, it, expect, vi } from 'vitest';
import { generateReport, MAX_REPLAYS_PER_SECTION } from './reportGeneration';
import type { AskModel } from './reportGeneration';
import { SYSTEM_PROMPT } from './reportPrompt';
import type { GenerationContext } from './reportPrompt';
import { CORPS_CONFORME, SYNTHESE_CONFORME } from './__fixtures__/rapportConforme';
import { blockingFindings } from './reportValidation';

const ctx: GenerationContext = {
  nomEntreprise: 'Biocoop',
  secteurDeclare: 'Distribution de produits biologiques',
  produitsServices: 'Approvisionnement et distribution de produits alimentaires bio',
  clients: 'Consommateurs en magasin et magasins sociétaires',
  famillesDeclarees: [
    { label: 'Vente & commerce', isco: ['52'] },
    { label: 'Transport & logistique', isco: ['83'] },
    { label: 'Comptabilité, paie & gestion des données', isco: ['43'] },
  ],
  dateRapport: '8 septembre 2026',
};

/** Nom du `response_format` demandé, pour répondre le bon fixture. */
function formatName(format: unknown): string {
  return (format as { json_schema?: { name?: string } }).json_schema?.name ?? '';
}

/** Un transport qui répond toujours la fixture conforme. */
function askConforme(): AskModel {
  return async (_system, _user, format) =>
    JSON.stringify(formatName(format).endsWith('synthese') ? SYNTHESE_CONFORME : CORPS_CONFORME);
}

describe('generateReport — les deux appels', () => {
  it('appelle le corps puis la synthèse, avec le prompt système à chaque fois', async () => {
    const ask = vi.fn(askConforme());
    const { report, findings, replays } = await generateReport(ask, ctx);

    expect(ask).toHaveBeenCalledTimes(2);
    expect(formatName(ask.mock.calls[0][2])).toBe('prerapport_mira_corps');
    expect(formatName(ask.mock.calls[1][2])).toBe('prerapport_mira_synthese');
    for (const [system] of ask.mock.calls) expect(system).toBe(SYSTEM_PROMPT);

    // Le second appel voit la liste héritée du premier.
    expect(ask.mock.calls[1][1]).toContain('Liste héritée');

    // Un rapport conforme ne déclenche aucun rejeu.
    expect(findings).toEqual([]);
    expect(replays).toEqual({});
    expect(report.sections.map((s) => s.id)).toContain('comment-utiliser');
  });

  it('assemble le document complet, textes figés du code compris', async () => {
    const { report } = await generateReport(askConforme(), ctx);
    expect(report.sections.map((s) => s.id)).toEqual([
      'perimetre',
      'synthese-executive',
      'contexte',
      'familles-metiers',
      'competences',
      'reorganisation',
      'facteur-humain',
      'repere-sectoriel',
      'lecture-strategique',
      'comment-utiliser',
      'sources-methode',
    ]);
    const encart = report.sections.find((s) => s.id === 'synthese-executive')!.encart!;
    expect(encart.calibrage_court).not.toBe('');
    expect(encart.perimetre).not.toBe('');
  });
});

describe('generateReport — la boucle de rejeu', () => {
  /** Corps dont la §2 est trop courte : V9 bloque tant qu'on ne la corrige pas. */
  const corpsCourt = {
    sections: CORPS_CONFORME.sections.map((s) =>
      s.id === 'contexte'
        ? { ...s, contenu: [{ intertitre: 'Un constat court', paragraphes: ['Trop court.'] }], sources_citees: [] }
        : s,
    ),
  };

  it('ne rejoue que la section en échec, et s’arrête dès qu’elle est corrigée', async () => {
    let corpsServed = 0;
    const ask: AskModel = async (_system, user, format) => {
      if (formatName(format).endsWith('synthese')) return JSON.stringify(SYNTHESE_CONFORME);
      corpsServed += 1;
      // Premier appel : le corps fautif. Rejeu : la version conforme de la seule §2.
      if (corpsServed === 1) return JSON.stringify(corpsCourt);
      expect(user).toContain('Corrections à apporter');
      expect(user).toContain('[V9]');
      return JSON.stringify({
        sections: [CORPS_CONFORME.sections.find((s) => s.id === 'contexte')!],
      });
    };

    const { findings, replays } = await generateReport(ask, ctx);
    expect(replays).toEqual({ contexte: 1 });
    expect(blockingFindings(findings)).toEqual([]);
  });

  it('plafonne les rejeux et rend le rapport avec ses échecs plutôt que de boucler', async () => {
    // Le modèle s'obstine : il renvoie toujours la même §2 fautive.
    const ask: AskModel = async (_system, _user, format) =>
      JSON.stringify(formatName(format).endsWith('synthese') ? SYNTHESE_CONFORME : corpsCourt);

    const { report, findings, replays } = await generateReport(ask, ctx);
    expect(replays.contexte).toBe(MAX_REPLAYS_PER_SECTION);
    // Le rapport est rendu quand même, avec le détail de ce qui reste en échec.
    expect(report.sections.length).toBeGreaterThan(0);
    expect(blockingFindings(findings).map((f) => f.code)).toContain('V9');
  });

  it('un rejeu qui échoue consomme un essai sans faire tomber la génération', async () => {
    let corpsServed = 0;
    const ask: AskModel = async (_system, _user, format) => {
      if (formatName(format).endsWith('synthese')) return JSON.stringify(SYNTHESE_CONFORME);
      corpsServed += 1;
      if (corpsServed === 1) return JSON.stringify(corpsCourt);
      return '{ pas du json';
    };
    const onReplayError = vi.fn();

    const { report, findings } = await generateReport(ask, ctx, { onReplayError });
    expect(onReplayError).toHaveBeenCalledTimes(MAX_REPLAYS_PER_SECTION);
    // La version précédente est conservée : le rapport reste rendable.
    expect(report.sections.find((s) => s.id === 'contexte')).toBeDefined();
    expect(blockingFindings(findings).map((f) => f.code)).toContain('V9');
  });

  it('rejoue la synthèse en dernier du tour, pour qu’elle voie le corps corrigé', async () => {
    // §2 fautive ET §1 hors liste héritée : les deux doivent être rejouées, §1 après.
    const syntheseHorsHeritage = {
      section: {
        ...SYNTHESE_CONFORME.section,
        sources_citees: [...SYNTHESE_CONFORME.section.sources_citees, 'ocde-2024-adoption-moyenne-8'],
      },
    };
    const ordre: string[] = [];
    let corpsServed = 0;
    let syntheseServed = 0;
    const ask: AskModel = async (_system, user, format) => {
      if (formatName(format).endsWith('synthese')) {
        syntheseServed += 1;
        if (user.includes('Corrections à apporter')) ordre.push('synthese');
        return JSON.stringify(syntheseServed === 1 ? syntheseHorsHeritage : SYNTHESE_CONFORME);
      }
      corpsServed += 1;
      if (corpsServed === 1) return JSON.stringify(corpsCourt);
      ordre.push('corps');
      return JSON.stringify({
        sections: [CORPS_CONFORME.sections.find((s) => s.id === 'contexte')!],
      });
    };

    const { findings } = await generateReport(ask, ctx);
    expect(ordre).toEqual(['corps', 'synthese']);
    expect(blockingFindings(findings)).toEqual([]);
  });
});
