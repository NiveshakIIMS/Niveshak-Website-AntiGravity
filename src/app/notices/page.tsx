import { dataService } from "@/services/dataService";
import NoticesClient from "./NoticesClient";

export const revalidate = 60; // Revalidate every 60s

export default async function NoticesPage() {
    const notices = await dataService.getNotices();

    return <NoticesClient initialNotices={notices} />;
}
