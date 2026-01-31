"use client";

import { useState, useEffect } from "react";
import { dataService, Event } from "@/services/dataService";
import EventCard from "@/components/EventCard";
import { ArrowRight } from "lucide-react";

export default function EventsSection() {
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        const loadEvents = async () => {
            // Sort by date upcoming
            const allEvents = await dataService.getEvents();
            // Simple logic: Show all (or filter by date if needed)
            // User Request: "homepage events... only difference is... past events would also show" (Wait, user said homepage matches events page EXCEPT events page shows past too. So homepage needs to HIDE past.)
            const eventsToShow = allEvents
                .filter(e => e.type !== "Past")
                .sort((a, b) => {
                    // Priority 1: Live events first
                    if (a.type === "Live" && b.type !== "Live") return -1;
                    if (a.type !== "Live" && b.type === "Live") return 1;

                    // Priority 2: Date Ascending (Nearest first)
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                })
                .slice(0, 2); // Max 2 events

            setEvents(eventsToShow);
        };
        loadEvents();
    }, []);

    return (

        <section id="events" className="py-20 px-4 bg-background transition-colors">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Events & <span className="text-accent">Activities</span></h2>
                    <p className="text-lg text-muted-foreground">Join us for learning and competition</p>
                </div>

                {events.length === 0 ? (
                    <div className="text-center text-muted-foreground">No upcoming events scheduled. Stay tuned!</div>
                ) : (
                    <div className={`${events.length === 1 ? 'flex justify-center' : 'grid grid-cols-1 md:grid-cols-2 justify-items-center'} gap-8 max-w-5xl mx-auto`}>
                        {events.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                )}

                <div className="mt-10 text-center">
                    <a href="/events" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-accent text-white font-semibold hover:bg-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        View All Events <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            </div>
        </section>
    );
}
