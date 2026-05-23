import { dataService } from "@/services/dataService";
import NoticesClient from "./NoticesClient";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function NoticesPage() {
    const notices = await dataService.getNotices();

    return <NoticesClient initialNotices={notices} />;
}
