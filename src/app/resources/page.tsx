"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import ResourcesSection from "@/components/sections/ResourcesSection";
import { dataService, Resource } from "@/services/dataService";
import { Loader2 } from "lucide-react";

export default function Resources() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getResources().then(setResources).finally(() => setLoading(false));
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
            {/* Header Section */}
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border transition-colors">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        <span className="text-accent">Resources</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        A curated library of educational materials and reports from Niveshak.
                    </p>
                </div>
            </section>

            <ResourcesSection resources={resources} />
            <Footer />
        </main>
    );
}
