import Hero from "@/components/Hero";
import AboutSection from "@/components/sections/AboutSection";
import TeamSection from "@/components/sections/TeamSection";
import EventsSection from "@/components/sections/EventsSection";
import MagazinesSection from "@/components/sections/MagazinesSection";
import NAVSection from "@/components/sections/NAVSection";
import ResourcesSection from "@/components/sections/ResourcesSection";
import NoticesSection from "@/components/sections/NoticesSection";
import Footer from "@/components/Footer";

export const dynamic = 'force-static';

export default function Home() {
  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Hero />
      <div className="space-y-0">
        <AboutSection />
        <TeamSection showHallOfFame={true} />
        <MagazinesSection limit={4} showFilters={false} showViewAll={true} />
        <EventsSection />
        <NoticesSection />
        <NAVSection />
        <ResourcesSection limit={3} bgColor="bg-muted/10" />
      </div>
      <Footer />
    </div>
  );
}
