import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutSection from "@/components/sections/AboutSection";
import TeamSection from "@/components/sections/TeamSection";
import MagazinesSection from "@/components/sections/MagazinesSection";
import EventsSection from "@/components/sections/EventsSection";
import NAVSection from "@/components/sections/NAVSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <AboutSection />
      <TeamSection />
      <MagazinesSection limit={4} showFilters={false} showViewAll={true} showTitle={true} />
      <EventsSection />
      <NAVSection />
      <Footer />
    </main>
  );
}
