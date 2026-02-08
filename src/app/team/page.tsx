"use client";

import Footer from "@/components/Footer";
import TeamSection from "@/components/sections/TeamSection";
import Link from "next/link";
import { Award } from "lucide-react";

export default function Team() {
    return (
        <main className="min-h-screen bg-background text-foreground">
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

            {/* Hall of Fame Button */}
            <section className="py-16 px-4 bg-background border-t border-border">
                <div className="max-w-7xl mx-auto text-center">
                    <Link
                        href="/team/hall-of-fame"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg rounded-xl hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/30 hover:shadow-amber-600/40 hover:-translate-y-1 transition-all duration-300"
                    >
                        <Award className="w-6 h-6" />
                        Hall of Fame
                    </Link>
                    <p className="text-muted-foreground mt-4">Explore our alumni from previous batches</p>
                </div>
            </section>

            <Footer />
        </main>
    );
}

