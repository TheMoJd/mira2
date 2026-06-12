import { useRef, useEffect } from 'react';
import { useMotionPrefs } from '../../hooks/useMotionPrefs';

interface HeroFieldProps {
  /** Nombre de points sur desktop (réduit automatiquement sur mobile). */
  count?: number;
  /** Répulsion légère autour du curseur (desktop uniquement). */
  interactive?: boolean;
}

interface Pt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** true → accent cyan, sinon violet. */
  accent: boolean;
}

const LINK = 110; // distance max (px) pour tracer une ligne entre deux points
const REPEL = 120; // rayon de répulsion du curseur

/** Champ de points « cartographie » : constellation 2D dérivante reliée par
 *  des lignes dont l'alpha décroît avec la distance. Canvas pur, zéro
 *  dépendance. La boucle s'arrête hors viewport et onglet caché ;
 *  reduced-motion ne dessine qu'une frame statique. */
export default function HeroField({ count = 70, interactive = true }: HeroFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { reduced, finePointer } = useMotionPrefs();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const n = window.innerWidth < 1000 ? Math.round(count * 0.55) : count;
    const pointer = { x: -9999, y: -9999 };
    let pts: Pt[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let inView = true;

    const seed = () => {
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        accent: Math.random() < 0.18,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const a = (1 - Math.sqrt(d2) / LINK) * 0.15;
          ctx.strokeStyle = `rgba(53,19,125,${a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
      for (const p of pts) {
        ctx.fillStyle = p.accent ? 'rgba(67,198,232,.45)' : 'rgba(53,19,125,.30)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.accent ? 2.2 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL * REPEL && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = ((REPEL - d) / REPEL) * 0.35;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    const start = () => {
      if (raf || reduced || !inView || document.hidden) return;
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(canvas);

    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);

    const onMove = (e: globalThis.PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const track = interactive && finePointer && !reduced;
    if (track) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerleave', onLeave);
    }

    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (track) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerleave', onLeave);
      }
    };
  }, [count, interactive, reduced, finePointer]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
