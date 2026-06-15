"use client";

import { useEffect, useState } from "react";
import { dataService, NAVData, NIFMetrics } from "@/services/dataService";
import DashboardClient from "./DashboardClient";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const [navData, setNavData] = useState<NAVData[]>([]);
    const [metrics, setMetrics] = useState<NIFMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            dataService.getNAVData(),
            dataService.getNIFMetrics()
        ]).then(([nav, met]) => {
            setNavData(nav);
            setMetrics(met);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </main>
        );
    }

    return <DashboardClient initialNAVData={navData} initialMetrics={metrics} />;
}
