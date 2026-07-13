/**
 * pdf.ts — rendu HTML → PDF via Chromium headless (Tranche 4b)
 * ============================================================
 * Sur Netlify : binaire fourni par `@sparticuz/chromium` (Linux/Lambda).
 * En local (Windows) : repli vers le Chrome/Edge de la machine via
 * `CHROME_EXECUTABLE_PATH` — le binaire @sparticuz est Linux et ne tourne pas ici.
 *
 * Le HTML est rendu autoportant par `renderReportHtml` ; on attend `networkidle0`
 * pour laisser Google Fonts se charger avant l'impression.
 */
export interface PdfOptions {
  /** Texte court répété en pied de page (à côté du numéro de page). */
  footer?: string;
}

/** Convertit un HTML autoportant en PDF A4. Ferme toujours le navigateur. */
export async function htmlToPdf(html: string, options: PdfOptions = {}): Promise<Buffer> {
  // Imports DYNAMIQUES (et non statiques en haut de fichier) : `@sparticuz/chromium`
  // (v149) est un ES Module. Bundlée en CommonJS par esbuild côté Netlify, un import
  // statique devient un `require()` → `ERR_REQUIRE_ESM` au chargement du module, qui
  // tue la background function en phase `init` (le lead reste alors figé à `received`).
  // `import()` est supporté depuis un module CJS et résout l'ESM correctement ; en
  // prime, Chromium n'est chargé qu'au moment d'imprimer le PDF, pas à chaque init.
  const { default: chromium } = await import('@sparticuz/chromium');
  const { default: puppeteer } = await import('puppeteer-core');

  // Résout l'exécutable : override local (Windows) prioritaire, sinon binaire @sparticuz.
  const executablePath = process.env.CHROME_EXECUTABLE_PATH ?? (await chromium.executablePath());
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    // `load` puis attente explicite des polices : `networkidle0` n'est pas un
    // mode accepté par setContent, et `document.fonts.ready` est plus fiable
    // pour garantir que Google Fonts est appliqué avant l'impression.
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');

    // Repli neutre si aucun texte fourni (règle CTO : pas de tiret cadratin).
    const footer = options.footer ?? 'MIRA · document indicatif';
    const footerTemplate = `<div style="width:100%;font-size:8px;color:#8a83a6;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif">
      <span>${footer}</span>
      <span>page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate,
      margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
