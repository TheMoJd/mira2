import { useEffect } from 'react';
import Nav from '../components/sections/Nav';
import Hero from '../components/sections/Hero';
import Refs from '../components/sections/Refs';
import Stats from '../components/sections/Stats';
import Methode from '../components/sections/Methode';
import Lectures from '../components/sections/Lectures';
import Matrix from '../components/sections/Matrix';
import Diff from '../components/sections/Diff';
import Testimonials from '../components/sections/Testimonials';
import Pricing from '../components/sections/Pricing';
import Conformite from '../components/sections/Conformite';
import FinalCTA from '../components/sections/FinalCTA';
import Footer from '../components/sections/Footer';
import SectionDivider from '../components/fx/SectionDivider';
import { initSmoothScroll } from '../lib/scroll';

/** Page d'accueil marketing — l'assemblage des sections (cf. CLAUDE.md). */
export default function Landing() {
  useEffect(() => {
    initSmoothScroll();
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Refs />
        <Stats />
        <SectionDivider from="var(--bg)" to="var(--dk)" />
        <Methode />
        <SectionDivider from="var(--dk)" to="var(--bg)" flip />
        <Lectures />
        <Matrix />
        <Diff />
        <Testimonials />
        <Pricing />
        <Conformite />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
