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

export default async function Home() {
  const [aboutData, members, magazines, events, notices, resources, slides] = await Promise.all([
    dataService.getAbout(),
    dataService.getTeam(),
    dataService.getMagazines(),
    dataService.getEvents(),
    dataService.getNotices(),
    dataService.getResources(),
    dataService.getHeroSlides()
  ]);

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
      <Hero initialSlides={slides || []} />
      <div className="space-y-0">
        <AboutSection initialData={aboutData || defaultAboutData} />
        <TeamSection showHallOfFame={true} initialMembers={members || []} />
        <MagazinesSection limit={4} showFilters={false} showViewAll={true} initialMagazines={magazines || []} />
        <EventsSection initialEvents={events || []} />
        <NoticesSection initialNotices={notices || []} />
        <NAVSection />
        <ResourcesSection limit={3} bgColor="bg-muted/10" resources={resources || []} />
      </div>
      <Footer />
    </div>
  );
}
