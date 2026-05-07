import { dataService } from "@/services/dataService";
import EventsClient from "./EventsClient";

export const revalidate = 60; // Revalidate every 60s

export default async function EventsPage() {
    const events = await dataService.getEvents();

    return <EventsClient initialEvents={events} />;
}
