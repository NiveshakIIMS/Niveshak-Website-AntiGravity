"use client";

import { useEffect, useState } from "react";
import { dataService, NAVData, NIFInvestment } from "@/services/dataService";
import CalculatorClient from "@/components/dashboard/CalculatorClient";
import { Loader2 } from "lucide-react";

export default function CalculatorPage() {
    const [navData, setNavData] = useState<NAVData[]>([]);
    const [investments, setInvestments] = useState<NIFInvestment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            dataService.getNAVData(),
            dataService.getNIFInvestments()
        ]).then(([nav, invs]) => {
            setNavData(nav);
            setInvestments(invs);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </main>
        );
    }

    return <CalculatorClient initialNAVData={navData} initialInvestments={investments} />;
}
