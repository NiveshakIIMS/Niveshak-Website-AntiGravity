"use client";

import { motion } from "framer-motion";
import { TrendingUp, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { dataService, NAVData, NIFMetrics } from "@/services/dataService";

export default function NAVSection() {
    const [latestNAV, setLatestNAV] = useState<NAVData | null>(null);
    const [metrics, setMetrics] = useState<NIFMetrics | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const navData = await dataService.getNAVData();
            if (navData && navData.length > 0) {
                // Sort by date descending and pick the first
                const sorted = [...navData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setLatestNAV(sorted[0]);
            }
            const metricsData = await dataService.getNIFMetrics();
            setMetrics(metricsData);
        };
        loadData();
    }, []);

    if (!latestNAV) return null;

    return (
        <section id="nav" className="py-20 bg-background">
            <div className="max-w-4xl mx-auto px-4">

                {/* Section Header */}
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl lg:text-4xl font-bold text-center mb-12 text-foreground"
                >
                    NIF <span className="text-accent">NAV</span>
                </motion.h2>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5, boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.2)" }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="relative max-w-sm mx-auto aspect-square flex flex-col items-center justify-center rounded-[30px] bg-card border border-border shadow-2xl cursor-default"
                >
                    <div className="w-full h-full rounded-[29px] p-8 flex flex-col items-center justify-center gap-6 relative z-10">

                        {/* 1. Label */}
                        <div className="text-center space-y-2">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full inline-flex mb-2">
                                <TrendingUp className="w-8 h-8 text-accent" />
                            </div>
                            <h3 className="text-xl font-bold text-muted-foreground uppercase tracking-widest">
                                Current NAV
                            </h3>
                        </div>

                        {/* 2. Amount */}
                        <div className="text-5xl md:text-6xl font-mono font-bold text-foreground tracking-tighter">
                            ₹ {latestNAV.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Decorative Line */}
                        <div className="w-12 h-1 bg-border rounded-full" />

                        {/* 3 & 4. Date & Return */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                <Calendar className="w-4 h-4" />
                                {new Date(latestNAV.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>

                            <div className="flex items-center gap-2 text-sm mt-1">
                                <span className="text-muted-foreground opacity-80">Annualized Return:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {metrics?.annualizedReturn || "0.0"}%
                                </span>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </section>
    );
}
