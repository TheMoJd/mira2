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
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export interface PdfOptions {
  /** Texte court répété en pied de page (à côté du numéro de page). */
  footer?: string;
}

/** Résout l'exécutable Chromium : override local prioritaire, sinon binaire @sparticuz. */
async function resolveExecutablePath(): Promise<string> {
  const override = process.env.CHROME_EXECUTABLE_PATH;
  if (override) return override;
  return chromium.executablePath();
}

/** Convertit un HTML autoportant en PDF A4. Ferme toujours le navigateur. */
export async function htmlToPdf(html: string, options: PdfOptions = {}): Promise<Buffer> {
  const executablePath = await resolveExecutablePath();
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

    const footer = options.footer ?? 'MIRA — document indicatif';
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
