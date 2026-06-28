"use client";

import { motion } from "framer-motion";
import { BookOpen, FileText, ArrowRight, ArrowDownUp, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { dataService, Magazine } from "@/services/dataService";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import MagazineReader from "../MagazineReader";

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
    const [selectedReaderMag, setSelectedReaderMag] = useState<Magazine | null>(null);

    // Initialize years from initial data
    const [years, setYears] = useState<string[]>(() => {
        return Array.from(new Set(initialMagazines.map(m => m.issueYear).filter(Boolean))).sort().reverse() as string[];
    });

    const [selectedYear, setSelectedYear] = useState<string>("All");
    const [selectedMonth, setSelectedMonth] = useState<string>("All");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [isLoading, setIsLoading] = useState(initialMagazines.length === 0);

    // Helper to get sortable string (YYYY-MM)
    const getSortKey = useCallback((m: Magazine) => {
        if (m.issueDate) return m.issueDate;
        const monthIdx = months.indexOf(m.issueMonth || "");
        const mStr = monthIdx > -1 ? String(monthIdx + 1).padStart(2, '0') : "00";
        return `${m.issueYear || "0000"}-${mStr}`;
    }, []);

    useEffect(() => {
        if (initialMagazines.length > 0) {
            setMagazines(initialMagazines);
            const distinctYears = Array.from(new Set(initialMagazines.map(m => m.issueYear).filter(Boolean))).sort().reverse();
            setYears(distinctYears as string[]);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        const fetchFreshMagazines = () => {
            dataService.getMagazines()
                .then((loadedMagazines) => {
                    if (loadedMagazines) {
                        setMagazines(loadedMagazines);
                        const distinctYears = Array.from(new Set(loadedMagazines.map(m => m.issueYear).filter(Boolean))).sort().reverse();
                        setYears(distinctYears as string[]);
                    }
                })
                .catch(err => console.error("Error fetching magazines in background:", err))
                .finally(() => setIsLoading(false));
        };

        fetchFreshMagazines();

        const channel = supabase
            .channel("realtime-magazines")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "magazines" },
                () => {
                    fetchFreshMagazines();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [initialMagazines]);

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

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredMagazines.map((mag, index) => (
                                <MagazineCard key={mag.id} mag={mag} index={index} onOpenReader={setSelectedReaderMag} />
                            ))}
                        </div>

                        {filteredMagazines.length === 0 && (
                            <div className="text-center py-20 text-muted-foreground">
                                <p className="text-xl">No magazines found for this filter.</p>
                                <button onClick={() => { setSelectedYear("All"); setSelectedMonth("All") }} className="mt-4 text-accent hover:underline">Reset Filters</button>
                            </div>
                        )}
                    </>
                )}

                {showViewAll && (
                    <div className="mt-12 text-center">
                        <a href="/magazines" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-accent text-white font-semibold hover:bg-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            View All Magazines <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                )}
                {selectedReaderMag && (
                    <MagazineReader magazine={selectedReaderMag} onClose={() => setSelectedReaderMag(null)} />
                )}
            </div>
        </section>
    );
}

function MagazineCard({ mag, index = 0, onOpenReader }: { mag: Magazine; index?: number; onOpenReader: (mag: Magazine) => void }) {
    // Priority load first 4 images, lazy load rest
    const isPriority = index < 4;

    return (
        <div
            className="group relative flex flex-col h-full bg-card rounded-xl border border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
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
                    unoptimized={true}
                />
            </div>

            {/* Info & Actions */}
            <div className="p-5 flex flex-col flex-1 border-t border-border bg-card relative z-10">
                <div className="mb-4 text-center">
                    <h3 className="text-lg font-bold text-foreground leading-tight mb-1 line-clamp-2 group-hover:text-accent transition-colors">{mag.title}</h3>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{mag.issueMonth} {mag.issueYear}</p>
                </div>

                <div className="mt-auto flex gap-2 w-full pt-2">
                    {mag.pdfUrl && (
                        <>
                            <button
                                onClick={() => onOpenReader(mag)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 dark:bg-accent text-white font-bold text-sm shadow-md hover:bg-orange-700 dark:hover:bg-blue-600 active:scale-95 transition-all"
                            >
                                <BookOpen className="w-4 h-4" />
                                Read
                            </button>
                            <a
                                href={mag.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground border border-border font-bold text-sm hover:bg-muted/80 hover:text-foreground active:scale-95 transition-all"
                            >
                                <FileText className="w-4 h-4" />
                                PDF
                            </a>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
