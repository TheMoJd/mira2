import { motion } from 'framer-motion';
import RadialGauge from './RadialGauge';
import ExposureBars from './ExposureBars';
import mira from '../../data/mira';

export default function DashboardMock() {
  const jobs = mira.jobs;
  return (
    <div className="dash-mock" style={{ position: 'relative', width: '100%', maxWidth: 540 }}>
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        style={{
          position: 'relative', background: 'var(--dk-1)', border: '1px solid var(--dk-line)',
          borderRadius: 'var(--r-lg)', padding: '22px 24px 24px', boxShadow: 'var(--shadow-lg)',
          color: 'var(--dk-ink)', backdropFilter: 'blur(8px)',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--violet-300)', boxShadow: '0 0 0 4px rgba(182,162,255,.25)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', color: 'var(--dk-mut)' }}>RAPPORT DE TRANSFORMATION</span>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--opp)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--opp)' }} /> LIVE
          </span>
        </div>

        {/* body */}
        <div className="gauge-split" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 22, alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
            <RadialGauge value={61} size={150} dark />
            <span style={{ fontSize: 12, color: 'var(--dk-mut)', textAlign: 'center', maxWidth: 130, lineHeight: 1.3 }}>Vulnérabilité organisationnelle</span>
          </div>
          <ExposureBars jobs={jobs} dark max={5} />
        </div>

        {/* footer chips */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid var(--dk-line)' }}>
          {[['12', 'métiers'], ['3', 'lectures'], ['48', 'actions']].map(([v, l]) => (
            <div key={l} style={{ flex: 1, textAlign: 'center' }}>
              <div className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--dk-ink)' }}>{v}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--dk-mut)', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* floating chip: opportunité */}
      <motion.div
        className="dash-chip"
        initial={{ opacity: 0, x: 30, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        style={{
          position: 'absolute', right: -20, top: -24, background: 'var(--paper)', color: 'var(--ink)',
          borderRadius: 14, padding: '12px 15px', boxShadow: 'var(--shadow)', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 11,
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(44,193,143,.14)', color: 'var(--opp)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>↗</span>
        <div>
          <div className="tnum" style={{ fontWeight: 700, fontSize: 16 }}>+82&nbsp;%</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>opportunité Data/IT</div>
        </div>
      </motion.div>

      {/* floating chip: métiers */}
      <motion.div
        className="dash-chip"
        initial={{ opacity: 0, x: -30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        style={{
          position: 'absolute', left: -24, bottom: -20, background: 'var(--paper)', color: 'var(--ink)',
          borderRadius: 14, padding: '11px 14px', boxShadow: 'var(--shadow)', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk)' }} />
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
          Support client · <span style={{ color: 'var(--risk)' }}>exposition 78</span>
        </div>
      </motion.div>
    </div>
  );
}
