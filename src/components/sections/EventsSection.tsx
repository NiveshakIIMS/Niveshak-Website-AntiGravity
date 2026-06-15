"use client";

import { useState, useEffect } from "react";
import { dataService, Event } from "@/services/dataService";
import EventCard from "@/components/EventCard";
import { ArrowRight, Loader2 } from "lucide-react";

interface EventsSectionProps {
    initialEvents?: Event[];
}

export default function EventsSection({ initialEvents = [] }: EventsSectionProps) {
    const [events, setEvents] = useState<Event[]>(() => {
        if (initialEvents.length === 0) return [];
        return initialEvents
            .filter(e => e.type !== "Past")
            .sort((a, b) => {
                if (a.type === "Live" && b.type !== "Live") return -1;
                if (a.type !== "Live" && b.type === "Live") return 1;
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            })
            .slice(0, 4);
    });
    const [isLoading, setIsLoading] = useState(initialEvents.length === 0);

    useEffect(() => {
        if (initialEvents.length > 0) {
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        const loadEvents = async () => {
            try {
                const allEvents = await dataService.getEvents();
                const eventsToShow = allEvents
                    .filter(e => e.type !== "Past")
                    .sort((a, b) => {
                        if (a.type === "Live" && b.type !== "Live") return -1;
                        if (a.type !== "Live" && b.type === "Live") return 1;
                        return new Date(a.date).getTime() - new Date(b.date).getTime();
                    })
                    .slice(0, 4);
                if (eventsToShow && eventsToShow.length > 0) {
                    setEvents(eventsToShow);
                }
            } catch (err) {
                console.error("Failed to load events in background:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadEvents();
    }, [initialEvents]);
    return (

        <section id="events" className="py-20 px-4 bg-background transition-colors">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Events & <span className="text-accent">Activities</span></h2>
                    <p className="text-lg text-muted-foreground">Join us for learning and competition</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center text-muted-foreground">No upcoming events scheduled. Stay tuned!</div>
                ) : (
                    <div className={`${events.length < 3 ? 'flex flex-wrap justify-center' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 justify-items-center'} gap-8 max-w-5xl mx-auto`}>
                        {events.map((event) => (
                            <div key={event.id} className={events.length < 3 ? "w-full max-w-md" : "w-full max-w-md"}>
                                <EventCard event={event} />
                            </div>
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
