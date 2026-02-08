"use client";

import { useState, useEffect } from "react";
import { dataService, RedemptionCard } from "@/services/dataService";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function RedemptionPage() {
    const [cards, setCards] = useState<RedemptionCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeemLink, setRedeemLink] = useState("");

    useEffect(() => {
        const load = async () => {
            const [cardsData, link] = await Promise.all([
                dataService.getRedemptionCards(),
                dataService.getRedemptionLink()
            ]);
            setCards(cardsData);
            setRedeemLink(link);
            setLoading(false);
        };
        load();
    }, []);

    return (
        <main className="min-h-screen bg-background text-foreground transition-colors">
            {/* Header Section */}
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        <span className="text-accent">Redemption</span> Guide
                    </h1>
                    <p className="text-xl text-muted-foreground mb-6">Everything you need to know about NIF redemptions</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-accent hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to NIF Dashboard
                    </Link>
                </div>
            </section>

            {/* Redeem Now Button */}
            {redeemLink && (
                <section className="px-4 pt-8 max-w-5xl mx-auto">
                    <div className="flex justify-center">
                        <a
                            href={redeemLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-white font-bold text-lg rounded-xl hover:bg-accent/90 shadow-lg shadow-accent/30 hover:shadow-accent/40 hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Redeem Now
                        </a>
                    </div>
                </section>
            )}

            {/* Content */}
            <section className="py-16 px-4 max-w-5xl mx-auto">
                {loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                        Loading redemption information...
                    </div>
                )}

                {!loading && cards.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-xl">No redemption information available yet.</p>
                    </div>
                )}

                {!loading && cards.length > 0 && (
                    <div className="space-y-8">
                        {cards.map((card, idx) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="bg-gradient-to-r from-accent/10 to-transparent p-5 border-b border-border">
                                    <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
                                            {idx + 1}
                                        </span>
                                        {card.title}
                                    </h2>
                                </div>
                                <div
                                    className="p-6 overflow-hidden break-words
                                        [&>*]:text-muted-foreground
                                        [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-foreground [&>h1]:mb-3
                                        [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:mb-3
                                        [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:mb-2
                                        [&>p]:mb-3 [&>p]:leading-relaxed [&>p]:whitespace-pre-wrap
                                        [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-3 [&>ul]:space-y-1
                                        [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-3 [&>ol]:space-y-1
                                        [&_li]:text-muted-foreground
                                        [&_a]:text-accent [&_a]:underline [&_a]:hover:opacity-80
                                        [&_strong]:text-foreground [&_strong]:font-semibold
                                        [&_.ql-size-small]:text-sm
                                        [&_.ql-size-large]:text-lg
                                        [&_.ql-size-huge]:text-xl
                                        [&_.ql-indent-1]:pl-8 [&_.ql-indent-2]:pl-16"
                                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                    dangerouslySetInnerHTML={{ __html: card.content }}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            <Footer />
        </main>
    );
}
