"use client";

import { useEffect, useState } from "react";
import { dataService, Event } from "@/services/dataService";
import EventsClient from "./EventsClient";
import { Loader2 } from "lucide-react";

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getEvents().then(setEvents).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </main>
        );
    }

    return <EventsClient initialEvents={events} />;
}
