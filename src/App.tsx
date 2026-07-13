import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import PreRapport from './pages/PreRapport';
import Grain from './components/fx/Grain';
import { scrollToTop } from './lib/scroll';

// Chargé à la demande : page d'atterrissage des anciens liens /rapport/:leadId
// (le rapport est désormais livré par email, plus affiché en ligne).
const ReportView = lazy(() => import('./pages/ReportView'));

/** Remet la vue en haut à chaque changement de route (sinon on hériterait du
 *  scroll de la page précédente). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    scrollToTop();
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      {/* Grain global : signature visuelle présente sur toutes les pages. */}
      <Grain />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pre-diagnostic" element={<PreRapport />} />
        {/* Ancienne URL du wizard (site v1) : redirection côté client. Netlify
            sert aussi un 301 (netlify.toml) pour les accès directs. */}
        <Route path="/pre-rapport" element={<Navigate to="/pre-diagnostic" replace />} />
        <Route
          path="/rapport/:leadId"
          element={
            <Suspense fallback={null}>
              <ReportView />
            </Suspense>
          }
        />
        {/* Toute route inconnue retombe sur la landing (le fallback SPA Netlify
            sert déjà index.html, ce Navigate gère le cas côté client). */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
