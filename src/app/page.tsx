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
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function Home() {
  await headers(); // Force dynamic render
  const [aboutData, recentResources, magazines, teamMembers, events, notices, navData, nifMetrics, heroSlides] = await Promise.all([
    dataService.getAbout(),
    dataService.getResources(),
    dataService.getMagazines(),
    dataService.getTeam(),
    dataService.getEvents(),
    dataService.getNotices(),
    dataService.getNAVData(),
    dataService.getNIFMetrics(),
    dataService.getHeroSlides()
  ]);

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Hero initialSlides={heroSlides} />
      <div className="space-y-0">
        <AboutSection initialData={aboutData} />
        <TeamSection showHallOfFame={true} initialMembers={teamMembers} />
        <MagazinesSection limit={4} showFilters={false} showViewAll={true} initialMagazines={magazines} />
        <EventsSection initialEvents={events} />
        <NoticesSection initialNotices={notices} />
        <NAVSection initialNAVData={navData} initialMetrics={nifMetrics} />
        <ResourcesSection resources={recentResources} limit={3} bgColor="bg-muted/10" />
      </div>
      <Footer />
    </div>
  );
}
