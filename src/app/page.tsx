import Hero from "@/components/Hero";
import AboutSection from "@/components/sections/AboutSection";
import TeamSection from "@/components/sections/TeamSection";
import EventsSection from "@/components/sections/EventsSection";
import MagazinesSection from "@/components/sections/MagazinesSection";
import NAVSection from "@/components/sections/NAVSection";
import ResourcesSection from "@/components/sections/ResourcesSection";
import NoticesSection from "@/components/sections/NoticesSection";
import Footer from "@/components/Footer";
import { dataService } from "@/services/dataService";

export const revalidate = 60; // Revalidate homepage every 60s

export default async function Home() {
  const aboutData = await dataService.getAbout();
  const recentResources = await dataService.getResources();

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Hero />
      <div className="space-y-0">
        <AboutSection initialData={aboutData} />
        <TeamSection showHallOfFame={true} />
        <MagazinesSection />
        <EventsSection />
        <NoticesSection />
        <NAVSection />
        <ResourcesSection resources={recentResources} limit={3} bgColor="bg-muted/10" />
      </div>
      <Footer />
    </main>
  );
}
