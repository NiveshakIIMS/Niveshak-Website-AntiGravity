import { dataService } from "@/services/dataService";
import EventsClient from "./EventsClient";

export default async function EventsPage() {
    const events = await dataService.getEvents();

    return <EventsClient initialEvents={events || []} />;
}
