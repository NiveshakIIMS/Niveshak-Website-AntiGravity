import { dataService } from "@/services/dataService";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
    const [navData, metrics] = await Promise.all([
        dataService.getNAVData(),
        dataService.getNIFMetrics()
    ]);

    return <DashboardClient initialNAVData={navData || []} initialMetrics={metrics} />;
}
