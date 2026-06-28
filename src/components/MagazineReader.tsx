"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Magazine } from "@/services/dataService";
import { motion, AnimatePresence } from "framer-motion";

interface MagazineReaderProps {
    magazine: Magazine;
    onClose: () => void;
}

let pdfjsPromise: Promise<any> | null = null;

function loadPdfjs(): Promise<any> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);

    if (!pdfjsPromise) {
        pdfjsPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                const pdfjs = (window as any).pdfjsLib;
                pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(pdfjs);
            };
            script.onerror = (err) => reject(err);
            document.head.appendChild(script);
        });
    }
    return pdfjsPromise;
}

export default function MagazineReader({ magazine, onClose }: MagazineReaderProps) {
    const [pdf, setPdf] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1); 
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [scale, setScale] = useState<number>(1.0);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [direction, setDirection] = useState<"next" | "prev">("next");

    const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
    const canvasRightRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const renderTasksRef = useRef<{ left?: any; right?: any }>({});

    // 1. Detect Screen Size
    useEffect(() => {
        const checkSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkSize();
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);

    // 2. Load PDF document
    useEffect(() => {
        let active = true;
        const targetUrl = magazine.uploadedPdfUrl || magazine.pdfUrl;
        setIsLoading(true);
        loadPdfjs()
            .then(async (pdfjs) => {
                if (!pdfjs || !active) return;
                const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(targetUrl)}`;
                const loadedPdf = await pdfjs.getDocument(proxyUrl).promise;
                if (!active) return;
                setPdf(loadedPdf);
                setNumPages(loadedPdf.numPages);
                setCurrentPage(1);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error("PDF load error:", err);
                if (active) {
                    alert("Failed to load PDF reader. Opening direct link instead.");
                    window.open(targetUrl, "_blank");
                    onClose();
                }
            });

        return () => {
            active = false;
        };
    }, [magazine, onClose]);

    // 3. Render Pages when currentPage, scale, or layout changes
    useEffect(() => {
        if (!pdf) return;

        const renderPages = async () => {
            // Cancel previous render tasks if running
            if (renderTasksRef.current.left) {
                renderTasksRef.current.left.cancel();
            }
            if (renderTasksRef.current.right) {
                renderTasksRef.current.right.cancel();
            }

            const container = containerRef.current;
            if (!container) return;

            // Reserve height/width
            const availableHeight = window.innerHeight - 180;
            const availableWidth = container.clientWidth - 80;

            if (isMobile) {
                // Mobile layout: Single page centered
                const canvas = canvasLeftRef.current;
                if (!canvas) return;

                try {
                    const page = await pdf.getPage(currentPage);
                    const viewport = page.getViewport({ scale: 1.0 });

                    // Calculate fit scale
                    const scaleX = availableWidth / viewport.width;
                    const scaleY = availableHeight / viewport.height;
                    const fitScale = Math.min(scaleX, scaleY) * scale;

                    const finalViewport = page.getViewport({ scale: fitScale });
                    canvas.width = finalViewport.width;
                    canvas.height = finalViewport.height;

                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        const renderTask = page.render({ canvasContext: ctx, viewport: finalViewport });
                        renderTasksRef.current.left = renderTask;
                        await renderTask.promise;
                    }
                } catch (e: any) {
                    if (e.name !== "RenderingCancelledException") {
                        console.error(e);
                    }
                }
            } else {
                // Desktop Book layout
                const leftCanvas = canvasLeftRef.current;
                const rightCanvas = canvasRightRef.current;

                if (currentPage === 1) {
                    // Show Cover (Page 1) centered on the right side, left canvas is empty
                    if (leftCanvas) {
                        leftCanvas.width = 0;
                        leftCanvas.height = 0;
                    }

                    if (rightCanvas) {
                        try {
                            const page = await pdf.getPage(1);
                            const viewport = page.getViewport({ scale: 1.0 });

                            // Centered page takes max half available width
                            const scaleX = (availableWidth / 2) / viewport.width;
                            const scaleY = availableHeight / viewport.height;
                            const fitScale = Math.min(scaleX, scaleY) * scale;

                            const finalViewport = page.getViewport({ scale: fitScale });
                            rightCanvas.width = finalViewport.width;
                            rightCanvas.height = finalViewport.height;

                            const ctx = rightCanvas.getContext("2d");
                            if (ctx) {
                                ctx.clearRect(0, 0, rightCanvas.width, rightCanvas.height);
                                const renderTask = page.render({ canvasContext: ctx, viewport: finalViewport });
                                renderTasksRef.current.right = renderTask;
                                await renderTask.promise;
                            }
                        } catch (e: any) {
                            if (e.name !== "RenderingCancelledException") console.error(e);
                        }
                    }
                } else {
                    // Side-by-side pages: currentPage (Left) and currentPage + 1 (Right)
                    const leftPageNum = currentPage;
                    const rightPageNum = currentPage + 1;

                    // Render Left Page
                    if (leftCanvas && leftPageNum <= numPages) {
                        try {
                            const page = await pdf.getPage(leftPageNum);
                            const viewport = page.getViewport({ scale: 1.0 });

                            const scaleX = (availableWidth / 2) / viewport.width;
                            const scaleY = availableHeight / viewport.height;
                            const fitScale = Math.min(scaleX, scaleY) * scale;

                            const finalViewport = page.getViewport({ scale: fitScale });
                            leftCanvas.width = finalViewport.width;
                            leftCanvas.height = finalViewport.height;

                            const ctx = leftCanvas.getContext("2d");
                            if (ctx) {
                                ctx.clearRect(0, 0, leftCanvas.width, leftCanvas.height);
                                const renderTask = page.render({ canvasContext: ctx, viewport: finalViewport });
                                renderTasksRef.current.left = renderTask;
                                await renderTask.promise;
                            }
                        } catch (e: any) {
                            if (e.name !== "RenderingCancelledException") console.error(e);
                        }
                    }

                    // Render Right Page
                    if (rightCanvas) {
                        if (rightPageNum <= numPages) {
                            try {
                                const page = await pdf.getPage(rightPageNum);
                                const viewport = page.getViewport({ scale: 1.0 });

                                const scaleX = (availableWidth / 2) / viewport.width;
                                const scaleY = availableHeight / viewport.height;
                                const fitScale = Math.min(scaleX, scaleY) * scale;

                                const finalViewport = page.getViewport({ scale: fitScale });
                                rightCanvas.width = finalViewport.width;
                                rightCanvas.height = finalViewport.height;

                                const ctx = rightCanvas.getContext("2d");
                                if (ctx) {
                                    ctx.clearRect(0, 0, rightCanvas.width, rightCanvas.height);
                                    const renderTask = page.render({ canvasContext: ctx, viewport: finalViewport });
                                    renderTasksRef.current.right = renderTask;
                                    await renderTask.promise;
                                }
                            } catch (e: any) {
                                if (e.name !== "RenderingCancelledException") console.error(e);
                            }
                        } else {
                            // Clear right canvas if no page exists
                            rightCanvas.width = 0;
                            rightCanvas.height = 0;
                        }
                    }
                }
            }
        };

        renderPages();
    }, [pdf, currentPage, scale, isMobile, numPages]);

    // 4. Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") nextPage();
            if (e.key === "ArrowLeft") prevPage();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pdf, currentPage, isMobile, numPages]);

    const nextPage = () => {
        if (!pdf) return;
        setDirection("next");
        if (isMobile) {
            if (currentPage < numPages) setCurrentPage(currentPage + 1);
        } else {
            if (currentPage === 1) {
                if (numPages > 1) setCurrentPage(2);
            } else {
                if (currentPage + 2 <= numPages) {
                    setCurrentPage(currentPage + 2);
                }
            }
        }
    };

    const prevPage = () => {
        if (!pdf) return;
        setDirection("prev");
        if (isMobile) {
            if (currentPage > 1) setCurrentPage(currentPage - 1);
        } else {
            if (currentPage === 2) {
                setCurrentPage(1);
            } else if (currentPage > 2) {
                setCurrentPage(currentPage - 2);
            }
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    // Calculate current visible pages description
    const getPageRangeString = () => {
        if (isMobile) return `Page ${currentPage} of ${numPages}`;
        if (currentPage === 1) return `Cover (Page 1 of ${numPages})`;
        const next = currentPage + 1;
        return next <= numPages ? `Pages ${currentPage}-${next} of ${numPages}` : `Page ${currentPage} of ${numPages}`;
    };

    // 3D Hinge Turn Animation variants for Desktop Book Page Turn
    const leftPageVariants = {
        initial: (dir: "next" | "prev") => ({
            rotateY: dir === "prev" ? -90 : 0,
            z: dir === "prev" ? 10 : 0
        }),
        animate: {
            rotateY: 0,
            z: 0,
            transition: { duration: 0.6, ease: "easeOut" as const }
        },
        exit: (dir: "next" | "prev") => ({
            rotateY: dir === "next" ? -90 : 0,
            z: dir === "next" ? 10 : 0,
            transition: { duration: 0.6, ease: "easeIn" as const }
        })
    };

    const rightPageVariants = {
        initial: (dir: "next" | "prev") => ({
            rotateY: dir === "next" ? 90 : 0,
            z: dir === "next" ? 10 : 0
        }),
        animate: {
            rotateY: 0,
            z: 0,
            transition: { duration: 0.6, ease: "easeOut" as const }
        },
        exit: (dir: "next" | "prev") => ({
            rotateY: dir === "prev" ? 90 : 0,
            z: dir === "prev" ? 10 : 0,
            transition: { duration: 0.6, ease: "easeIn" as const }
        })
    };

    // 3D Card Flip Animation variants for Mobile Single Page
    const mobilePageVariants = {
        initial: (dir: "next" | "prev") => ({
            rotateY: dir === "next" ? 90 : -90,
            opacity: 0.8,
            scale: 0.95
        }),
        animate: {
            rotateY: 0,
            opacity: 1,
            scale: 1,
            transition: { duration: 0.55, ease: "easeOut" as const }
        },
        exit: (dir: "next" | "prev") => ({
            rotateY: dir === "next" ? -90 : 90,
            opacity: 0.8,
            scale: 0.95,
            transition: { duration: 0.55, ease: "easeIn" as const }
        })
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0f0f0f]/97 backdrop-blur-lg flex flex-col justify-between select-none">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-[#2b2b2b] text-white z-10 shadow-lg">
                <div className="flex flex-col">
                    <span className="font-bold text-sm sm:text-base line-clamp-1">{magazine.title}</span>
                    <span className="text-xs text-muted-foreground">{magazine.issueMonth} {magazine.issueYear}</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-3">
                    <button
                        onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
                        className="p-2 hover:bg-[#333] rounded-lg transition-colors border border-transparent hover:border-[#444]"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-5 h-5 text-gray-300" />
                    </button>
                    <span className="text-xs font-bold px-2 text-gray-300 w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
                        className="p-2 hover:bg-[#333] rounded-lg transition-colors border border-transparent hover:border-[#444]"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-5 h-5 text-gray-300" />
                    </button>

                    <div className="h-5 w-[1px] bg-[#2b2b2b] mx-1 sm:mx-2" />

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-[#333] rounded-lg transition-colors hidden sm:block border border-transparent hover:border-[#444]"
                        title="Fullscreen Toggle"
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-300" /> : <Maximize2 className="w-5 h-5 text-gray-300" />}
                    </button>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-950/60 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-900/50"
                        title="Close Reader"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Reader Stage */}
            <div
                ref={containerRef}
                className="flex-1 flex items-center justify-center overflow-auto px-4 py-8 relative"
                style={{ perspective: "2000px" }}
            >
                {/* Stage Left Arrow Overlay */}
                <button
                    onClick={prevPage}
                    disabled={isLoading || currentPage === 1}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-30 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                {/* Stage Right Arrow Overlay */}
                <button
                    onClick={nextPage}
                    disabled={isLoading || (isMobile ? currentPage === numPages : currentPage + 1 >= numPages)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-30 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {isLoading ? (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                        <span className="text-sm font-semibold tracking-wide animate-pulse">Loading magazine...</span>
                    </div>
                ) : (
                    <div className="relative flex items-center justify-center max-w-full z-10" style={{ transformStyle: "preserve-3d" }}>
                        <AnimatePresence initial={false} mode="wait" custom={direction}>
                            {isMobile ? (
                                // Mobile View: Single Page Card with 3D Flip Turn
                                <motion.div
                                    key={`page-${currentPage}`}
                                    custom={direction}
                                    variants={mobilePageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="relative bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-900"
                                    style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
                                >
                                    <canvas ref={canvasLeftRef} className="max-w-full block shadow-inner" />
                                    {/* Real Magazine Paper Semi-Gloss Overlay */}
                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                </motion.div>
                            ) : (
                                // Desktop View: Double Page Book with 3D Center-Hinge Hinge Page Turn
                                <div className="flex relative shadow-2xl rounded-lg overflow-hidden border border-[#222]/80 bg-[#121212] p-2" style={{ transformStyle: "preserve-3d" }}>
                                    {/* Left Page (Hinged at Center Right Spine) */}
                                    <motion.div
                                        key={`left-page-${currentPage}`}
                                        custom={direction}
                                        variants={leftPageVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className={`relative bg-white ${currentPage === 1 ? "w-0 h-0 overflow-hidden" : ""}`}
                                        style={{ transformStyle: "preserve-3d", transformOrigin: "right center" }}
                                    >
                                        <canvas ref={canvasLeftRef} className="block shadow-inner" />
                                        {currentPage > 1 && (
                                            <>
                                                {/* Page Inner Fold Spine Shadow */}
                                                <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-black/15 pointer-events-none z-10" />
                                                {/* Left Page Corner fold shadow */}
                                                <div className="absolute bottom-0 left-0 w-8 h-8 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none z-10" />
                                                {/* Real Magazine Paper Semi-Gloss Overlay */}
                                                <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                            </>
                                        )}
                                    </motion.div>

                                    {/* Book Spine Divider & Center Shadow fold */}
                                    {currentPage > 1 && (
                                        <div className="relative w-[4px] bg-gradient-to-r from-gray-300 via-gray-700 to-gray-300 z-20 flex items-center justify-center">
                                            <div className="absolute top-0 bottom-0 -left-[20px] w-[20px] bg-gradient-to-r from-transparent to-black/40 pointer-events-none" />
                                            <div className="absolute top-0 bottom-0 -right-[20px] w-[20px] bg-gradient-to-l from-transparent to-black/40 pointer-events-none" />
                                        </div>
                                    )}

                                    {/* Right Page (Hinged at Center Left Spine) */}
                                    <motion.div
                                        key={`right-page-${currentPage}`}
                                        custom={direction}
                                        variants={rightPageVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="relative bg-white"
                                        style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
                                    >
                                        <canvas ref={canvasRightRef} className="block shadow-inner" />
                                        {/* Crease fold Shadow */}
                                        {currentPage > 1 && (
                                            <div className="absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-l from-transparent to-black/15 pointer-events-none z-10" />
                                        )}
                                        {/* Cover spine crease shadow to simulate actual book fold */}
                                        {currentPage === 1 && (
                                            <div className="absolute top-0 left-0 bottom-0 w-[5px] bg-black/35 pointer-events-none z-10 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.5)]" />
                                        )}
                                        {/* Right Page Corner shadow */}
                                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-black/5 to-transparent pointer-events-none z-10" />
                                        
                                        {/* Real Magazine Paper Semi-Gloss Overlay */}
                                        <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Bottom Navigation Toolbar */}
            <div className="p-4 bg-[#1a1a1a] border-t border-[#2b2b2b] flex flex-col sm:flex-row items-center justify-between gap-4 text-white z-10 shadow-inner">
                <span className="text-sm font-semibold text-gray-300 order-2 sm:order-1">{getPageRangeString()}</span>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-4 order-1 sm:order-2">
                    <button
                        onClick={prevPage}
                        disabled={isLoading || currentPage === 1}
                        className="px-5 py-2.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-40 disabled:hover:bg-[#2a2a2a] rounded-xl flex items-center gap-1.5 font-bold text-sm border border-[#3b3b3b] active:scale-95 transition-all text-white shadow-md"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                        onClick={nextPage}
                        disabled={isLoading || (isMobile ? currentPage === numPages : currentPage + 1 >= numPages)}
                        className="px-5 py-2.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-40 disabled:hover:bg-[#2a2a2a] rounded-xl flex items-center gap-1.5 font-bold text-sm border border-[#3b3b3b] active:scale-95 transition-all text-white shadow-md"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="text-xs text-muted-foreground hidden sm:block order-3">
                    Tip: Use Left & Right Arrow keys to flip pages
                </div>
            </div>

            <style jsx global>{`
                /* Real Semi-Gloss Paper glare overlay */
                .magazine-gloss {
                    background: linear-gradient(
                        140deg, 
                        rgba(255, 255, 255, 0) 35%, 
                        rgba(255, 255, 255, 0.05) 45%, 
                        rgba(255, 255, 255, 0.075) 50%,
                        rgba(255, 255, 255, 0.05) 55%,
                        rgba(255, 255, 255, 0) 65%
                    );
                    mix-blend-mode: overlay;
                }
            `}</style>
        </div>
    );
}
