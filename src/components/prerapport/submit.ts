import type { PreRapportForm } from '../../types/prerapport';

export interface SubmitResult {
  ok: boolean;
}

/**
 * Soumission du pré-rapport.
 *
 * ⚠️ MOCK (Tranche 1) — n'envoie rien : journalise le payload et simule la
 * latence réseau. Point d'intégration unique à remplacer en **Tranche 2** par
 * un `POST` (multipart si plaquette) vers la Netlify function `submit-prerapport`,
 * qui stockera le lead dans Supabase puis déclenchera la génération asynchrone.
 */
export async function submitPreRapport(form: PreRapportForm): Promise<SubmitResult> {
  const { plaquette, ...rest } = form;
  console.info('[pré-rapport] payload (mock submit) →', {
    ...rest,
    siret: rest.siret.replace(/\s/g, ''),
    plaquette: plaquette ? { name: plaquette.name, size: plaquette.size, type: plaquette.type } : null,
  });

  await new Promise((resolve) => setTimeout(resolve, 1100));
  return { ok: true };
}
