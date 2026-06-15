import Footer from "@/components/Footer";
import AboutClient from "@/components/AboutClient";
import { dataService } from "@/services/dataService";

export default async function About() {
    const data = await dataService.getAbout();

    const defaultAboutData = {
        title: "About Niveshak",
        description: "The Finance and Investment Club of IIM Shillong...",
        cards: [
            { title: "Target", description: "Promoting financial literacy..." },
            { title: "Team", description: "Minds behind the club..." },
            { title: "Book", description: "Publications..." }
        ],
        slides: []
    };

    return (
        <main className="min-h-screen bg-background">
            <AboutClient data={data || defaultAboutData} />
            <Footer />
        </main>
    );
}
