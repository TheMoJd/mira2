/**
 * Accessibilité du champ texte du wizard : liaison ARIA entre l'input et son
 * message (l'erreur prime sur l'aide). Rendu via `renderToStaticMarkup`
 * (même pattern que ReportDocument.test.tsx) : `useId` y produit des ids
 * stables qu'on relit directement dans le HTML.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TextField from './TextField';

const base = { label: 'Entreprise', value: '', onChange: () => {} };

/** Extrait la cible d'`aria-describedby` du HTML rendu (undefined si absente). */
const describedBy = (html: string) => html.match(/aria-describedby="([^"]+)"/)?.[1];

describe('TextField — liaison accessible erreur/aide', () => {
  it('avec erreur : aria-invalid, aria-describedby vers le message role=alert', () => {
    const html = renderToStaticMarkup(<TextField {...base} error="Indiquez votre entreprise." />);
    expect(html).toContain('aria-invalid="true"');
    const id = describedBy(html);
    expect(id).toBeTruthy();
    // Le message référencé porte bien l'id annoncé, le rôle alert et le texte de l'erreur.
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Indiquez votre entreprise.');
  });

  it('avec aide seule : aria-describedby présent, pas de role alert', () => {
    const html = renderToStaticMarkup(<TextField {...base} hint="Nom légal ou nom d’usage." />);
    const id = describedBy(html);
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('Nom légal ou nom d’usage.');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('aria-invalid="true"');
  });

  it('sans erreur ni aide : aucun aria-describedby (pas de message fantôme)', () => {
    const html = renderToStaticMarkup(<TextField {...base} />);
    expect(html).not.toContain('aria-describedby');
    expect(html).not.toContain('role="alert"');
  });
});
