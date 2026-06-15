"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import AboutSection from "@/components/sections/AboutSection";
import TeamSection from "@/components/sections/TeamSection";
import EventsSection from "@/components/sections/EventsSection";
import MagazinesSection from "@/components/sections/MagazinesSection";
import NAVSection from "@/components/sections/NAVSection";
import ResourcesSection from "@/components/sections/ResourcesSection";
import NoticesSection from "@/components/sections/NoticesSection";
import Footer from "@/components/Footer";
import { dataService, AboutContent, Magazine, TeamMember, Event, Notice, NAVData, NIFMetrics, HeroSlide } from "@/services/dataService";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    aboutData: AboutContent;
    recentResources: any[];
    magazines: Magazine[];
    teamMembers: TeamMember[];
    events: Event[];
    notices: Notice[];
    navData: NAVData[];
    nifMetrics: NIFMetrics | null;
    heroSlides: HeroSlide[];
  }>({
    aboutData: { title: "About Niveshak", description: "Loading content...", slides: [], cards: [], richContent: [] },
    recentResources: [],
    magazines: [],
    teamMembers: [],
    events: [],
    notices: [],
    navData: [],
    nifMetrics: null,
    heroSlides: []
  });

  useEffect(() => {
    const loadAllData = async () => {
      try {
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
        setData({
          aboutData,
          recentResources,
          magazines,
          teamMembers,
          events,
          notices,
          navData,
          nifMetrics,
          heroSlides
        });
      } catch (err) {
        console.error("Failed to fetch homepage data on client:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Hero initialSlides={data.heroSlides} />
      <div className="space-y-0">
        <AboutSection initialData={data.aboutData} />
        <TeamSection showHallOfFame={true} initialMembers={data.teamMembers} />
        <MagazinesSection limit={4} showFilters={false} showViewAll={true} initialMagazines={data.magazines} />
        <EventsSection initialEvents={data.events} />
        <NoticesSection initialNotices={data.notices} />
        <NAVSection initialNAVData={data.navData} initialMetrics={data.nifMetrics} />
        <ResourcesSection resources={data.recentResources} limit={3} bgColor="bg-muted/10" />
      </div>
      <Footer />
    </div>
  );
}
