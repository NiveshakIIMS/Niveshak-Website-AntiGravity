"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Magazine } from "@/services/dataService";

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
    const [currentPage, setCurrentPage] = useState<number>(1); // Represents left-page index on desktop (always even, except page 1)
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [scale, setScale] = useState<number>(1.0);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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
        setIsLoading(true);
        loadPdfjs()
            .then(async (pdfjs) => {
                if (!pdfjs || !active) return;
                const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(magazine.pdfUrl)}`;
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
                    window.open(magazine.pdfUrl, "_blank");
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
            const availableHeight = window.innerHeight - 160;
            const availableWidth = container.clientWidth - 40;

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

                            const finalViewport = page.getPageViewport ? page.getPageViewport({ scale: fitScale }) : page.getViewport({ scale: fitScale });
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
        if (isMobile) {
            if (currentPage < numPages) setCurrentPage(currentPage + 1);
        } else {
            if (currentPage === 1) {
                if (numPages > 1) setCurrentPage(2);
            } else {
                if (currentPage + 2 <= numPages) {
                    setCurrentPage(currentPage + 2);
                } else if (currentPage + 1 === numPages) {
                    // Already on the last page
                }
            }
        }
    };

    const prevPage = () => {
        if (!pdf) return;
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

    return (
        <div className="fixed inset-0 z-50 bg-[#121212]/95 backdrop-blur-md flex flex-col justify-between select-none">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between p-4 bg-[#1e1e1e] border-b border-[#2e2e2e] text-white">
                <div className="flex flex-col">
                    <span className="font-bold text-sm sm:text-base line-clamp-1">{magazine.title}</span>
                    <span className="text-xs text-muted-foreground">{magazine.issueMonth} {magazine.issueYear}</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-3">
                    <button
                        onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
                        className="p-2 hover:bg-[#333] rounded-lg transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-5 h-5 text-gray-300" />
                    </button>
                    <span className="text-xs font-semibold px-2 text-gray-300">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
                        className="p-2 hover:bg-[#333] rounded-lg transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-5 h-5 text-gray-300" />
                    </button>

                    <div className="h-5 w-[1px] bg-[#2e2e2e] mx-1 sm:mx-2" />

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-[#333] rounded-lg transition-colors hidden sm:block"
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
            >
                {isLoading ? (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                        <span className="text-sm font-semibold tracking-wide animate-pulse">Loading magazine...</span>
                    </div>
                ) : (
                    <div className="relative flex items-center justify-center max-w-full">
                        {/* Book Display */}
                        {isMobile ? (
                            // Mobile view: Single Canvas Card
                            <div className="relative bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-800">
                                <canvas ref={canvasLeftRef} className="max-w-full block shadow-inner" />
                            </div>
                        ) : (
                            // Desktop view: Double Canvas Book
                            <div className="flex relative shadow-2xl rounded-lg overflow-hidden border border-[#222]/80 bg-[#151515] p-1.5">
                                {/* Left Page */}
                                <div
                                    className={`relative transition-all duration-300 bg-white ${
                                        currentPage === 1 ? "w-0 h-0 overflow-hidden" : ""
                                    }`}
                                >
                                    <canvas ref={canvasLeftRef} className="block shadow-inner" />
                                    {currentPage > 1 && (
                                        <>
                                            {/* Page Shadow Right Edge (Inner Fold) */}
                                            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-black/15 pointer-events-none" />
                                            {/* Page Corner Shadow */}
                                            <div className="absolute bottom-0 left-0 w-8 h-8 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
                                        </>
                                    )}
                                </div>

                                {/* Spine divider & Shadow */}
                                {currentPage > 1 && (
                                    <div className="relative w-[3px] bg-gradient-to-r from-gray-300 via-gray-600 to-gray-300 z-20 flex items-center justify-center">
                                        {/* Deep shadow fold on left and right */}
                                        <div className="absolute top-0 bottom-0 -left-[16px] w-[16px] bg-gradient-to-r from-transparent to-black/35 pointer-events-none" />
                                        <div className="absolute top-0 bottom-0 -right-[16px] w-[16px] bg-gradient-to-l from-transparent to-black/35 pointer-events-none" />
                                    </div>
                                )}

                                {/* Right Page */}
                                <div className="relative bg-white">
                                    <canvas ref={canvasRightRef} className="block shadow-inner" />
                                    {/* Page Shadow Left Edge (Inner Fold) */}
                                    {currentPage > 1 && (
                                        <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-l from-transparent to-black/15 pointer-events-none" />
                                    )}
                                    {/* Cover shadow curve to simulate physical book cover depth */}
                                    {currentPage === 1 && (
                                        <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-black/25 pointer-events-none" />
                                    )}
                                    {/* Page Corner Shadow */}
                                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-black/5 to-transparent pointer-events-none" />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Navigation Toolbar */}
            <div className="p-4 bg-[#1e1e1e] border-t border-[#2e2e2e] flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
                <span className="text-sm font-semibold text-gray-300 order-2 sm:order-1">{getPageRangeString()}</span>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-4 order-1 sm:order-2">
                    <button
                        onClick={prevPage}
                        disabled={isLoading || currentPage === 1}
                        className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-40 disabled:hover:bg-[#2d2d2d] rounded-xl flex items-center gap-1 font-bold text-sm border border-[#3e3e3e] active:scale-95 transition-all text-white"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                        onClick={nextPage}
                        disabled={isLoading || (isMobile ? currentPage === numPages : currentPage + 1 >= numPages)}
                        className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-40 disabled:hover:bg-[#2d2d2d] rounded-xl flex items-center gap-1 font-bold text-sm border border-[#3e3e3e] active:scale-95 transition-all text-white"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="text-xs text-muted-foreground hidden sm:block order-3">
                    Tip: Use Left & Right Arrow keys to flip pages
                </div>
            </div>
        </div>
    );
}
