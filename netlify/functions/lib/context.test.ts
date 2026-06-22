import { describe, it, expect } from 'vitest';
import { buildGenerationContext } from './context';
import type { LeadEnrichment } from './context';
import type { Database } from '../../../src/types/supabase';
import { famillesMetiers } from '../../../src/data/famillesMetiers';

type LeadRow = Database['public']['Tables']['leads']['Row'];

// Lead complet typé : le compilateur signale tout champ que le builder lirait
// sans qu'on le fournisse ici (l'interface est la surface de test).
function lead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: 'lead-1',
    clients: 'PME, grands comptes',
    consent_rgpd: true,
    created_at: '2026-06-22T10:00:00Z',
    effectif_tranche: null,
    email: 'a@b.fr',
    familles_metiers: [],
    naf_code: null,
    plaquette_path: null,
    produits_services: 'Serveurs, cloud',
    report_json: null,
    secteur_activite: 'Cloud et hébergement',
    siret: null,
    site_url: null,
    status: 'received',
    ...overrides,
  };
}

const NO_ENRICH: LeadEnrichment = { siret: {} };
const NOW = new Date('2026-06-22T10:00:00Z');

describe('buildGenerationContext — assemblage pur', () => {
  it('reprend les champs déclarés du lead', () => {
    const ctx = buildGenerationContext(lead(), NO_ENRICH, NOW);
    expect(ctx.secteurDeclare).toBe('Cloud et hébergement');
    expect(ctx.produitsServices).toBe('Serveurs, cloud');
    expect(ctx.clients).toBe('PME, grands comptes');
  });

  it('formate la date du rapport en français (déterministe via `now` injecté)', () => {
    expect(buildGenerationContext(lead(), NO_ENRICH, NOW).dateRapport).toBe('22 juin 2026');
  });

  it('mappe une famille connue vers ses codes ISCO', () => {
    const known = famillesMetiers[0];
    const ctx = buildGenerationContext(lead({ familles_metiers: [known.label] }), NO_ENRICH, NOW);
    expect(ctx.famillesDeclarees).toEqual([{ label: known.label, isco: known.isco }]);
  });

  it('laisse une famille inconnue sans ISCO (pas d’invention)', () => {
    const ctx = buildGenerationContext(lead({ familles_metiers: ['Métier bidon'] }), NO_ENRICH, NOW);
    expect(ctx.famillesDeclarees).toEqual([{ label: 'Métier bidon' }]);
  });

  it('le mapping famille est insensible à la casse', () => {
    const known = famillesMetiers[0];
    const ctx = buildGenerationContext(
      lead({ familles_metiers: [known.label.toUpperCase()] }),
      NO_ENRICH,
      NOW,
    );
    expect(ctx.famillesDeclarees[0].isco).toEqual(known.isco);
  });

  it('privilégie le NAF/effectif déjà présent sur le lead sur celui de l’enrichissement', () => {
    const ctx = buildGenerationContext(
      lead({ naf_code: '6201Z', effectif_tranche: '20 à 49 salariés' }),
      { siret: { nafCode: '9999Z', effectifTranche: '0 salarié' } },
      NOW,
    );
    expect(ctx.nafCode).toBe('6201Z');
    expect(ctx.effectifTranche).toBe('20 à 49 salariés');
  });

  it('retombe sur l’enrichissement SIRET quand le lead n’a pas de NAF/effectif', () => {
    const ctx = buildGenerationContext(
      lead(),
      { siret: { nomEntreprise: 'ACME', nafCode: '6201Z', nafLibelle: 'Programmation', effectifTranche: '50 à 99 salariés' } },
      NOW,
    );
    expect(ctx.nafCode).toBe('6201Z');
    expect(ctx.nafLibelle).toBe('Programmation');
    expect(ctx.effectifTranche).toBe('50 à 99 salariés');
    expect(ctx.nomEntreprise).toBe('ACME');
  });

  it('transmet le résumé du site quand il est fourni', () => {
    const ctx = buildGenerationContext(lead(), { siret: {}, sourceResume: 'Hébergeur cloud.' }, NOW);
    expect(ctx.sourceResume).toBe('Hébergeur cloud.');
  });

  it('expose nafCode/effectifTranche en undefined (pas null) quand rien n’est connu', () => {
    const ctx = buildGenerationContext(lead(), NO_ENRICH, NOW);
    expect(ctx.nafCode).toBeUndefined();
    expect(ctx.effectifTranche).toBeUndefined();
  });
});
