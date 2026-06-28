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

function isGlobalDefined(name: string): boolean {
    if (typeof window === 'undefined') return false;
    const parts = name.split(".");
    let current: any = window;
    for (const part of parts) {
        if (current[part] === undefined) return false;
        current = current[part];
    }
    return true;
}

function loadScript(src: string, globalCheck?: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();

    if (globalCheck && isGlobalDefined(globalCheck)) {
        return Promise.resolve();
    }

    if (scriptPromises[src]) {
        return scriptPromises[src];
    }

    const promise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (globalCheck && isGlobalDefined(globalCheck)) {
                resolve();
                return;
            }
            const existingScript = existing as HTMLScriptElement;
            if (existingScript.dataset.loaded === "true") {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (globalCheck && isGlobalDefined(globalCheck)) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);

                existingScript.addEventListener("load", () => {
                    clearInterval(checkInterval);
                    existingScript.dataset.loaded = "true";
                    resolve();
                });
                existingScript.addEventListener("error", (err) => {
                    clearInterval(checkInterval);
                    reject(err);
                });
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

    const mountRef = useRef<HTMLDivElement | null>(null);
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
            // Mobile: Single page layout
            if (width > availableWidth) {
                width = availableWidth;
                height = width * pageRatio;
            }
        } else {
            // Desktop: Double page layout side-by-side
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

    // Helper: Pre-render visible pages and adjacent buffers
    const renderViewPages = async (pdfDoc: any, view: number[]) => {
        if (!pdfDoc) return;

        const dims = getBookDimensions();
        const pageWidth = isMobile ? dims.width : (dims.width / 2);
        const pageHeight = dims.height;

        const visiblePages = view.filter(p => p > 0 && p <= numPages);
        
        const adjacentPages: number[] = [];
        visiblePages.forEach(p => {
            if (p - 1 > 0 && !visiblePages.includes(p - 1)) adjacentPages.push(p - 1);
            if (p - 2 > 0 && !visiblePages.includes(p - 2)) adjacentPages.push(p - 2);
            if (p + 1 <= numPages && !visiblePages.includes(p + 1)) adjacentPages.push(p + 1);
            if (p + 2 <= numPages && !visiblePages.includes(p + 2)) adjacentPages.push(p + 2);
        });

        const uniqueAdjacent = Array.from(new Set(adjacentPages));

        // 1. Priority: Render currently visible pages
        await Promise.all(
            visiblePages.map(p => {
                const canvas = document.getElementById(`canvas-page-${p}`) as HTMLCanvasElement;
                if (canvas) {
                    return renderPageToCanvas(pdfDoc, p, canvas, pageWidth, pageHeight);
                }
                return Promise.resolve();
            })
        );

        // 2. Background: Pre-render adjacent pages
        uniqueAdjacent.forEach(p => {
            const canvas = document.getElementById(`canvas-page-${p}`) as HTMLCanvasElement;
            if (canvas) {
                renderPageToCanvas(pdfDoc, p, canvas, pageWidth, pageHeight);
            }
        });
    };

    // 4. Initialize and control turn.js flipbook (Isolated inside DOM parent to avoid React conflicts)
    useEffect(() => {
        if (!pdf || !mountRef.current) return;

        let active = true;
        let $flipbook: any = null;

        const initBook = async () => {
            setIsLoading(true);

            // 1. Load jQuery
            await loadScript("https://code.jquery.com/jquery-3.6.0.min.js", "jQuery");
            if (!active) return;

            // 2. Load turn.js
            await loadScript("/js/turn.js", "jQuery.fn.turn");
            if (!active) return;

            const $ = (window as any).$;
            if (!$) return;

            // 3. Clear any previous mount content to isolate turn.js DOM completely
            mountRef.current!.innerHTML = "";

            // 4. Construct flipbook container dynamically
            const fb = document.createElement("div");
            fb.id = "flipbook";
            fb.className = "shadow-2xl";
            mountRef.current!.appendChild(fb);

            // 5. Append page elements dynamically
            for (let i = 1; i <= numPages; i++) {
                const pageDiv = document.createElement("div");
                pageDiv.className = "page bg-white relative overflow-hidden";
                pageDiv.style.width = "100%";
                pageDiv.style.height = "100%";

                const canvas = document.createElement("canvas");
                canvas.id = `canvas-page-${i}`;
                canvas.className = "block mx-auto";
                pageDiv.appendChild(canvas);

                const gloss = document.createElement("div");
                gloss.className = "absolute inset-0 magazine-gloss pointer-events-none z-20";
                pageDiv.appendChild(gloss);

                // Spine Crease shadow for interior pages
                if (i > 1 && i < numPages) {
                    const crease = document.createElement("div");
                    crease.className = `absolute top-0 bottom-0 w-8 pointer-events-none z-10 ${
                        i % 2 === 0 
                            ? 'right-0 bg-gradient-to-l from-black/8 to-transparent' 
                            : 'left-0 bg-gradient-to-r from-black/8 to-transparent'
                    }`;
                    pageDiv.appendChild(crease);
                }

                fb.appendChild(pageDiv);
            }

            $flipbook = $(fb);
            const dims = getBookDimensions();

            // 6. Initialize turnbook
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
                        renderViewPages(pdf, view);
                    },
                    turned: (event: any, page: number, view: number[]) => {
                        setCurrentPage(page);
                        renderViewPages(pdf, view);
                    }
                }
            });

            // 7. Initial render view
            const initialView = $flipbook.turn("view");
            await renderViewPages(pdf, initialView);
            setIsLoading(false);
        };

        initBook();

        return () => {
            active = false;
            Object.values(renderTasksRef.current).forEach(task => task.cancel());
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
        if (!$ || !mountRef.current) return;

        const fbEl = document.getElementById("flipbook");
        if (fbEl) {
            const dims = getBookDimensions();
            const $fb = $(fbEl);
            if ($fb.length && $fb.turn("is")) {
                $fb.turn("size", dims.width, dims.height);
                $fb.turn("disable", scale > 1.0);

                const currentView = $fb.turn("view");
                renderViewPages(pdf, currentView);
            }
        }
    }, [scale]);

    // 6. Mobile Touch Pinch-to-zoom Gesture Handler
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

                const fbEl = document.getElementById("flipbook");
                if (fbEl) {
                    fbEl.style.transform = `scale(${ratio})`;
                    fbEl.style.transformOrigin = "center center";
                }
            }
        };

        const handleTouchEnd = () => {
            if (initialTouchDistanceRef.current !== null && currentRatioRef.current !== 1.0) {
                const fbEl = document.getElementById("flipbook");
                if (fbEl) {
                    fbEl.style.transform = "";
                }

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

    // 7. Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") nextPage();
            if (e.key === "ArrowLeft") prevPage();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pdf, isLoading]);

    const nextPage = () => {
        const $ = (window as any).$;
        const fbEl = document.getElementById("flipbook");
        if ($ && fbEl) {
            const $fb = $(fbEl);
            if ($fb.length && $fb.turn("is")) {
                $fb.turn("next");
            }
        }
    };

    const prevPage = () => {
        const $ = (window as any).$;
        const fbEl = document.getElementById("flipbook");
        if ($ && fbEl) {
            const $fb = $(fbEl);
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

                {isLoading && (
                    <div className="absolute flex flex-col items-center gap-4 text-white z-40 bg-black/40 p-6 rounded-2xl backdrop-blur-md">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                        <span className="text-sm font-semibold tracking-wide animate-pulse">Loading magazine...</span>
                    </div>
                )}

                {/* Isolated target mount where turn.js elements will build */}
                <div 
                    ref={mountRef}
                    className="relative flex items-center justify-center max-w-full z-10"
                />
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
                    transition: transform 0.1s ease-out;
                }
                
                .turn-page {
                    background-color: #fff;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
                }
            `}</style>
        </div>
    );
}
