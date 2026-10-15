import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import Features from '../components/Features.jsx';
import TrustSection from '../components/TrustSection.jsx';
import Footer from '../components/Footer.jsx';

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}