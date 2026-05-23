import Footer from "@/components/Footer";
import AboutClient from "@/components/AboutClient";

export const dynamic = 'force-static';

export default function About() {
    return (
        <main className="min-h-screen bg-background">
            <AboutClient />
            <Footer />
        </main>
    );
}
