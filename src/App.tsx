import Nav from './components/sections/Nav';
import Hero from './components/sections/Hero';
import Refs from './components/sections/Refs';
import Stats from './components/sections/Stats';
import Methode from './components/sections/Methode';
import Lectures from './components/sections/Lectures';
import Matrix from './components/sections/Matrix';
import Diff from './components/sections/Diff';
import Pricing from './components/sections/Pricing';
import Conformite from './components/sections/Conformite';
import FinalCTA from './components/sections/FinalCTA';
import { useEffect } from 'react';
import Footer from './components/sections/Footer';
import Grain from './components/fx/Grain';
import SectionDivider from './components/fx/SectionDivider';
import { initSmoothScroll } from './lib/scroll';

export default function App() {
  useEffect(() => {
    initSmoothScroll();
  }, []);

  return (
    <>
      <Grain />
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
        <Pricing />
        <Conformite />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
