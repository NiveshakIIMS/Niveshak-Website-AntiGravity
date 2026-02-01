import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AboutClient from "@/components/AboutClient";
import { dataService } from "@/services/dataService";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function About() {
    const data = await dataService.getAbout();

    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <AboutClient data={data} />
            <Footer />
        </main>
    );
}
