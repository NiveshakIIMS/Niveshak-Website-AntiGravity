"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TeamSection from "@/components/sections/TeamSection";

export default function Team() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <Navbar />
            <section className="pt-24">
                <TeamSection />
            </section>
            <Footer />
        </main>
    );
}
