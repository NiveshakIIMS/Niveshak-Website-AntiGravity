"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TeamSection from "@/components/sections/TeamSection";

export default function Team() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <Navbar />
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border transition-colors">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Meet the <span className="text-accent">Team</span>
                    </h1>
                    <p className="text-xl text-muted-foreground">The minds behind Niveshak</p>
                </div>
            </section>

            <section>
                <TeamSection showTitle={false} />
            </section>
            <Footer />
        </main>
    );
}
