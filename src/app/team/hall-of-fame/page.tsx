"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Linkedin, Mail, Copy, Check, Award, Search, Filter, ArrowUpAZ, ArrowDownZA, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { dataService, HallOfFameMember } from "@/services/dataService";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function HallOfFamePage() {
    const [members, setMembers] = useState<HallOfFameMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter/Sort/Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBatch, setSelectedBatch] = useState<string>("all");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // A-Z default

    useEffect(() => {
        dataService.getHallOfFame().then(data => {
            setMembers(data);
            setLoading(false);
        });
    }, []);

    // Get unique batches for filter dropdown
    const allBatches = useMemo(() => {
        const batches = [...new Set(members.map(m => m.batch || "Unknown"))];
        return batches.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numB - numA; // Latest first
        });
    }, [members]);

    // Filter and sort members
    const filteredMembers = useMemo(() => {
        let result = [...members];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m =>
                m.name.toLowerCase().includes(query) ||
                (m.role?.toLowerCase().includes(query)) ||
                m.batch.toLowerCase().includes(query)
            );
        }

        // Batch filter
        if (selectedBatch !== "all") {
            result = result.filter(m => m.batch === selectedBatch);
        }

        return result;
    }, [members, searchQuery, selectedBatch]);

    // Group by batch and sort within each batch
    const groupedByBatch = useMemo(() => {
        const grouped = filteredMembers.reduce((acc, m) => {
            const batch = m.batch || "Unknown";
            if (!acc[batch]) acc[batch] = [];
            acc[batch].push(m);
            return acc;
        }, {} as Record<string, HallOfFameMember[]>);

        // Sort members within each batch by name
        Object.keys(grouped).forEach(batch => {
            grouped[batch].sort((a, b) => {
                const comparison = a.name.localeCompare(b.name);
                return sortOrder === "asc" ? comparison : -comparison;
            });
        });

        return grouped;
    }, [filteredMembers, sortOrder]);

    // Sort batches descending (latest first)
    const sortedBatches = useMemo(() => {
        return Object.keys(groupedByBatch).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numB - numA;
        });
    }, [groupedByBatch]);

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedBatch("all");
        setSortOrder("asc");
    };

    const hasActiveFilters = searchQuery || selectedBatch !== "all" || sortOrder !== "asc";

    return (
        <main className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <section className="pt-32 pb-8 px-4 bg-background border-b border-border transition-colors">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Hall of <span className="text-accent">Fame</span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-6">Alumni who shaped Niveshak&apos;s legacy</p>
                    <Link
                        href="/team"
                        className="inline-flex items-center gap-2 text-accent hover:underline"
                    >
                        ← Back to Current Team
                    </Link>
                </div>
            </section>

            {/* Search, Filter, Sort Controls */}
            <section className="py-6 px-4 bg-muted/30 border-b border-border sticky top-16 z-30 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                        {/* Search */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search name, batch..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-accent outline-none text-foreground placeholder:text-muted-foreground text-sm"
                            />
                        </div>

                        {/* Batch Filter */}
                        <div className="relative w-full sm:w-48">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-accent outline-none text-foreground text-sm appearance-none cursor-pointer"
                            >
                                <option value="all">All Batches</option>
                                {allBatches.map(batch => (
                                    <option key={batch} value={batch}>{batch}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Toggle */}
                        <button
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${sortOrder === "asc"
                                ? "bg-background border-border text-foreground hover:bg-muted"
                                : "bg-accent text-white border-accent hover:bg-accent/90"
                                }`}
                        >
                            {sortOrder === "asc" ? (
                                <><ArrowUpAZ className="w-4 h-4" /> A → Z</>
                            ) : (
                                <><ArrowDownZA className="w-4 h-4" /> Z → A</>
                            )}
                        </button>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 px-3 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" /> Clear
                            </button>
                        )}
                    </div>

                    {/* Results count */}
                    <div className="text-center mt-3 text-sm text-muted-foreground">
                        Showing <span className="font-medium text-foreground">{filteredMembers.length}</span> of {members.length} alumni
                        {selectedBatch !== "all" && <span> in <span className="text-accent">{selectedBatch}</span></span>}
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="py-16 px-4 bg-background transition-colors">
                <div className="max-w-[1400px] mx-auto space-y-16">
                    {loading && (
                        <div className="text-center py-12 text-muted-foreground">
                            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                            Loading alumni...
                        </div>
                    )}

                    {!loading && filteredMembers.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="text-xl">
                                {members.length === 0
                                    ? "No alumni in the Hall of Fame yet."
                                    : "No results found for your search."}
                            </p>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="mt-4 text-accent hover:underline">
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && sortedBatches.map(batch => (
                        <div key={batch} className="space-y-10">
                            <div className="text-center">
                                <h3 className="text-2xl lg:text-3xl font-bold text-foreground relative inline-block">
                                    Batch <span className="text-accent">{batch}</span>
                                    <div className="h-1 w-24 bg-accent/20 mx-auto mt-2 rounded-full"></div>
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 justify-center">
                                {groupedByBatch[batch].map((member, idx) => (
                                    <AlumniCard key={member.id} member={member} idx={idx} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            <Footer />
        </main>
    );
}

function AlumniCard({ member, idx }: { member: HallOfFameMember; idx: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            className="group relative bg-card rounded-xl overflow-visible shadow-sm border border-border/50 hover:shadow-md hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col items-center aspect-[4/5]"
        >
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden mb-6 border-2 border-muted group-hover:border-accent transition-colors shrink-0 shadow-sm">
                    <img
                        src={member.imageUrl || "/avatar_placeholder.png"}
                        alt={member.name}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="h-11 w-full flex items-center justify-center mb-1">
                    <h3 className="text-base font-bold text-card-foreground text-center break-words leading-tight line-clamp-2">
                        {member.name}
                    </h3>
                </div>
                <p className="text-xs text-accent font-medium text-center uppercase tracking-wide mb-1">
                    {member.role || member.batch}
                </p>
            </div>

            <div className="flex items-center gap-3 mt-auto relative z-10 pt-2">
                {member.linkedin && <SocialIcon type="linkedin" value={member.linkedin} />}
                {member.email && <SocialIcon type="email" value={member.email} />}
            </div>

            {/* Subtle Gradient Glow on Hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </motion.div>
    );
}

function SocialIcon({ type, value }: { type: "linkedin" | "email"; value: string }) {
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const icon = type === "linkedin" ? <Linkedin className="w-5 h-5" /> : <Mail className="w-5 h-5" />;
    const displayValue = type === "email" ? value : "LinkedIn Profile";
    const linkHref = type === "email" ? `mailto:${value}` : value;

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <a
                href={linkHref}
                target={type === "linkedin" ? "_blank" : undefined}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-white transition-all shadow-sm transform hover:scale-110 active:scale-95 border border-transparent hover:border-white/10"
            >
                {icon}
            </a>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute top-full mt-3 left-1/2 -translate-x-1/2 z-50 w-auto"
                    >
                        <div className="bg-zinc-900 text-white text-xs font-medium rounded-lg shadow-xl px-3 py-2 flex items-center gap-3 whitespace-nowrap min-w-[max-content] border border-zinc-800">
                            <span className="max-w-[180px] truncate">{displayValue}</span>
                            <button
                                onClick={handleCopy}
                                className="p-1 hover:bg-white/20 rounded-md transition-colors flex-shrink-0"
                                title="Copy"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-4 border-transparent border-b-zinc-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
