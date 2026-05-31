import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from '../ui/Head';
import RadialGauge from '../charts/RadialGauge';
import ExposureBars from '../charts/ExposureBars';
import mira from '../../data/mira';

const team = [
  { n: 'L. Martin', role: 'Chargé support', risk: 'élevé', v: 78 },
  { n: 'S. Dubois', role: 'Comptable', risk: 'élevé', v: 71 },
  { n: 'A. Petit', role: 'Chargé marketing', risk: 'modéré', v: 58 },
  { n: 'K. Roy', role: 'Analyste data', risk: 'faible', v: 36 },
];

const skills: [string, number][] = [
  ['Pilotage IA', 82], ['Esprit critique', 74], ['Relation client', 68],
  ['Maîtrise outils', 41], ['Reporting manuel', 28],
];

function riskColor(r: string) {
  if (r === 'élevé') return 'var(--risk)';
  if (r === 'modéré') return 'var(--amber)';
  return 'var(--opp)';
}

function LecturePreview({ which }: { which: number }) {
  if (which === 0) {
    return (
      <div className="gauge-split" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 26, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RadialGauge value={61} size={150} dark />
          <div style={{ fontSize: 12.5, color: 'var(--dk-mut)', marginTop: 8 }}>Vulnérabilité globale</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: 'var(--dk-mut)', marginBottom: 14, fontFamily: 'var(--mono)' }}>EXPOSITION PAR FILIÈRE</div>
          <ExposureBars jobs={mira.jobs} dark max={5} />
        </div>
      </div>
    );
  }

  if (which === 1) {
    return (
      <div>
        <div style={{ fontSize: 13, color: 'var(--dk-mut)', marginBottom: 16, fontFamily: 'var(--mono)' }}>ÉQUIPE OPÉRATIONS · 12 COLLABORATEURS</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {team.map((t, i) => (
            <motion.div key={t.n} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14, alignItems: 'center', background: 'var(--dk-2)', borderRadius: 12, padding: '13px 16px' }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#fff' }}>{t.n}</div>
                <div style={{ fontSize: 12, color: 'var(--dk-mut)' }}>{t.role}</div>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: riskColor(t.risk), border: `1px solid ${riskColor(t.risk)}`, borderRadius: 999, padding: '3px 10px' }}>{t.risk}</span>
              <span className="tnum" style={{ fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--dk-ink)', width: 28, textAlign: 'right' }}>{t.v}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--violet)', display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)', fontSize: 22, color: '#fff' }}>LM</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Léa Martin</div>
          <div style={{ fontSize: 13, color: 'var(--dk-mut)' }}>Chargée de support client · exposition 78/100</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--dk-mut)', marginBottom: 14, fontFamily: 'var(--mono)' }}>COMPÉTENCES À RENFORCER</div>
      <div style={{ display: 'grid', gap: 11 }}>
        {skills.map(([s, v], i) => (
          <div key={s} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 34px', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--dk-ink)' }}>{s}</span>
            <div style={{ height: 7, borderRadius: 5, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${v}%` }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%', background: v >= 60 ? 'var(--opp)' : 'var(--amber)', borderRadius: 5 }}
              />
            </div>
            <span className="tnum" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dk-ink)', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Lectures() {
  const [active, setActive] = useState(0);
  const r = mira.readings[active];

  return (
    <section id="lectures" style={{ padding: '110px 0' }}>
      <div className="wrap">
        <Head kicker="Un diagnostic, trois lectures" title="Le même rapport, parlé dans trois langues." sub="Chaque niveau hiérarchique reçoit une restitution calibrée — de la vision stratégique consolidée à la fiche individuelle." />
        <div className="lect-grid" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 40, alignItems: 'stretch' }}>
          {/* tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mira.readings.map((rr, i) => {
              const on = i === active;
              return (
                <button key={rr.key} onClick={() => setActive(i)} style={{
                  textAlign: 'left', border: '1px solid', borderColor: on ? 'var(--violet)' : 'var(--line)',
                  background: on ? 'var(--violet-100)' : 'var(--paper)', borderRadius: 'var(--r)', padding: '20px 22px',
                  transition: 'all .25s ease', position: 'relative',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: on ? 8 : 0 }}>
                    <span className="tnum" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: on ? 'var(--violet-700)' : 'var(--ink-3)' }}>0{i + 1}</span>
                    <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{rr.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: on ? 'var(--violet-700)' : 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{rr.lead}</span>
                  </div>
                  <AnimatePresence>
                    {on && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, overflow: 'hidden' }}>
                        {rr.desc}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>

          {/* preview panel */}
          <div style={{ background: 'var(--dk-1)', borderRadius: 'var(--r-lg)', padding: '30px 32px', color: 'var(--dk-ink)', boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden', minHeight: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid var(--dk-line)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', color: 'var(--dk-mut)' }}>LECTURE · {r.label.toUpperCase()}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--violet-300)' }}>MIRA Pro</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.4 }}>
                <LecturePreview which={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
