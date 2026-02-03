"use client";

import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { dataService, Event } from "@/services/dataService";
import EventCard from "@/components/EventCard";

export default function Events() {
    const [events, setEvents] = useState<Event[]>([]);
    const [filter, setFilter] = useState("All");
    const [year, setYear] = useState("All");
    const [month, setMonth] = useState("All");

    useEffect(() => {
        dataService.getEvents().then(setEvents);
    }, []);

    // Extract years
    const years = Array.from(new Set(events.map(e => new Date(e.date).getFullYear()))).sort((a, b) => b - a);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const filteredEvents = events
        .filter(event => {
            const eventDate = new Date(event.date);
            const matchesYear = year === "All" || eventDate.getFullYear().toString() === year;
            const matchesMonth = month === "All" || eventDate.getMonth() === parseInt(month);

            // Type Filter
            let matchesType = false;
            if (filter === "All") {
                matchesType = event.type !== "Past";
            } else {
                matchesType = event.type === filter;
            }

            return matchesType && matchesYear && matchesMonth;
        })
        .sort((a, b) => {
            // Custom sort order: Live > Upcoming > Past
            const typeOrder: { [key: string]: number } = { "Live": 0, "Upcoming": 1, "Past": 2 };
            const typeDiff = (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
            if (typeDiff !== 0) return typeDiff;

            // Secondary sort by Date
            if (a.type === "Past") {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

    return (
        <main className="min-h-screen bg-background">
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border transition-colors">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Events & <span className="text-accent">Activities</span>
                    </h1>
                    <p className="text-xl text-muted-foreground">Join us for learning and competition</p>
                </div>
            </section>

            <section className="py-12 px-4 max-w-7xl mx-auto">
                <div className="space-y-8">
                    {/* Controls Config */}
                    <div className="flex flex-col md:flex-row justify-center items-center gap-6">
                        {/* Type Filters */}
                        <div className="flex flex-wrap justify-center gap-3">
                            {["All", "Live", "Upcoming", "Past"].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={`px-5 py-2.5 rounded-full font-bold transition-all ${filter === cat
                                        ? "bg-accent text-white shadow-lg shadow-blue-500/25 scale-105"
                                        : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Date Filters */}
                        <div className="flex gap-3">
                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-accent outline-none"
                            >
                                <option value="All">Year: All</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>

                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-accent outline-none"
                            >
                                <option value="All">Month: All</option>
                                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.length > 0 ? (
                            filteredEvents.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))
                        ) : (
                            <div className="col-span-full text-center text-muted-foreground py-20">
                                <p className="text-xl">No events found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <Footer />
        </main>
    );
}
