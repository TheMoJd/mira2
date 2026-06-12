import { motion, useScroll, useSpring } from 'framer-motion';

/** Barre de progression de lecture, collée au bas du header fixe. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  return (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -1,
        height: 2,
        transformOrigin: '0 50%',
        scaleX,
        background: 'linear-gradient(90deg, var(--violet), #9a6bff, var(--cyan))',
      }}
    />
  );
}
