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
import Footer from './components/sections/Footer';

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Refs />
        <Stats />
        <Methode />
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
