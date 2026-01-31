"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { dataService, Event } from "@/services/dataService";
import EventCard from "@/components/EventCard";

export default function Events() {
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        dataService.getEvents().then(data => {
            // Sort by Date Descending (Newest first) or Ascending? Usually upcoming first.
            // Let's sort by date: Upcoming/Live first, then Past?
            // Or just simple date sort.

            // Let's assume date sort: Future -> Past
            setEvents(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        });
    }, []);

    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border transition-colors">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Events <span className="text-accent">Calendar</span>
                    </h1>
                    <p className="text-xl text-muted-foreground">Join us for learning and competition</p>
                </div>
            </section>

            <section className="py-20 px-4 max-w-7xl mx-auto">
                <div className="space-y-12">
                    {/* Live Events Section */}
                    {events.filter(e => e.type === "Live").length > 0 && (
                        <div className="mb-16">
                            <h2 className="text-2xl font-bold mb-6 border-l-4 border-red-600 pl-4">Live Now</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {events.filter(e => e.type === "Live").map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Events Section */}
                    {events.filter(e => e.type === "Upcoming").length > 0 && (
                        <div className="mb-16">
                            <h2 className="text-2xl font-bold mb-6 border-l-4 border-blue-600 pl-4">Upcoming Events</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {events
                                    .filter(e => e.type === "Upcoming")
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .map((event) => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Past Events Section */}
                    {events.filter(e => e.type === "Past").length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6 border-l-4 border-gray-400 pl-4">Past Events</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {events
                                    .filter(e => e.type === "Past")
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((event) => (
                                        <div key={event.id} className="opacity-80 hover:opacity-100 transition-opacity">
                                            <EventCard event={event} />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {events.length === 0 && (
                        <div className="text-center text-muted-foreground py-20">No events found.</div>
                    )}
                </div>
            </section>
            <Footer />
        </main>
    );
}
