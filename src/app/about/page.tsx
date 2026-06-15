"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import AboutClient from "@/components/AboutClient";
import { dataService, AboutContent } from "@/services/dataService";
import { Loader2 } from "lucide-react";

export default function About() {
    const [data, setData] = useState<AboutContent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getAbout().then(setData).finally(() => setLoading(false));
    }, []);

    if (loading || !data) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background">
            <AboutClient data={data} />
            <Footer />
        </main>
    );
}
