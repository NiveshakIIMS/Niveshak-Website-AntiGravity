"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import { dataService, Notice } from "@/services/dataService";
import NoticeCard from "../NoticeCard";
import { supabase } from "@/lib/supabaseClient";

interface NoticesSectionProps {
    initialNotices?: Notice[];
}

export default function NoticesSection({ initialNotices = [] }: NoticesSectionProps) {
    const [notices, setNotices] = useState<Notice[]>(() => {
        if (initialNotices.length === 0) return [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return initialNotices.filter(n => {
            const checkDate = n.expiryDate ? new Date(n.expiryDate) : new Date(n.date);
            return checkDate >= now;
        }).slice(0, 4);
    });
    const [isLoading, setIsLoading] = useState(initialNotices.length === 0);

    useEffect(() => {
        if (initialNotices.length > 0) {
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        const loadNotices = () => {
            dataService.getNotices().then(data => {
                if (data && data.length > 0) {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    const activeNotices = data.filter(n => {
                        const checkDate = n.expiryDate ? new Date(n.expiryDate) : new Date(n.date);
                        return checkDate >= now;
                    });

                    setNotices(activeNotices.slice(0, 4));
                }
            }).catch(err => console.error("Error fetching notices in background:", err))
              .finally(() => setIsLoading(false));
        };

        loadNotices();

        const channel = supabase
            .channel("realtime-notices-section")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "notices" },
                () => {
                    loadNotices();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [initialNotices]);

    if (isLoading) {
        return (
            <section className="py-20 relative overflow-hidden bg-muted/20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-foreground mb-4">Notice <span className="text-accent">Board</span></h2>
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                </div>
            </section>
        );
    }

    if (notices.length === 0) {
        // Show placeholder for now so section is visible
        return (
            <section className="py-20 relative overflow-hidden bg-muted/20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-foreground mb-4">Notice <span className="text-accent">Board</span></h2>
                    <p className="text-muted-foreground">No new notices at the moment. Check back later!</p>
                    <div className="mt-6">
                        <Link href="/notices">
                            <button className="px-6 py-2 rounded-full border border-border hover:bg-muted font-medium transition-all">
                                View Archive
                            </button>
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                        Notice <span className="text-accent">Board</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Stay updated with the latest announcements, events, and opportunities from Niveshak.
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                    className={notices.length < 3
                        ? "flex flex-wrap justify-center gap-6"
                        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"}
                >
                    {notices.map((notice, idx) => (
                        <div key={notice.id} className={notices.length < 3 ? "w-full max-w-sm min-w-[280px]" : "w-full"}>
                            <NoticeCard notice={notice} idx={idx} />
                        </div>
                    ))}
                </motion.div>

                {/* View All Button */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="mt-12 text-center"
                >
                    <Link href="/notices" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-accent text-white font-semibold hover:bg-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        View All Notices <ArrowRight className="w-5 h-5" />
                    </Link>
                </motion.div>
            </div>

            {/* Background Decorations */}
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 -ml-32 pointer-events-none" />
        </section>
    );
}
