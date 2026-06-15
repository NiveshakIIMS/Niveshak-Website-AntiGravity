"use client";

import Hero from "@/components/Hero";
import AboutSection from "@/components/sections/AboutSection";
import TeamSection from "@/components/sections/TeamSection";
import EventsSection from "@/components/sections/EventsSection";
import MagazinesSection from "@/components/sections/MagazinesSection";
import NAVSection from "@/components/sections/NAVSection";
import ResourcesSection from "@/components/sections/ResourcesSection";
import NoticesSection from "@/components/sections/NoticesSection";
import Footer from "@/components/Footer";

export default function Home() {
  const defaultAboutData = {
    title: "About Niveshak",
    description: "The Finance and Investment Club of IIM Shillong...",
    cards: [
      { title: "Target", description: "Promoting financial literacy..." },
      { title: "Team", description: "Minds behind the club..." },
      { title: "Book", description: "Publications..." }
    ],
    slides: []
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Hero />
      <div className="space-y-0">
        <AboutSection initialData={defaultAboutData} />
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
