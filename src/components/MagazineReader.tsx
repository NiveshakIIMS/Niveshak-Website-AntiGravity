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

const scriptPromises: { [src: string]: Promise<void> | undefined } = {};

function loadScript(src: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    
    const existingPromise = scriptPromises[src];
    if (existingPromise) {
        return existingPromise;
    }

    const promise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            const existingScript = existing as HTMLScriptElement;
            if (existingScript.dataset.loaded === "true") {
                resolve();
            } else {
                existingScript.addEventListener("load", () => {
                    existingScript.dataset.loaded = "true";
                    resolve();
                });
                existingScript.addEventListener("error", (err) => reject(err));
            }
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
            script.dataset.loaded = "true";
            resolve();
        };
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });

    scriptPromises[src] = promise;
    return promise;
}

export default function MagazineReader({ magazine, onClose }: MagazineReaderProps) {
    const [pdf, setPdf] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1); 
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [scale, setScale] = useState<number>(1.0);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const flipbookRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const renderTasksRef = useRef<{ [key: number]: any }>({});

    const initialTouchDistanceRef = useRef<number | null>(null);
    const initialScaleRef = useRef<number>(1.0);
    const currentRatioRef = useRef<number>(1.0);

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

    // 3. Laptop Trackpad Pinch-to-zoom Integration
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const zoomFactor = 0.05;
                if (e.deltaY < 0) {
                    setScale((s) => Math.min(2.5, s + zoomFactor));
                } else {
                    setScale((s) => Math.max(0.6, s - zoomFactor));
                }
            }
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, []);

    // Helper: Calculate book dimensions fitting A4 ratio standard (1:1.414)
    const getBookDimensions = () => {
        const availableHeight = window.innerHeight - 180;
        const availableWidth = window.innerWidth - 80;

        const pageRatio = 1.414;

        let height = availableHeight;
        let width = height / pageRatio;

        if (isMobile) {
            // Mobile: Single page display
            if (width > availableWidth) {
                width = availableWidth;
                height = width * pageRatio;
            }
        } else {
            // Desktop: Double page display side-by-side
            width = width * 2;
            if (width > availableWidth) {
                width = availableWidth;
                height = (width / 2) * pageRatio;
            }
        }

        return {
            width: Math.round(width * scale),
            height: Math.round(height * scale)
        };
    };

    // Helper: Render individual PDF page onto its canvas with High-DPI scaling
    const renderPageToCanvas = async (
        pdfDoc: any, 
        pageNum: number, 
        canvas: HTMLCanvasElement, 
        pageWidth: number, 
        pageHeight: number
    ) => {
        // Cancel active render tasks for this page
        if (renderTasksRef.current[pageNum]) {
            renderTasksRef.current[pageNum].cancel();
        }

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });

            const scaleX = pageWidth / viewport.width;
            const scaleY = pageHeight / viewport.height;
            const fitScale = Math.min(scaleX, scaleY);

            const finalViewport = page.getViewport({ scale: fitScale });
            
            const dpr = window.devicePixelRatio || 1;
            const newWidth = Math.round(finalViewport.width * dpr);
            const newHeight = Math.round(finalViewport.height * dpr);

            // ONLY resize canvas if dimensions actually changed (prevents blank screen flickers)
            if (canvas.width !== newWidth || canvas.height !== newHeight) {
                canvas.width = newWidth;
                canvas.height = newHeight;
                canvas.style.width = `${finalViewport.width}px`;
                canvas.style.height = `${finalViewport.height}px`;
                
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }
            }

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                const renderTask = page.render({
                    canvasContext: ctx,
                    viewport: finalViewport
                });
                renderTasksRef.current[pageNum] = renderTask;
                await renderTask.promise;
                delete renderTasksRef.current[pageNum];
            }
        } catch (e: any) {
            if (e.name !== "RenderingCancelledException") {
                console.error(`Error rendering page ${pageNum}:`, e);
            }
        }
    };

    // Helper: Pre-render visible pages and adjacent buffers to ensure 100% flicker-free turns
    const renderViewPages = async (pdfDoc: any, view: number[]) => {
        if (!pdfDoc) return;

        const dims = getBookDimensions();
        const pageWidth = isMobile ? dims.width : (dims.width / 2);
        const pageHeight = dims.height;

        const visiblePages = view.filter(p => p > 0 && p <= numPages);
        
        // Load adjacent buffer pages (up to 2 pages ahead and behind)
        const adjacentPages: number[] = [];
        visiblePages.forEach(p => {
            if (p - 1 > 0 && !visiblePages.includes(p - 1)) adjacentPages.push(p - 1);
            if (p - 2 > 0 && !visiblePages.includes(p - 2)) adjacentPages.push(p - 2);
            if (p + 1 <= numPages && !visiblePages.includes(p + 1)) adjacentPages.push(p + 1);
            if (p + 2 <= numPages && !visiblePages.includes(p + 2)) adjacentPages.push(p + 2);
        });

        const uniqueAdjacent = Array.from(new Set(adjacentPages));

        // 1. Priority: Render currently visible pages first
        await Promise.all(
            visiblePages.map(p => {
                const canvas = document.getElementById(`canvas-page-${p}`) as HTMLCanvasElement;
                if (canvas) {
                    return renderPageToCanvas(pdfDoc, p, canvas, pageWidth, pageHeight);
                }
                return Promise.resolve();
            })
        );

        // 2. Background: Pre-render surrounding pages to cache peels
        uniqueAdjacent.forEach(p => {
            const canvas = document.getElementById(`canvas-page-${p}`) as HTMLCanvasElement;
            if (canvas) {
                renderPageToCanvas(pdfDoc, p, canvas, pageWidth, pageHeight);
            }
        });
    };

    // 4. Initialize and control turn.js flipbook
    useEffect(() => {
        if (!pdf) return;

        let active = true;
        let $flipbook: any = null;

        const initBook = async () => {
            // Ensure jQuery is loaded first
            await loadScript("https://code.jquery.com/jquery-3.6.0.min.js");
            if (!active) return;

            // Load turn.js script
            await loadScript("/js/turn.js");
            if (!active) return;

            const $ = (window as any).$;
            if (!$) return;

            $flipbook = $(flipbookRef.current);
            if (!$flipbook || !$flipbook.length) return;

            const dims = getBookDimensions();

            // Initialize turn.js engine
            $flipbook.turn({
                width: dims.width,
                height: dims.height,
                autoCenter: true,
                display: isMobile ? "single" : "double",
                duration: 600,
                acceleration: true,
                gradients: true,
                when: {
                    turning: (event: any, page: number, view: number[]) => {
                        // Pre-render turning target pages to avoid white flashes
                        renderViewPages(pdf, view);
                    },
                    turned: (event: any, page: number, view: number[]) => {
                        setCurrentPage(page);
                        renderViewPages(pdf, view);
                    }
                }
            });

            // Initial render call
            const initialView = $flipbook.turn("view");
            await renderViewPages(pdf, initialView);
            setIsLoading(false);
        };

        initBook();

        return () => {
            active = false;
            // Clean up tasks
            Object.values(renderTasksRef.current).forEach(task => task.cancel());
            // Destroy turn.js flipbook
            if ($flipbook && $flipbook.length && $flipbook.turn("is")) {
                try {
                    $flipbook.turn("destroy");
                } catch (e) {
                    console.error("Failed to destroy turnbook", e);
                }
            }
        };
    }, [pdf, isMobile]);

    // 5. Handle Zoom size adjustments
    useEffect(() => {
        if (!pdf || isLoading) return;
        const $ = (window as any).$;
        if (!$ || !flipbookRef.current) return;

        const $fb = $(flipbookRef.current);
        if ($fb.length && $fb.turn("is")) {
            const dims = getBookDimensions();
            
            // Resize turn.js wrapper
            $fb.turn("size", dims.width, dims.height);
            
            // Disable swiping/peeling when zoomed in to let users pan/scroll around easily
            $fb.turn("disable", scale > 1.0);

            // Re-render currently visible canvases at the new scale resolution
            const currentView = $fb.turn("view");
            renderViewPages(pdf, currentView);
        }
    }, [scale]);

    // 6. Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") nextPage();
            if (e.key === "ArrowLeft") prevPage();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pdf, isLoading]);

    // 7. Mobile Touch Pinch-to-zoom Gesture Handler
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialTouchDistanceRef.current = dist;
                initialScaleRef.current = scale;
                currentRatioRef.current = 1.0;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
                e.preventDefault();
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const ratio = dist / initialTouchDistanceRef.current;
                currentRatioRef.current = ratio;

                // GPU-accelerated scaling of the flipbook element for smooth 60fps pinch movement
                const fbEl = flipbookRef.current;
                if (fbEl) {
                    fbEl.style.transform = `scale(${ratio})`;
                    fbEl.style.transformOrigin = "center center";
                }
            }
        };

        const handleTouchEnd = () => {
            if (initialTouchDistanceRef.current !== null && currentRatioRef.current !== 1.0) {
                const fbEl = flipbookRef.current;
                if (fbEl) {
                    fbEl.style.transform = "";
                }

                // Compute and commit final zoom scale state (triggers high-DPI canvas re-draw)
                const finalScale = Math.min(2.5, Math.max(0.6, initialScaleRef.current * currentRatioRef.current));
                setScale(finalScale);
            }
            initialTouchDistanceRef.current = null;
            currentRatioRef.current = 1.0;
        };

        container.addEventListener("touchstart", handleTouchStart, { passive: true });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });
        container.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
            container.removeEventListener("touchend", handleTouchEnd);
        };
    }, [scale, isLoading]);

    const nextPage = () => {
        const $ = (window as any).$;
        if ($ && flipbookRef.current) {
            const $fb = $(flipbookRef.current);
            if ($fb.length && $fb.turn("is")) {
                $fb.turn("next");
            }
        }
    };

    const prevPage = () => {
        const $ = (window as any).$;
        if ($ && flipbookRef.current) {
            const $fb = $(flipbookRef.current);
            if ($fb.length && $fb.turn("is")) {
                $fb.turn("previous");
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

    const getPageRangeString = () => {
        if (isMobile) return `Page ${currentPage} of ${numPages}`;
        if (currentPage === 1) return `Cover (Page 1 of ${numPages})`;
        const next = currentPage + 1;
        return next <= numPages ? `Pages ${currentPage}-${next} of ${numPages}` : `Page ${currentPage} of ${numPages}`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0c0c0c]/98 backdrop-blur-xl flex flex-col justify-between select-none">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between p-4 bg-[#141414] border-b border-[#242424] text-white z-10 shadow-lg">
                <div className="flex flex-col">
                    <span className="font-bold text-sm sm:text-base line-clamp-1">{magazine.title}</span>
                    <span className="text-xs text-muted-foreground">{magazine.issueMonth} {magazine.issueYear}</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-3">
                    <button
                        onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
                        className="p-2 hover:bg-[#2c2c2c] rounded-lg transition-colors border border-transparent hover:border-[#3a3a3a]"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-5 h-5 text-gray-300" />
                    </button>
                    <span className="text-xs font-bold px-2 text-gray-300 w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
                        className="p-2 hover:bg-[#2c2c2c] rounded-lg transition-colors border border-transparent hover:border-[#3a3a3a]"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-5 h-5 text-gray-300" />
                    </button>

                    <div className="h-5 w-[1px] bg-[#242424] mx-1 sm:mx-2" />

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-[#2c2c2c] rounded-lg transition-colors hidden sm:block border border-transparent hover:border-[#3a3a3a]"
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
                    <div className="relative flex items-center justify-center max-w-full z-10">
                        {/* turn.js container */}
                        <div 
                            ref={flipbookRef}
                            id="flipbook"
                            className="shadow-2xl"
                        >
                            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                                <div 
                                    key={pageNum}
                                    className="page bg-white relative overflow-hidden"
                                    style={{ width: "100%", height: "100%" }}
                                >
                                    <canvas 
                                        id={`canvas-page-${pageNum}`} 
                                        className="block mx-auto" 
                                    />
                                    {/* Real Magazine Paper Semi-Gloss Overlay */}
                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                    
                                    {/* Spine crease shadow for double page layout */}
                                    {pageNum > 1 && pageNum < numPages && (
                                        <div className={`absolute top-0 bottom-0 w-8 pointer-events-none z-10 ${
                                            pageNum % 2 === 0 
                                                ? 'right-0 bg-gradient-to-l from-black/8 to-transparent' 
                                                : 'left-0 bg-gradient-to-r from-black/8 to-transparent'
                                        }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation Toolbar */}
            <div className="p-4 bg-[#141414] border-t border-[#242424] flex flex-col sm:flex-row items-center justify-between gap-4 text-white z-10 shadow-inner">
                <span className="text-sm font-semibold text-gray-300 order-2 sm:order-1">{getPageRangeString()}</span>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-4 order-1 sm:order-2">
                    <button
                        onClick={prevPage}
                        disabled={isLoading || currentPage === 1}
                        className="px-5 py-2.5 bg-[#252525] hover:bg-[#353535] disabled:opacity-40 disabled:hover:bg-[#252525] rounded-xl flex items-center gap-1.5 font-bold text-sm border border-[#343434] active:scale-95 transition-all text-white shadow-md"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                        onClick={nextPage}
                        disabled={isLoading || (isMobile ? currentPage === numPages : currentPage + 1 >= numPages)}
                        className="px-5 py-2.5 bg-[#252525] hover:bg-[#353535] disabled:opacity-40 disabled:hover:bg-[#252525] rounded-xl flex items-center gap-1.5 font-bold text-sm border border-[#343434] active:scale-95 transition-all text-white shadow-md"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="text-xs text-muted-foreground hidden sm:block order-3">
                    Tip: Click page corners or drag pages to flip, pinch to zoom
                </div>
            </div>

            <style jsx global>{`
                /* Real Semi-Gloss Paper glare overlay */
                .magazine-gloss {
                    background: linear-gradient(
                        135deg, 
                        rgba(255, 255, 255, 0) 35%, 
                        rgba(255, 255, 255, 0.03) 45%, 
                        rgba(255, 255, 255, 0.05) 50%,
                        rgba(255, 255, 255, 0.03) 55%,
                        rgba(255, 255, 255, 0) 65%
                    );
                    mix-blend-mode: overlay;
                }
                
                /* turn.js specific styles */
                #flipbook {
                    margin: 0 auto;
                    transition: width 0.3s ease, height 0.3s ease;
                }
                
                .turn-page {
                    background-color: #fff;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
                }
                
                /* Hide raw turn pages before initialization */
                #flipbook:not(.animated) > .page {
                    display: none;
                }
                #flipbook:not(.animated) > .page:first-child {
                    display: block;
                }
            `}</style>
        </div>
    );
}
