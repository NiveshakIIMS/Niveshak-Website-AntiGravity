"use client";

import { motion } from "framer-motion";
import { BookOpen, FileText, ArrowRight, ArrowDownUp } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { dataService, Magazine } from "@/services/dataService";
import Image from "next/image";

interface MagazinesSectionProps {
    limit?: number;
    showFilters?: boolean;
    showViewAll?: boolean;
    showTitle?: boolean;
    bgColor?: string;
    initialMagazines?: Magazine[];
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function MagazinesSection({
    limit = 0,
    showFilters = true,
    showViewAll = false,
    showTitle = true,
    bgColor = "bg-background",
    initialMagazines = []
}: MagazinesSectionProps) {
    const [magazines, setMagazines] = useState<Magazine[]>(initialMagazines);

    // Initialize years from initial data
    const [years, setYears] = useState<string[]>(() => {
        return Array.from(new Set(initialMagazines.map(m => m.issueYear).filter(Boolean))).sort().reverse() as string[];
    });

    const [selectedYear, setSelectedYear] = useState<string>("All");
    const [selectedMonth, setSelectedMonth] = useState<string>("All");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

    // Helper to get sortable string (YYYY-MM)
    const getSortKey = useCallback((m: Magazine) => {
        if (m.issueDate) return m.issueDate;
        const monthIdx = months.indexOf(m.issueMonth || "");
        const mStr = monthIdx > -1 ? String(monthIdx + 1).padStart(2, '0') : "00";
        return `${m.issueYear || "0000"}-${mStr}`;
    }, []);

    useEffect(() => {
        // Only fetch if no initial data provided or force refresh needs to be handled (omitted for speed)
        if (initialMagazines.length === 0) {
            dataService.getMagazines().then((loadedMagazines) => {
                setMagazines(loadedMagazines);
                const distinctYears = Array.from(new Set(loadedMagazines.map(m => m.issueYear).filter(Boolean))).sort().reverse();
                setYears(distinctYears);
            });
        }
    }, [initialMagazines.length]);

    // Derived State (useMemo)
    const filteredMagazines = useMemo(() => {
        let result = [...magazines];

        // 1. Filter
        if (selectedYear !== "All") {
            result = result.filter(m => m.issueYear === selectedYear);
        }
        if (selectedMonth !== "All") {
            result = result.filter(m => m.issueMonth === selectedMonth);
        }

        // 2. Sort
        result.sort((a, b) => {
            const dateA = getSortKey(a);
            const dateB = getSortKey(b);
            return sortOrder === "newest"
                ? dateB.localeCompare(dateA)
                : dateA.localeCompare(dateB);
        });

        // 3. Limit (Only if limit > 0)
        if (limit > 0) {
            result = result.slice(0, limit);
        }

        return result;
    }, [magazines, selectedYear, selectedMonth, sortOrder, limit, getSortKey]);

    return (
        <section id="magazines" className={`py-20 px-4 ${bgColor} transition-colors`}>
            <div className="max-w-6xl mx-auto">
                {showTitle && (
                    <div className="text-center mb-10">
                        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                            Our <span className="text-accent">Magazines</span>
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Insights into the financial world, curated by students for students.</p>
                    </div>
                )}

                {/* Filters */}
                {showFilters && (
                    <div className="flex flex-wrap justify-center items-center gap-4 mb-10">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:border-accent focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm"
                        >
                            <option value="All">All Years</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:border-accent focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm"
                        >
                            <option value="All">All Months</option>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>

                        <button
                            onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:border-accent hover:text-accent transition-all shadow-sm"
                        >
                            <ArrowDownUp className="w-4 h-4" />
                            {sortOrder === "newest" ? "Newest First" : "Oldest First"}
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredMagazines.map((mag, index) => (
                        <MagazineCard key={mag.id} mag={mag} index={index} />
                    ))}
                </div>

                {filteredMagazines.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                        <p className="text-xl">No magazines found for this filter.</p>
                        <button onClick={() => { setSelectedYear("All"); setSelectedMonth("All") }} className="mt-4 text-accent hover:underline">Reset Filters</button>
                    </div>
                )}

                {showViewAll && (
                    <div className="mt-12 text-center">
                        <a href="/magazines" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-accent text-white font-semibold hover:bg-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            View All Magazines <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
}

function MagazineCard({ mag, index = 0 }: { mag: Magazine; index?: number }) {
    const [isMobileActive, setIsMobileActive] = useState(false);

    // Priority load first 4 images, lazy load rest
    const isPriority = index < 4;

    return (
        <div
            className="group relative flex flex-col h-full bg-card rounded-xl border border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            onMouseLeave={() => setIsMobileActive(false)}
        >
            {/* Magazine Cover */}
            <div className="relative w-full aspect-[1/1.4] bg-muted overflow-hidden">
                <Image
                    src={mag.coverUrl || "/magazine_cover.png"}
                    alt={mag.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority={isPriority}
                    loading={isPriority ? undefined : "lazy"}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
            </div>

            {/* Info & Actions */}
            <div className="p-5 flex flex-col flex-1 border-t border-border bg-card relative z-10">
                <div className="mb-4 text-center">
                    <h3 className="text-lg font-bold text-foreground leading-tight mb-1 line-clamp-2 group-hover:text-accent transition-colors">{mag.title}</h3>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{mag.issueMonth} {mag.issueYear}</p>
                </div>

                <div className="mt-auto relative h-12 w-full">
                    {/* Default State: Read Issue Button */}
                    <div
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isMobileActive ? 'opacity-0 pointer-events-none' : 'opacity-100 group-hover:opacity-0 group-hover:pointer-events-none'}`}
                    >
                        <button
                            onClick={() => setIsMobileActive(true)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-navy-900 dark:bg-accent text-white font-semibold text-sm shadow-md"
                        >
                            <BookOpen className="w-4 h-4" /> Read Issue
                        </button>
                    </div>

                    {/* Hover/Active State: Expanded Options */}
                    <div
                        className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300 ${isMobileActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}
                    >
                        {mag.flipUrl && (
                            <a href={mag.flipUrl} target="_blank" className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg bg-orange-600 text-white text-xs font-bold shadow-sm hover:bg-orange-700 transition-colors" title="Read as Flipbook">
                                <BookOpen className="w-4 h-4" /> Flipbook
                            </a>
                        )}
                        {mag.pdfUrl && (
                            <a href={mag.pdfUrl} target="_blank" className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg bg-gray-800 text-white text-xs font-bold shadow-sm hover:bg-gray-900 transition-colors" title="View PDF">
                                <FileText className="w-4 h-4" /> PDF
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
