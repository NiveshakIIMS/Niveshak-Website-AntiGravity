import Footer from "@/components/Footer";
import ResourcesSection from "@/components/sections/ResourcesSection";
import { dataService } from "@/services/dataService";

export const revalidate = 60; // ISR

export default async function Resources() {
    // Fetch all resources
    const resources = await dataService.getResources();

    return (
        <main className="min-h-screen bg-background">
            {/* Header Section */}
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border transition-colors">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        <span className="text-accent">Resources</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        A curated library of financial models, research reports, and educational materials from Niveshak.
                    </p>
                </div>
            </section>

            {/* Resources Grid */}
            <div className="max-w-7xl mx-auto">
                <ResourcesSection
                    resources={resources}
                    showTitle={false}
                    bgColor="bg-transparent"
                />
            </div>

            <Footer />
        </main>
    );
}
