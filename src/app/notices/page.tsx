"use client";

import { useState, useEffect } from "react";
import { dataService, Notice } from "@/services/dataService";
import NoticeCard from "@/components/NoticeCard";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Footer from "@/components/Footer";

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [filter, setFilter] = useState("All");
    const [year, setYear] = useState("All");
    const [month, setMonth] = useState("All");

    useEffect(() => {
        dataService.getNotices().then(setNotices);
    }, []);

    // Extract years
    const years = Array.from(new Set(notices.map(n => new Date(n.date).getFullYear()))).sort((a, b) => b - a);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const filteredNotices = notices.filter(n => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Compare dates without time

        // Logic: Use expiry date if available, otherwise use the notice date itself
        const checkDate = n.expiryDate ? new Date(n.expiryDate) : new Date(n.date);
        const isExpired = checkDate < now;

        // Date Filter (Based on Posted Date 'n.date')
        const noticeDate = new Date(n.date);
        const matchesYear = year === "All" || noticeDate.getFullYear().toString() === year;
        const matchesMonth = month === "All" || noticeDate.getMonth() === parseInt(month);

        if (!matchesYear || !matchesMonth) return false;

        if (filter === "History") {
            return isExpired;
        }

        // For other filters, show only Active (Non-expired) notices
        if (isExpired) return false;

        if (filter === "All") return true;
        return n.category === filter;
    });

    const categories = ["All", "General", "Promotion", "Reminder", "Urgent", "History"];

    return (
        <main className="min-h-screen bg-background flex flex-col">
            {/* Standard Page Header */}
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border transition-colors">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold text-foreground mb-4"
                    >
                        Notice <span className="text-accent">Board</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        Keep up with the latest updates, opportunities, and announcements from the club.
                    </motion.p>
                </div>
            </section>

            <div className="flex-1 py-12 px-4">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row justify-center items-center gap-6">
                        {/* Filters */}
                        <div className="flex flex-wrap justify-center gap-3">
                            {categories.map((cat, idx) => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={`px-5 py-2.5 rounded-full font-bold transition-all ${filter === cat
                                        ? "bg-accent text-white shadow-lg shadow-blue-500/25 scale-105"
                                        : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Date Filters */}
                        <div className="flex gap-3">
                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-accent outline-none"
                            >
                                <option value="All">Year: All</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>

                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-accent outline-none"
                            >
                                <option value="All">Month: All</option>
                                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredNotices.length > 0 ? (
                            filteredNotices.map((notice, idx) => (
                                <NoticeCard key={notice.id} notice={notice} idx={idx} />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 text-muted-foreground">
                                <p className="text-xl">No notices found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
