import { dataService } from "@/services/dataService";
import DashboardClient from "./DashboardClient";

export const revalidate = 60; // Revalidate every 60s

export default async function DashboardPage() {
    const navData = await dataService.getNAVData();
    const metrics = await dataService.getNIFMetrics();

    return <DashboardClient initialNAVData={navData} initialMetrics={metrics} />;
}
