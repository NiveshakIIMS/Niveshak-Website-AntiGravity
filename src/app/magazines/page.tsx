import Footer from "@/components/Footer";
import MagazinesSection from "@/components/sections/MagazinesSection";
import { dataService } from "@/services/dataService";

export const dynamic = 'force-dynamic'; // Prevent stale cache from hiding new entries
export const runtime = 'edge'; // Required for Cloudflare Pages when using dynamic routes

export default async function Magazines() {
    const magazines = await dataService.getMagazines();

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

            <div className="max-w-7xl mx-auto">
                <MagazinesSection showTitle={false} showFilters={true} showViewAll={false} bgColor="bg-transparent" initialMagazines={magazines} />
            </div>
            <Footer />
        </main>
    );
}
