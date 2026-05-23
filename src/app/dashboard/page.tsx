import { dataService } from "@/services/dataService";
import DashboardClient from "./DashboardClient";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function DashboardPage() {
    await headers(); // Force Next.js to render dynamically on request-time at Cloudflare Edge
    const navData = await dataService.getNAVData();
    const metrics = await dataService.getNIFMetrics();

    return <DashboardClient initialNAVData={navData} initialMetrics={metrics} />;
}
