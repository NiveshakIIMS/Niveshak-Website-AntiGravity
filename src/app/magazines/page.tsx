"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import MagazinesSection from "@/components/sections/MagazinesSection";
import { dataService, Magazine } from "@/services/dataService";
import { Loader2 } from "lucide-react";

export default function Magazines() {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getMagazines().then(setMagazines).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background">
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border transition-colors">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Niveshak <span className="text-accent">Magazine</span>
                    </h1>
                    <p className="text-xl text-muted-foreground">Insights into the financial world, curated by students.</p>
                </div>
            </section>

            <MagazinesSection initialMagazines={magazines} />
            <Footer />
        </main>
    );
}
