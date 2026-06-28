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
    const [currentPage, setCurrentPage] = useState<number>(1); 
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [scale, setScale] = useState<number>(1.0);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    
    // Physical 3D Book Flip Animation States
    const [isFlipping, setIsFlipping] = useState<boolean>(false);
    const [isAnimationActive, setIsAnimationActive] = useState<boolean>(false);
    const [direction, setDirection] = useState<"next" | "prev">("next");

    const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
    const canvasRightRef = useRef<HTMLCanvasElement | null>(null);
    const canvasFlippingFrontRef = useRef<HTMLCanvasElement | null>(null);
    const canvasFlippingBackRef = useRef<HTMLCanvasElement | null>(null);
    
    const containerRef = useRef<HTMLDivElement | null>(null);
    const renderTasksRef = useRef<{ left?: any; right?: any; flipFront?: any; flipBack?: any }>({});

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

    // Helper: High-DPI legibility rendering of a page on a canvas
    const renderPageToCanvas = async (
        pdfDoc: any, 
        pageNum: number, 
        canvas: HTMLCanvasElement, 
        availableWidth: number, 
        availableHeight: number, 
        scaleMultiplier: number, 
        isHalfWidth: boolean,
        taskKey: 'left' | 'right' | 'flipFront' | 'flipBack'
    ) => {
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });

            const maxPageWidth = isHalfWidth ? (availableWidth / 2) : availableWidth;
            const scaleX = maxPageWidth / viewport.width;
            const scaleY = availableHeight / viewport.height;
            const fitScale = Math.min(scaleX, scaleY) * scaleMultiplier;

            const finalViewport = page.getViewport({ scale: fitScale });
            
            // High-DPI Legibility: backing store scaled by devicePixelRatio
            const dpr = window.devicePixelRatio || 1;
            canvas.width = finalViewport.width * dpr;
            canvas.height = finalViewport.height * dpr;
            canvas.style.width = `${finalViewport.width}px`;
            canvas.style.height = `${finalViewport.height}px`;

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                
                const renderTask = page.render({
                    canvasContext: ctx,
                    viewport: finalViewport
                });
                renderTasksRef.current[taskKey] = renderTask;
                await renderTask.promise;
            }
        } catch (e: any) {
            if (e.name !== "RenderingCancelledException") {
                console.error(`Error rendering page ${pageNum}:`, e);
            }
        }
    };

    // 3. Render Pages when currentPage, scale, layout, or isFlipping state changes
    useEffect(() => {
        if (!pdf) return;

        const renderPages = async () => {
            // Cancel previous render tasks if running
            if (renderTasksRef.current.left) renderTasksRef.current.left.cancel();
            if (renderTasksRef.current.right) renderTasksRef.current.right.cancel();
            if (renderTasksRef.current.flipFront) renderTasksRef.current.flipFront.cancel();
            if (renderTasksRef.current.flipBack) renderTasksRef.current.flipBack.cancel();

            const container = containerRef.current;
            if (!container) return;

            const availableHeight = window.innerHeight - 180;
            const availableWidth = container.clientWidth - 80;

            if (isFlipping) {
                // RENDER DURING 3D FLIP TRANSITION
                if (isMobile) {
                    const canvasBg = canvasLeftRef.current;
                    const canvasFront = canvasFlippingFrontRef.current;
                    const canvasBack = canvasFlippingBackRef.current;

                    const currentPg = currentPage;
                    const targetPg = direction === "next" ? currentPage + 1 : currentPage - 1;

                    if (canvasBg) {
                        await renderPageToCanvas(pdf, targetPg, canvasBg, availableWidth, availableHeight, scale, false, 'left');
                    }
                    if (canvasFront) {
                        await renderPageToCanvas(pdf, direction === "next" ? currentPg : targetPg, canvasFront, availableWidth, availableHeight, scale, false, 'flipFront');
                    }
                    if (canvasBack) {
                        await renderPageToCanvas(pdf, direction === "next" ? targetPg : currentPg, canvasBack, availableWidth, availableHeight, scale, false, 'flipBack');
                    }
                } else {
                    // Desktop Hinge Page Turn Render
                    const canvasLeftBg = canvasLeftRef.current;
                    const canvasRightBg = canvasRightRef.current;
                    const canvasFront = canvasFlippingFrontRef.current;
                    const canvasBack = canvasFlippingBackRef.current;

                    if (direction === "next") {
                        const targetPg = currentPage === 1 ? 2 : currentPage + 2;

                        // Left Background shows old left page
                        if (canvasLeftBg && currentPage > 1) {
                            await renderPageToCanvas(pdf, currentPage, canvasLeftBg, availableWidth, availableHeight, scale, true, 'left');
                        }
                        // Right Background shows target right page (under the turn)
                        if (canvasRightBg && targetPg + 1 <= numPages) {
                            await renderPageToCanvas(pdf, targetPg + 1, canvasRightBg, availableWidth, availableHeight, scale, true, 'right');
                        }
                        // Flipping Page Front Face shows old right page
                        if (canvasFront) {
                            await renderPageToCanvas(pdf, currentPage === 1 ? 1 : currentPage + 1, canvasFront, availableWidth, availableHeight, scale, true, 'flipFront');
                        }
                        // Flipping Page Back Face shows target left page
                        if (canvasBack && targetPg <= numPages) {
                            await renderPageToCanvas(pdf, targetPg, canvasBack, availableWidth, availableHeight, scale, true, 'flipBack');
                        }
                    } else {
                        // Prev flip
                        const targetPg = currentPage === 2 ? 1 : currentPage - 2;

                        // Left Background shows target left page
                        if (canvasLeftBg && targetPg > 1) {
                            await renderPageToCanvas(pdf, targetPg, canvasLeftBg, availableWidth, availableHeight, scale, true, 'left');
                        }
                        // Right Background shows old right page
                        if (canvasRightBg) {
                            await renderPageToCanvas(pdf, currentPage + 1 <= numPages ? currentPage + 1 : currentPage, canvasRightBg, availableWidth, availableHeight, scale, true, 'right');
                        }
                        // Flipping Page Front Face shows old left page
                        if (canvasFront) {
                            await renderPageToCanvas(pdf, currentPage, canvasFront, availableWidth, availableHeight, scale, true, 'flipFront');
                        }
                        // Flipping Page Back Face shows target right page
                        if (canvasBack) {
                            await renderPageToCanvas(pdf, targetPg === 1 ? 1 : targetPg + 1, canvasBack, availableWidth, availableHeight, scale, true, 'flipBack');
                        }
                    }
                }

                // Trigger rotation animation after canvases are setup
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        setIsAnimationActive(true);
                    }, 30);
                });
            } else {
                // STATIC DISPLAY (NO FLIP TRANSITION IN PROGRESS)
                if (isMobile) {
                    const canvas = canvasLeftRef.current;
                    if (canvas) {
                        await renderPageToCanvas(pdf, currentPage, canvas, availableWidth, availableHeight, scale, false, 'left');
                    }
                } else {
                    const leftCanvas = canvasLeftRef.current;
                    const rightCanvas = canvasRightRef.current;

                    if (currentPage === 1) {
                        if (leftCanvas) {
                            leftCanvas.width = 0;
                            leftCanvas.height = 0;
                            leftCanvas.style.width = "0px";
                            leftCanvas.style.height = "0px";
                        }
                        if (rightCanvas) {
                            await renderPageToCanvas(pdf, 1, rightCanvas, availableWidth, availableHeight, scale, true, 'right');
                        }
                    } else {
                        if (leftCanvas && currentPage <= numPages) {
                            await renderPageToCanvas(pdf, currentPage, leftCanvas, availableWidth, availableHeight, scale, true, 'left');
                        }
                        if (rightCanvas) {
                            if (currentPage + 1 <= numPages) {
                                await renderPageToCanvas(pdf, currentPage + 1, rightCanvas, availableWidth, availableHeight, scale, true, 'right');
                            } else {
                                rightCanvas.width = 0;
                                rightCanvas.height = 0;
                                rightCanvas.style.width = "0px";
                                rightCanvas.style.height = "0px";
                            }
                        }
                    }
                }
            }
        };

        renderPages();
    }, [pdf, currentPage, scale, isMobile, numPages, isFlipping]);

    // 4. Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") nextPage();
            if (e.key === "ArrowLeft") prevPage();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pdf, currentPage, isMobile, numPages, isFlipping]);

    const nextPage = () => {
        if (!pdf || isFlipping) return;
        
        const isLastPage = isMobile 
            ? currentPage === numPages 
            : currentPage + 1 >= numPages;
        if (isLastPage) return;

        setDirection("next");
        setIsFlipping(true);
    };

    const prevPage = () => {
        if (!pdf || isFlipping) return;
        
        if (currentPage === 1) return;

        setDirection("prev");
        setIsFlipping(true);
    };

    const handleFlipEnd = () => {
        if (!isFlipping) return;

        if (direction === "next") {
            const targetPg = isMobile 
                ? currentPage + 1 
                : (currentPage === 1 ? 2 : currentPage + 2);
            setCurrentPage(targetPg);
        } else {
            const targetPg = isMobile 
                ? currentPage - 1 
                : (currentPage === 2 ? 1 : currentPage - 2);
            setCurrentPage(targetPg);
        }

        setIsFlipping(false);
        setIsAnimationActive(false);
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
                style={{ perspective: "2000px" }}
            >
                {/* Stage Left Arrow Overlay */}
                <button
                    onClick={prevPage}
                    disabled={isLoading || currentPage === 1 || isFlipping}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-30 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                {/* Stage Right Arrow Overlay */}
                <button
                    onClick={nextPage}
                    disabled={isLoading || (isMobile ? currentPage === numPages : currentPage + 1 >= numPages) || isFlipping}
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
                        
                        {/* Static / Background Book Pages Container */}
                        <div className="flex relative shadow-2xl rounded-lg overflow-hidden border border-[#222]/80 bg-[#141414] p-2" style={{ transformStyle: "preserve-3d" }}>
                            {isMobile ? (
                                // Mobile view: single static page
                                <div className="relative bg-white">
                                    <canvas ref={canvasLeftRef} className="max-w-full block shadow-inner" />
                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                </div>
                            ) : (
                                // Desktop view: double static page
                                <>
                                    {/* Left static background page */}
                                    <div className={`relative bg-white ${currentPage === 1 ? "w-0 h-0 overflow-hidden p-0 m-0 border-0" : ""}`}>
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
                                    </div>

                                    {/* Book Spine Divider & Center Shadow fold */}
                                    {currentPage > 1 && (
                                        <div className="relative w-[4px] bg-gradient-to-r from-gray-300 via-gray-700 to-gray-300 z-20 flex items-center justify-center">
                                            <div className="absolute top-0 bottom-0 -left-[20px] w-[20px] bg-gradient-to-r from-transparent to-black/40 pointer-events-none" />
                                            <div className="absolute top-0 bottom-0 -right-[20px] w-[20px] bg-gradient-to-l from-transparent to-black/40 pointer-events-none" />
                                        </div>
                                    )}

                                    {/* Right static background page */}
                                    <div className="relative bg-white">
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
                                    </div>
                                </>
                            )}

                            {/* Dynamic 3D Flipping Page Sheet */}
                            {isFlipping && (
                                <div 
                                    className="absolute top-2 bottom-2 z-30 transition-transform duration-[600ms] ease-in-out"
                                    style={{
                                        width: isMobile ? "calc(100% - 16px)" : "calc(50% - 6px)",
                                        left: direction === "next" ? (isMobile ? "8px" : "50%") : "auto",
                                        right: direction === "prev" ? (isMobile ? "8px" : "50%") : "auto",
                                        transformOrigin: direction === "next" ? "left center" : "right center",
                                        transform: direction === "next" 
                                            ? (isAnimationActive ? "rotateY(-180deg)" : "rotateY(0deg)")
                                            : (isAnimationActive ? "rotateY(0deg)" : "rotateY(-180deg)"),
                                        transformStyle: "preserve-3d",
                                    }}
                                    onTransitionEnd={handleFlipEnd}
                                >
                                    {/* Front Page Face (Visible from 0 to 90 degrees) */}
                                    <div className="absolute inset-0 bg-white backface-hidden z-20 shadow-xl border-r border-gray-200">
                                        <canvas ref={canvasFlippingFrontRef} className="block w-full h-full" />
                                        {/* Specular Glare paper gloss */}
                                        <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                        {/* Page edge fold shadow */}
                                        <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/5 to-transparent pointer-events-none z-10" />
                                    </div>

                                    {/* Back Page Face (Visible from 90 to 180 degrees, flipped on Y axis) */}
                                    <div 
                                        className="absolute inset-0 bg-white backface-hidden z-10 shadow-xl border-l border-gray-200" 
                                        style={{ transform: "rotateY(180deg)" }}
                                    >
                                        <canvas ref={canvasFlippingBackRef} className="block w-full h-full" />
                                        {/* Specular Glare paper gloss */}
                                        <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                        {/* Page edge fold shadow */}
                                        <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/5 to-transparent pointer-events-none z-10" />
                                    </div>
                                </div>
                            )}
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
                        disabled={isLoading || currentPage === 1 || isFlipping}
                        className="px-5 py-2.5 bg-[#252525] hover:bg-[#353535] disabled:opacity-40 disabled:hover:bg-[#252525] rounded-xl flex items-center gap-1.5 font-bold text-sm border border-[#343434] active:scale-95 transition-all text-white shadow-md"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                        onClick={nextPage}
                        disabled={isLoading || (isMobile ? currentPage === numPages : currentPage + 1 >= numPages) || isFlipping}
                        className="px-5 py-2.5 bg-[#252525] hover:bg-[#353535] disabled:opacity-40 disabled:hover:bg-[#252525] rounded-xl flex items-center gap-1.5 font-bold text-sm border border-[#343434] active:scale-95 transition-all text-white shadow-md"
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
                        135deg, 
                        rgba(255, 255, 255, 0) 35%, 
                        rgba(255, 255, 255, 0.03) 45%, 
                        rgba(255, 255, 255, 0.05) 50%,
                        rgba(255, 255, 255, 0.03) 55%,
                        rgba(255, 255, 255, 0) 65%
                    );
                    mix-blend-mode: overlay;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
            `}</style>
        </div>
    );
}
