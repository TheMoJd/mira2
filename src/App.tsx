import { StyleProvider, useStyle } from './context/StyleContext';
import Nav from './components/sections/Nav';
import Hero from './components/sections/Hero';
import HeroB from './components/sections/HeroB';
import HeroC from './components/sections/HeroC';
import Refs from './components/sections/Refs';
import Stats from './components/sections/Stats';
import Market from './components/sections/Market';
import Methode from './components/sections/Methode';
import Lectures from './components/sections/Lectures';
import Matrix from './components/sections/Matrix';
import Diff from './components/sections/Diff';
import Pricing from './components/sections/Pricing';
import Conformite from './components/sections/Conformite';
import FinalCTA from './components/sections/FinalCTA';
import Footer from './components/sections/Footer';
import StyleSwitcher from './components/StyleSwitcher';

function HeroByVariation() {
  const { variation } = useStyle();
  if (variation === 'b') return <HeroB />;
  if (variation === 'c') return <HeroC />;
  return <Hero />;
}

function AppInner() {
  return (
    <>
      <Nav />
      <main>
        <HeroByVariation />
        <Refs />
        <Stats />
        <Market />
        <Methode />
        <Lectures />
        <Matrix />
        <Diff />
        <Pricing />
        <Conformite />
        <FinalCTA />
      </main>
      <Footer />
      <StyleSwitcher />
    </>
  );
}

export default function App() {
  return (
    <StyleProvider>
      <AppInner />
    </StyleProvider>
  );
}
