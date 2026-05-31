import Reveal from '../ui/Reveal';
import Head from '../ui/Head';
import mira from '../../data/mira';

export default function Methode() {
  return (
    <section id="methode" style={{ background: 'var(--dk)', color: 'var(--dk-ink)', padding: '110px 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '10%', left: '50%', width: 700, height: 700, transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(106,69,255,.16), transparent 60%)', filter: 'blur(30px)' }} />
      <div className="wrap" style={{ position: 'relative' }}>
        <Head dark kicker="Le protocole en 3 phases" title="Du pré-rapport sectoriel au plan de transformation." sub="MIRA n'est pas un chatbot RH. C'est un protocole de diagnostic structuré qui produit une intelligence organisationnelle actionnable." center max={680} />
        <div className="phases-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {mira.phases.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.1} y={30}>
              <div style={{ background: 'linear-gradient(180deg, var(--dk-2), var(--dk-1))', border: '1px solid var(--dk-line)', borderRadius: 'var(--r-lg)', padding: '30px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                  <span className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 40, color: 'var(--violet-300)' }}>{p.n}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--violet)', border: '1px solid rgba(106,69,255,.35)', borderRadius: 999, padding: '5px 11px' }}>{p.tag}</span>
                </div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: '0 0 6px', color: '#fff', fontWeight: 500 }}>{p.title}</h3>
                <div style={{ fontSize: 13, color: 'var(--violet-300)', marginBottom: 16, fontWeight: 500 }}>{p.role}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--dk-mut)', margin: '0 0 20px' }}>{p.body}</p>
                <div style={{ marginTop: 'auto', display: 'grid', gap: 9, paddingTop: 18, borderTop: '1px solid var(--dk-line)' }}>
                  {p.points.map((pt) => (
                    <div key={pt} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--dk-ink)' }}>
                      <span style={{ color: 'var(--violet)', marginTop: 1 }}>—</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
