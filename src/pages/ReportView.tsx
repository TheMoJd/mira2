/**
 * ReportView — page de résultat `/rapport/:leadId` (phase 1, test interne)
 * ========================================================================
 * Récupère le rapport via la function `get-report` et l'affiche. Tant que la
 * génération tourne (received/generating), poll léger toutes les 3 s puis bascule
 * automatiquement sur le rapport. Phase 2 : token RGPD + async soigné (cf. spec).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReportDocument from '../components/report/ReportDocument';
import type { PreRapportOutput } from '../data/reportSchema';
import type { ReportRenderContext } from '../data/reportHtml';

const POLL_MS = 3000;

type ReportResponse =
  | { status: 'received' | 'generating' | 'failed' | 'not_found' }
  | { status: 'sent'; report: PreRapportOutput; context: ReportRenderContext; pdfUrl: string | null };

type View = ReportResponse | { status: 'loading' } | { status: 'network_error' };

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ maxWidth: 420 }}>{children}</div>
    </div>
  );
}

export default function ReportView() {
  const { leadId } = useParams<{ leadId: string }>();
  const [view, setView] = useState<View>({ status: 'loading' });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const fetchReport = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await fetch(`/.netlify/functions/get-report?leadId=${encodeURIComponent(leadId)}`);
      const data = (await res.json()) as ReportResponse;
      setView(data);
      if (data.status !== 'received' && data.status !== 'generating') stopPolling();
    } catch {
      setView({ status: 'network_error' });
      stopPolling();
    }
  }, [leadId]);

  useEffect(() => {
    fetchReport();
    timer.current = setInterval(fetchReport, POLL_MS);
    return stopPolling;
  }, [fetchReport]);

  switch (view.status) {
    case 'loading':
    case 'received':
    case 'generating':
      return (
        <Centered>
          <div className="mira-spinner" aria-hidden="true" style={{ margin: '0 auto 20px' }} />
          <h1 style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: 'clamp(22px,4vw,28px)', fontWeight: 500, color: 'var(--ink)', margin: '0 0 10px' }}>
            Votre pré-rapport se prépare…
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }} role="status" aria-live="polite">
            La génération applique l’état de l’art à vos familles de métiers et prend généralement 1 à 2 minutes.{' '}
            <strong style={{ color: 'var(--ink)' }}>Restez sur cette page et ne la fermez pas</strong> : elle se met à jour
            automatiquement dès que votre rapport est prêt.
          </p>
        </Centered>
      );

    case 'sent':
      return (
        <div>
          <div
            style={{
              position: 'sticky', top: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: 12, flexWrap: 'wrap', padding: '12px clamp(16px,4vw,28px)', background: 'var(--paper)',
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            <Link to="/" className="kicker" style={{ color: 'var(--violet)', fontSize: 12, textDecoration: 'none' }}>
              ← MIRA
            </Link>
            {view.pdfUrl && (
              <a
                href={view.pdfUrl}
                download="prerapport-mira.pdf"
                className="mira-btn-primary"
                style={{ fontSize: 14, fontWeight: 600, padding: '10px 18px', borderRadius: 'var(--r-sm, 10px)', textDecoration: 'none' }}
              >
                Télécharger le PDF
              </a>
            )}
          </div>
          <ReportDocument report={view.report} context={view.context} />
        </div>
      );

    case 'failed':
      return (
        <Centered>
          <h1 style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: 'clamp(22px,4vw,28px)', fontWeight: 500, color: 'var(--ink)', margin: '0 0 10px' }}>
            La génération a échoué
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 20px' }}>
            Un incident est survenu pendant la génération de votre pré-rapport. Vous pouvez relancer une demande.
          </p>
          <Link to="/pre-rapport" className="mira-btn-primary" style={{ fontWeight: 600, padding: '10px 18px', borderRadius: 'var(--r-sm, 10px)', textDecoration: 'none' }}>
            Relancer une demande
          </Link>
        </Centered>
      );

    case 'network_error':
      return (
        <Centered>
          <h1 style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: 'clamp(22px,4vw,28px)', fontWeight: 500, color: 'var(--ink)', margin: '0 0 10px' }}>
            Connexion impossible
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 20px' }}>
            Impossible de récupérer votre rapport. Vérifiez votre réseau et réessayez.
          </p>
          <button onClick={fetchReport} className="mira-btn-primary" style={{ fontWeight: 600, padding: '10px 18px', borderRadius: 'var(--r-sm, 10px)', border: 'none', cursor: 'pointer' }}>
            Réessayer
          </button>
        </Centered>
      );

    case 'not_found':
    default:
      return (
        <Centered>
          <h1 style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: 'clamp(22px,4vw,28px)', fontWeight: 500, color: 'var(--ink)', margin: '0 0 10px' }}>
            Rapport introuvable
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 20px' }}>
            Ce lien ne correspond à aucun pré-rapport. Vérifiez l’adresse ou lancez une nouvelle demande.
          </p>
          <Link to="/pre-rapport" className="mira-btn-primary" style={{ fontWeight: 600, padding: '10px 18px', borderRadius: 'var(--r-sm, 10px)', textDecoration: 'none' }}>
            Faire une demande
          </Link>
        </Centered>
      );
  }
}
