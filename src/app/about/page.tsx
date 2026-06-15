import Footer from "@/components/Footer";
import AboutClient from "@/components/AboutClient";
import { dataService } from "@/services/dataService";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function About() {
    const data = await dataService.getAbout();

    return (
        <main className="min-h-screen bg-background">
            <AboutClient data={data} />
            <Footer />
        </main>
    );
}
