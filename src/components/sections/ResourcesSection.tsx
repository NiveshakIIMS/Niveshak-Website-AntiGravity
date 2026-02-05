"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Resource } from "@/services/dataService";
import { FileText, Link as LinkIcon, Download, ExternalLink, Calendar, Folder, Search, Grid, List } from "lucide-react";

interface ResourcesSectionProps {
    resources: Resource[];
    showTitle?: boolean;
    limit?: number;
    bgColor?: string;
}

export default function ResourcesSection({ resources: initialResources, showTitle = true, limit, bgColor = "bg-muted/30" }: ResourcesSectionProps) {
    // State
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [sortBy, setSortBy] = useState<"date" | "name">("date");
    const [searchQuery, setSearchQuery] = useState("");

    // Filter Logic
    const isHomepage = !!limit;

    const filteredResources = useMemo(() => {
        if (isHomepage) {
            // Flatten and just take top X recent files/links
            return initialResources
                .filter(r => r.type !== 'folder')
                .slice(0, limit);
        }

        // Folder Mode
        let items = initialResources.filter(r => {
            // Match parent
            const matchesParent = (r.parentId || null) === currentFolderId;
            // Search override: If searching, search EVERYTHING (flat)
            if (searchQuery) {
                return r.title.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return matchesParent;
        });

        // Sort
        items.sort((a, b) => {
            // Always folders first
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;

            if (sortBy === 'date') {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            } else {
                return a.title.localeCompare(b.title);
            }
        });

        return items;
    }, [initialResources, currentFolderId, limit, isHomepage, sortBy, searchQuery]);

    // Breadcrumbs Logic
    const breadcrumbs = useMemo(() => {
        if (isHomepage || !currentFolderId) return [];
        const crumbs: { id: string; title: string }[] = [];
        let curr: string | null = currentFolderId;

        let depth = 0;
        // Limit depth to prevent potential infinite loops
        while (curr && depth < 20) {
            const folder = initialResources.find(r => r.id === curr);
            if (folder) {
                crumbs.unshift({ id: folder.id, title: folder.title });
                curr = folder.parentId || null;
                depth++;
            } else {
                break;
            }
        }
        return crumbs;
    }, [currentFolderId, initialResources, isHomepage]);

    if (!initialResources.length) {
        return (
            <section className={`py-20 px-4 ${bgColor}`}>
                <div className="max-w-7xl mx-auto text-center">
                    {showTitle && <h2 className="text-3xl font-bold mb-12">Resources</h2>}
                    <div className="p-12 border-2 border-dashed border-muted rounded-3xl bg-card/50">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-bold">No Resources Found</h3>
                        <p className="text-muted-foreground mt-2">Check back later for updates.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={`py-20 px-4 ${bgColor} transition-colors duration-300`}>
            <div className="max-w-7xl mx-auto space-y-8">
                {showTitle && (
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 inline-block">
                            Resources
                        </h2>
                        {!isHomepage && <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Browse our collection of documents, links, and folders.</p>}
                    </div>
                )}

                {/* Toolbar (Only for Full Page) */}
                {!isHomepage && (
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
                        {/* Breadcrumbs / Search */}
                        <div className="flex items-center gap-4 flex-1 w-full md:w-auto overflow-x-auto">
                            {searchQuery ? (
                                <button onClick={() => setSearchQuery("")} className="flex items-center gap-2 text-blue-600 font-bold">
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">Clear Search</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <button
                                        onClick={() => setCurrentFolderId(null)}
                                        className={`hover:text-blue-500 font-medium ${currentFolderId === null ? 'font-bold' : ''}`}
                                    >
                                        Home
                                    </button>
                                    {breadcrumbs.map((crumb) => (
                                        <div key={crumb.id} className="flex items-center gap-2">
                                            <span className="text-muted-foreground">/</span>
                                            <button
                                                onClick={() => setCurrentFolderId(crumb.id)}
                                                className="hover:text-blue-500 font-medium"
                                            >
                                                {crumb.title}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-2 items-center flex-shrink-0">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 text-sm bg-muted rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-40 md:w-60"
                                />
                            </div>
                            <div className="h-6 w-px bg-border mx-2" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            >
                                <option value="date">Newest First</option>
                                <option value="name">A-Z</option>
                            </select>
                            <div className="bg-muted rounded-lg p-1 flex gap-1">
                                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
                    <AnimatePresence mode="popLayout">
                        {filteredResources.map((resource) => (
                            <motion.div
                                key={resource.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={
                                    viewMode === 'grid'
                                        ? `group bg-card border rounded-2xl overflow-hidden hover:shadow-lg transition-all ${resource.type === 'folder' ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10' : 'border-border'}`
                                        : `group flex items-center gap-4 p-4 bg-card border rounded-xl hover:shadow-md transition-all ${resource.type === 'folder' ? 'border-blue-200 bg-blue-50/30' : 'border-border'}`
                                }
                                onClick={() => !isHomepage && resource.type === 'folder' && setCurrentFolderId(resource.id)}
                            >
                                {/* Grid View */}
                                {viewMode === 'grid' ? (
                                    <>
                                        <div className="aspect-[2/1] bg-muted relative overflow-hidden">
                                            {resource.coverImage ? (
                                                <img src={resource.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {resource.type === 'folder' ? <Folder className="w-12 h-12 text-blue-500" /> :
                                                        resource.type === 'file' ? <FileText className="w-12 h-12 text-muted-foreground/50" /> : <LinkIcon className="w-12 h-12 text-muted-foreground/50" />}
                                                </div>
                                            )}

                                            {resource.type !== 'folder' && (
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <a
                                                        href={resource.url} target="_blank" rel="noreferrer"
                                                        className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-white/90"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {resource.type === 'file' ? 'Download' : 'Open Link'}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${resource.type === 'folder' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {resource.type}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{resource.date}</span>
                                            </div>
                                            <h3 className="font-bold text-lg mb-1 line-clamp-1">{resource.title}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{resource.description || "No description"}</p>
                                        </div>
                                    </>
                                ) : (
                                    /* List View */
                                    <>
                                        <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${resource.type === 'folder' ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                                            {resource.type === 'folder' ? <Folder className="w-6 h-6" /> : (resource.type === 'file' ? <FileText className="w-6 h-6" /> : <LinkIcon className="w-6 h-6" />)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-foreground truncate">{resource.title}</h3>
                                            <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
                                        </div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                                            {resource.date}
                                        </div>
                                        {resource.type !== 'folder' && (
                                            <a href={resource.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-muted rounded-full text-blue-600" onClick={e => e.stopPropagation()}>
                                                <ExternalLink className="w-5 h-5" />
                                            </a>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {filteredResources.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground">
                            No items found in this view.
                        </div>
                    )}
                </div>

                {(!isHomepage && !limit) && (
                    <div className="text-center text-sm text-muted-foreground pt-8">
                        Showing {filteredResources.length} item(s)
                    </div>
                )}
            </div>
        </section>
    );
}
