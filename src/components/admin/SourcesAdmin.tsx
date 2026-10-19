import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WizardButton from '../prerapport/WizardButton';
import { Badge, Modal, Notice, SmallButton } from './adminUi';
import SourceForm from './SourceForm';
import StatForm from './StatForm';
import { AdminAuthError, adminWrite, fetchAdminData, type AdminData } from '../../lib/adminApi';
import { SCOPE_LABELS, THEMES, THEME_LABELS, type StatRow, type StatSourceRow } from '../../data/statbankSchema';
import type { StatScope, StatTheme } from '../../data/statbank';

type Editing =
  | { kind: 'source'; row?: StatSourceRow }
  | { kind: 'stat'; row?: StatRow; sourceCode?: string }
  | null;

/** Texte de recherche d'une stat (sans accents ni casse). */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const formatValue = (s: StatRow) => `${String(s.value).replace('.', ',')}${s.unit ? (s.unit === '%' ? ' %' : ` ${s.unit}`) : ''}`;

export default function SourcesAdmin({ onAuthLost }: { onAuthLost: () => void }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  /** Saisie en cours dans la modale ouverte (lu par la modale avant de se fermer). */
  const formDirty = useRef(false);
  const setFormDirty = useCallback((dirty: boolean) => (formDirty.current = dirty), []);
  const isFormDirty = useCallback(() => formDirty.current, []);
  const closeEditor = useCallback(() => {
    formDirty.current = false;
    setEditing(null);
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof AdminAuthError) return onAuthLost();
      setFlash({ tone: 'error', text: err instanceof Error ? err.message : 'Erreur inattendue.' });
    },
    [onAuthLost],
  );

  const reload = useCallback(async () => {
    try {
      setData(await fetchAdminData());
      setLoadError(null);
    } catch (err) {
      if (err instanceof AdminAuthError) return onAuthLost();
      setLoadError(err instanceof Error ? err.message : 'Lecture impossible.');
    }
  }, [onAuthLost]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const write = async (body: Parameters<typeof adminWrite>[0], okText: string) => {
    await adminWrite(body);
    setFlash({ tone: 'ok', text: okText });
    await reload();
  };

  /** Archivage / restauration depuis la liste (confirmation pour l'archivage). */
  const toggleArchive = async (body: Parameters<typeof adminWrite>[0], confirmText: string | null, okText: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await write(body, okText);
    } catch (err) {
      handleError(err);
    }
  };

  const q = fold(query.trim());
  const filtering = q !== '' || themeFilter !== '';

  const statsBySource = useMemo(() => {
    const map = new Map<string, StatRow[]>();
    for (const s of data?.stats ?? []) {
      if (!showArchived && s.archived_at) continue;
      if (themeFilter && s.theme !== themeFilter) continue;
      if (q && !fold(`${s.id} ${s.claim} ${s.verbatim} ${s.original_source ?? ''}`).includes(q)) continue;
      map.set(s.source_code, [...(map.get(s.source_code) ?? []), s]);
    }
    return map;
  }, [data, showArchived, themeFilter, q]);

  if (loadError) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <Notice tone="error">{loadError}</Notice>
        <div><WizardButton variant="ghost" onClick={() => void reload()}>Réessayer</WizardButton></div>
      </div>
    );
  }
  if (!data) return <p style={{ color: 'var(--ink-3)' }}>Chargement de la banque…</p>;

  const sectionLabel = (id: string) => data.gridSections.find((g) => g.id === id)?.label ?? id;
  const activeSources = data.sources.filter((s) => !s.archived_at);
  const visibleSources = data.sources.filter((src) => {
    if (src.archived_at && !showArchived) return false;
    if (!filtering) return true;
    return (statsBySource.get(src.code)?.length ?? 0) > 0 || (q !== '' && fold(`${src.code} ${src.report} ${src.org}`).includes(q));
  });
  const rejectedById = new Map(data.rejected.map((r) => [`${r.kind}:${r.id}`, r.reason]));

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div className="adm-summary">
        <div><strong>{data.citableCount}</strong> statistiques citables</div>
        <div><strong>{activeSources.length}</strong> documents actifs</div>
        <div><strong>{data.stats.filter((s) => s.archived_at).length}</strong> statistiques archivées</div>
        {data.rejected.length > 0 && (
          <div style={{ color: 'var(--risk)' }}><strong style={{ color: 'inherit' }}>{data.rejected.length}</strong> écartées à la génération</div>
        )}
      </div>

      {data.citableCount === 0 && (
        <Notice tone="error">
          Aucune statistique citable en base : la génération utilise la banque d’origine du code tant que la banque reste vide.
        </Notice>
      )}
      {data.rejected.length > 0 && (
        <Notice tone="error">
          {data.rejected.length} ligne{data.rejected.length > 1 ? 's' : ''} active{data.rejected.length > 1 ? 's' : ''} ne respecte{data.rejected.length > 1 ? 'nt' : ''} plus les règles de saisie et {data.rejected.length > 1 ? 'sont' : 'est'} ignorée{data.rejected.length > 1 ? 's' : ''} par la génération. Elles portent le badge « Écartée à la génération » : les ouvrir et les enregistrer à nouveau pour les corriger.
        </Notice>
      )}

      <Notice tone="warn">
        Chaque modification s’applique aux pré-rapports générés à partir de maintenant. Les rapports déjà envoyés ne changent pas.
        Une statistique ne doit être saisie qu’après vérification dans le document d’origine.
      </Notice>

      <div className="adm-toolbar">
        <input
          className="pr-field"
          type="search"
          placeholder="Rechercher une statistique (texte, identifiant, source)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher"
          style={{ flex: '1 1 280px' }}
        />
        <select className="pr-field pr-select" value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)} aria-label="Filtrer par thème" style={{ flex: '0 1 220px' }}>
          <option value="">Tous les thèmes</option>
          {THEMES.map((t) => <option key={t} value={t}>{THEME_LABELS[t]}</option>)}
        </select>
        <label className={`adm-chip${showArchived ? ' adm-chip--on' : ''}`}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Afficher les archivées
        </label>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <WizardButton variant="ghost" onClick={() => setEditing({ kind: 'source' })}>+ Document</WizardButton>
          <WizardButton onClick={() => setEditing({ kind: 'stat' })} disabled={activeSources.length === 0}>+ Statistique</WizardButton>
        </div>
      </div>

      {flash && (
        <div onClick={() => setFlash(null)} style={{ cursor: 'pointer' }}>
          <Notice tone={flash.tone === 'ok' ? 'ok' : 'error'}>{flash.text}</Notice>
        </div>
      )}

      {visibleSources.length === 0 && <p style={{ color: 'var(--ink-3)' }}>Aucun résultat.</p>}

      <div style={{ display: 'grid', gap: 14 }}>
        {visibleSources.map((src) => {
          const stats = statsBySource.get(src.code) ?? [];
          const total = data.stats.filter((s) => s.source_code === src.code && !s.archived_at).length;
          const expanded = filtering || !!open[src.code];
          return (
            <section key={src.code} className={`adm-card${src.archived_at ? ' adm-card--archived' : ''}`}>
              <div className="adm-card-head">
                <button type="button" className="adm-expand" onClick={() => setOpen((o) => ({ ...o, [src.code]: !o[src.code] }))} aria-expanded={expanded}>
                  <span style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--ink-3)' }}>›</span>
                  <Badge tone="violet">{src.code}</Badge>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', textAlign: 'left' }}>{src.report}</span>
                </button>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {src.archived_at ? (
                    <SmallButton onClick={() => void toggleArchive({ action: 'restoreSource', code: src.code }, null, `Document ${src.code} restauré.`)}>Restaurer</SmallButton>
                  ) : (
                    <>
                      <SmallButton onClick={() => setEditing({ kind: 'stat', sourceCode: src.code })}>+ Stat</SmallButton>
                      <SmallButton onClick={() => setEditing({ kind: 'source', row: src })}>Modifier</SmallButton>
                      <SmallButton
                        danger
                        onClick={() =>
                          void toggleArchive(
                            { action: 'archiveSource', code: src.code },
                            `Retirer le document ${src.code} et ses ${total} statistiques de la banque ? Elles ne seront plus citées. Vous pourrez le restaurer.`,
                            `Document ${src.code} archivé.`,
                          )
                        }
                      >
                        Supprimer
                      </SmallButton>
                    </>
                  )}
                </div>
              </div>
              <div className="adm-meta">
                <span>{src.org} · {src.year}</span>
                <Badge tone={src.in_socle ? 'neutral' : 'amber'}>{src.in_socle ? 'Socle' : 'Couche France'}</Badge>
                <Badge>{src.nature === 'recherche' ? 'Recherche' : 'Commerciale'}</Badge>
                <span>{total} stat{total > 1 ? 's' : ''}</span>
                {src.archived_at && <Badge tone="risk">Archivé</Badge>}
                {rejectedById.has(`source:${src.code}`) && (
                  <Badge tone="risk" title={rejectedById.get(`source:${src.code}`)}>Écarté à la génération : {rejectedById.get(`source:${src.code}`)}</Badge>
                )}
                {src.sections.length === 0 ? (
                  <Badge tone="risk" title="Aucune section n’est autorisée à citer ce document">Citée nulle part</Badge>
                ) : (
                  <span title="Sections autorisées à citer ce document">Citable en {src.sections.map(sectionLabel).join(', ')}</span>
                )}
              </div>
              {src.note && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic' }}>{src.note}</p>}

              {expanded && (
                <ul className="adm-stats">
                  {stats.length === 0 && <li style={{ color: 'var(--ink-3)', fontSize: 14 }}>Aucune statistique{filtering ? ' ne correspond au filtre' : ''}.</li>}
                  {stats.map((s) => {
                    const cited = data.citations[s.id] ?? 0;
                    return (
                      <li key={s.id} className={`adm-stat${s.archived_at ? ' adm-stat--archived' : ''}`}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div className="adm-value">{formatValue(s)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'var(--ink)' }}>{s.claim}</p>
                            <div className="adm-meta" style={{ marginTop: 6 }}>
                              <code style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>{s.id}</code>
                              <Badge>{THEME_LABELS[s.theme as StatTheme] ?? s.theme}</Badge>
                              <Badge>{SCOPE_LABELS[s.scope as StatScope] ?? s.scope}</Badge>
                              {s.provenance === 'secondaire' && <Badge tone="amber" title={s.original_source ?? 'Source d’origine non renseignée'}>Secondaire{s.original_source ? ` : ${s.original_source}` : ''}</Badge>}
                              {s.projection && <Badge tone="amber">Projection</Badge>}
                              {s.isco.length > 0 && <Badge tone="violet" title="Codes ISCO rattachés">ISCO {s.isco.join(', ')}</Badge>}
                              {s.page && <span>{s.page}</span>}
                              <span title="Rapports envoyés qui citent cette statistique">{cited > 0 ? `citée dans ${cited} rapport${cited > 1 ? 's' : ''}` : 'jamais citée'}</span>
                              {s.archived_at && <Badge tone="risk">Archivée</Badge>}
                              {rejectedById.has(`stat:${s.id}`) && (
                                <Badge tone="risk" title={rejectedById.get(`stat:${s.id}`)}>Écartée à la génération : {rejectedById.get(`stat:${s.id}`)}</Badge>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {s.archived_at ? (
                              <SmallButton
                                disabled={!!src.archived_at}
                                onClick={() => void toggleArchive({ action: 'restoreStat', id: s.id }, null, 'Statistique restaurée.')}
                              >
                                Restaurer
                              </SmallButton>
                            ) : (
                              <>
                                <SmallButton disabled={!!src.archived_at} onClick={() => setEditing({ kind: 'stat', row: s })}>Modifier</SmallButton>
                                <SmallButton
                                  danger
                                  onClick={() =>
                                    void toggleArchive(
                                      { action: 'archiveStat', id: s.id },
                                      `Retirer cette statistique de la banque ? Elle ne sera plus citée dans les prochains rapports. Vous pourrez la restaurer.\n\n« ${s.claim} »`,
                                      'Statistique archivée.',
                                    )
                                  }
                                >
                                  Supprimer
                                </SmallButton>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {editing?.kind === 'source' && (
        <Modal title={editing.row ? `Modifier le document ${editing.row.code}` : 'Nouveau document source'} onClose={closeEditor} isDirty={isFormDirty}>
          <SourceForm
            initial={editing.row}
            takenCodes={data.sources.map((s) => s.code)}
            gridSections={data.gridSections}
            onCancel={closeEditor}
            onDirtyChange={setFormDirty}
            onSubmit={async (payload) => {
              try {
                await write({ action: editing.row ? 'updateSource' : 'createSource', data: payload }, editing.row ? 'Document enregistré.' : 'Document ajouté.');
                closeEditor();
              } catch (err) {
                if (err instanceof AdminAuthError) return onAuthLost();
                throw err;
              }
            }}
          />
        </Modal>
      )}

      {editing?.kind === 'stat' && (
        <Modal title={editing.row ? 'Modifier la statistique' : 'Nouvelle statistique'} onClose={closeEditor} isDirty={isFormDirty}>
          <StatForm
            initial={editing.row}
            defaultSourceCode={editing.sourceCode}
            sources={activeSources}
            gridSections={data.gridSections}
            onCancel={closeEditor}
            onDirtyChange={setFormDirty}
            onSubmit={async (payload) => {
              try {
                await write({ action: editing.row ? 'updateStat' : 'createStat', data: payload }, editing.row ? 'Statistique enregistrée.' : 'Statistique ajoutée.');
                closeEditor();
              } catch (err) {
                if (err instanceof AdminAuthError) return onAuthLost();
                throw err;
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
