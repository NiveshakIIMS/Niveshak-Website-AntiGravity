import { dataService } from "@/services/dataService";
import DashboardClient from "./DashboardClient";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function DashboardPage() {
    const navData = await dataService.getNAVData();
    const metrics = await dataService.getNIFMetrics();

    return <DashboardClient initialNAVData={navData} initialMetrics={metrics} />;
}
