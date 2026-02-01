"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bell } from "lucide-react";
import Link from "next/link";
import { dataService, Notice } from "@/services/dataService";
import NoticeCard from "../NoticeCard";

export default function NoticesSection() {
    const [notices, setNotices] = useState<Notice[]>([]);

    useEffect(() => {
        dataService.getNotices().then(data => {
            // Take top 4 latest
            setNotices(data.slice(0, 4));
        });
    }, []);

    if (notices.length === 0) {
        // Show placeholder for now so section is visible
        return (
            <section className="py-20 relative overflow-hidden bg-muted/20 border-t border-border/50">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-foreground mb-4">Notice Board</h2>
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
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                        Notice <span className="text-accent">Board</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Stay updated with the latest announcements, events, and opportunities from Niveshak.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6">
                    {notices.map((notice, idx) => (
                        <div key={notice.id} className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] min-w-[280px]">
                            <NoticeCard notice={notice} idx={idx} />
                        </div>
                    ))}
                </div>

                {/* View All Button */}
                <div className="mt-12 text-center">
                    <Link href="/notices" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-accent text-white font-semibold hover:bg-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        View All Notices <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            {/* Background Decorations */}
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 -ml-32 pointer-events-none" />
        </section>
    );
}
