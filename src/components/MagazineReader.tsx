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
    
    // Dynamic PDF page aspect ratio (defaults to standard A4 1.414)
    const [pageRatio, setPageRatio] = useState<number>(1.414);

    // 3D CSS Hinge Flip Anim States
    const [isFlipping, setIsFlipping] = useState<boolean>(false);
    const [flipAngle, setFlipAngle] = useState<number>(0);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const [direction, setDirection] = useState<"next" | "prev">("next");

    const containerRef = useRef<HTMLDivElement | null>(null);
    const bookWrapperRef = useRef<HTMLDivElement | null>(null);
    const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
    const canvasRightRef = useRef<HTMLCanvasElement | null>(null);
    const canvasFlipFrontRef = useRef<HTMLCanvasElement | null>(null);
    const canvasFlipBackRef = useRef<HTMLCanvasElement | null>(null);

    const renderTasksRef = useRef<{ [key: string]: any }>({});
    
    // Pinch Gestures Refs
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

                // Load first page to calculate exact PDF aspect ratio dynamically
                const firstPage = await loadedPdf.getPage(1);
                const viewport = firstPage.getViewport({ scale: 1.0 });
                const ratio = viewport.height / viewport.width;

                setPageRatio(ratio);
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

    // Helper: Calculate book dimensions fitting page aspect ratio exactly (removing empty white blocks)
    const getBookDimensions = () => {
        const availableHeight = window.innerHeight - 180;
        const availableWidth = window.innerWidth - 80;

        let height = availableHeight;
        let width = height / pageRatio;

        const isDoubleLayout = !isMobile && (currentPage > 1 || isFlipping);

        if (isDoubleLayout) {
            // Desktop: Double page layout side-by-side
            width = width * 2;
            if (width > availableWidth) {
                width = availableWidth;
                height = (width / 2) * pageRatio;
            }
        } else {
            // Mobile OR Static Cover page: Single page layout
            if (width > availableWidth) {
                width = availableWidth;
                height = width * pageRatio;
            }
        }

        return {
            width: Math.round(width * scale),
            height: Math.round(height * scale)
        };
    };

    // Helper: Render individual PDF page onto its canvas with High-DPI scaling and Offscreen Double-Buffering
    const renderPageToCanvas = async (
        pdfDoc: any, 
        pageNum: number, 
        canvas: HTMLCanvasElement, 
        pageWidth: number, 
        pageHeight: number,
        taskKey: string
    ) => {
        if (renderTasksRef.current[taskKey]) {
            renderTasksRef.current[taskKey].cancel();
        }

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });

            const scaleX = pageWidth / viewport.width;
            const scaleY = pageHeight / viewport.height;
            const fitScale = Math.min(scaleX, scaleY);
            const finalViewport = page.getViewport({ scale: fitScale });
            
            const dpr = window.devicePixelRatio || 1;
            const targetWidth = Math.round(finalViewport.width * dpr);
            const targetHeight = Math.round(finalViewport.height * dpr);

            // 1. Create offscreen canvas buffer to prevent clear-to-blank rendering flicker
            const offscreen = document.createElement("canvas");
            offscreen.width = targetWidth;
            offscreen.height = targetHeight;
            
            const offscreenCtx = offscreen.getContext("2d");
            if (offscreenCtx) {
                offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

                // 2. Render PDF page asynchronously onto offscreen canvas
                const renderTask = page.render({
                    canvasContext: offscreenCtx,
                    viewport: finalViewport
                });
                renderTasksRef.current[taskKey] = renderTask;
                await renderTask.promise;
                delete renderTasksRef.current[taskKey];

                // 3. Copy pixels synchronously to visible canvas in <1ms (flicker-free replacement)
                if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    canvas.style.width = `${finalViewport.width}px`;
                    canvas.style.height = `${finalViewport.height}px`;
                }

                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(offscreen, 0, 0);
                }
            }
        } catch (e: any) {
            if (e.name !== "RenderingCancelledException") {
                console.error(`Error rendering page ${pageNum}:`, e);
            }
        }
    };

    // Render Static Pages when not flipping
    useEffect(() => {
        if (!pdf || isFlipping || isLoading) return;

        const renderStaticView = async () => {
            const dims = getBookDimensions();
            const pageWidth = isMobile ? dims.width : (dims.width / 2);
            const pageHeight = dims.height;

            if (isMobile) {
                if (canvasLeftRef.current) {
                    await renderPageToCanvas(pdf, currentPage, canvasLeftRef.current, pageWidth, pageHeight, "leftStatic");
                }
            } else {
                const renderPromises = [];
                if (currentPage === 1) {
                    // Cover page centers itself on the right canvas
                    if (canvasRightRef.current) {
                        renderPromises.push(renderPageToCanvas(pdf, 1, canvasRightRef.current, pageWidth, pageHeight, "rightStatic"));
                    }
                } else {
                    if (canvasLeftRef.current && currentPage <= numPages) {
                        renderPromises.push(renderPageToCanvas(pdf, currentPage, canvasLeftRef.current, pageWidth, pageHeight, "leftStatic"));
                    }
                    if (canvasRightRef.current && currentPage + 1 <= numPages) {
                        renderPromises.push(renderPageToCanvas(pdf, currentPage + 1, canvasRightRef.current, pageWidth, pageHeight, "rightStatic"));
                    }
                }
                await Promise.all(renderPromises);
            }
        };

        renderStaticView();
    }, [pdf, currentPage, scale, isMobile, isFlipping, isLoading, pageRatio]);

    // 4. Trigger Flip Turn Animation (Render-First, Animate-Second)
    const startFlip = async (dir: "next" | "prev") => {
        if (isFlipping || isLoading || !pdf) return;

        const dims = getBookDimensions();
        const pageWidth = isMobile ? dims.width : (dims.width / 2);
        const pageHeight = dims.height;

        setDirection(dir);
        setIsFlipping(true);
        setIsAnimating(false);
        setFlipAngle(dir === "next" ? 0 : -180);

        if (dir === "next") {
            const currentLeft = currentPage;
            const currentRight = isMobile ? currentLeft : currentLeft + 1;
            const targetLeft = isMobile ? currentLeft + 1 : (currentLeft === 1 ? 2 : currentLeft + 2);
            const targetRight = targetLeft + 1;

            const renderPromises = [
                // Render Front moving sheet (current right page - starts visible on right side)
                canvasFlipFrontRef.current ? renderPageToCanvas(pdf, currentRight, canvasFlipFrontRef.current, pageWidth, pageHeight, "flipFront") : Promise.resolve(),
                // Render Back moving sheet (target left page - lands visible on left side)
                canvasFlipBackRef.current ? renderPageToCanvas(pdf, targetLeft, canvasFlipBackRef.current, pageWidth, pageHeight, "flipBack") : Promise.resolve(),
                // Render static right page revealed underneath the flip
                (canvasRightRef.current && targetRight <= numPages && !isMobile) ? renderPageToCanvas(pdf, targetRight, canvasRightRef.current, pageWidth, pageHeight, "rightStatic") : Promise.resolve()
            ];
            await Promise.all(renderPromises);

            // Mid-Flip Optimization: at 350ms (when moving sheet is vertical), trigger the static left canvas to pre-render page targetLeft
            // Since it runs in the background, it completes BEFORE the 800ms flip ends, preventing landing stutter/flicker!
            setTimeout(() => {
                if (canvasLeftRef.current && targetLeft <= numPages) {
                    renderPageToCanvas(pdf, targetLeft, canvasLeftRef.current, pageWidth, pageHeight, "leftStatic");
                }
            }, 350);
        } else {
            const currentLeft = currentPage;
            const targetLeft = isMobile ? currentLeft - 1 : (currentLeft === 2 ? 1 : currentLeft - 2);
            const targetRight = targetLeft + 1;

            const renderPromises = [
                // Render Back moving sheet (current left page - starts visible on left side)
                canvasFlipBackRef.current ? renderPageToCanvas(pdf, currentLeft, canvasFlipBackRef.current, pageWidth, pageHeight, "flipBack") : Promise.resolve(),
                // Render Front moving sheet (target right page - lands visible on right side)
                canvasFlipFrontRef.current ? renderPageToCanvas(pdf, targetRight, canvasFlipFrontRef.current, pageWidth, pageHeight, "flipFront") : Promise.resolve(),
                // Render static left page revealed underneath the flip
                (canvasLeftRef.current && targetLeft > 1 && !isMobile) ? renderPageToCanvas(pdf, targetLeft, canvasLeftRef.current, pageWidth, pageHeight, "leftStatic") : Promise.resolve()
            ];
            await Promise.all(renderPromises);

            // Mid-Flip Optimization: at 350ms, trigger static right canvas to pre-render page targetRight
            setTimeout(() => {
                if (canvasRightRef.current && targetRight <= numPages) {
                    renderPageToCanvas(pdf, targetRight, canvasRightRef.current, pageWidth, pageHeight, "rightStatic");
                }
            }, 350);
        }

        // Trigger CSS 3D folding transition in the next paint cycle (duration extended to 800ms for extra rendering head-room)
        setTimeout(() => {
            setIsAnimating(true);
            setFlipAngle(dir === "next" ? -180 : 0);
        }, 50);
    };

    const handleAnimationComplete = () => {
        if (!isFlipping) return;

        // Perform page index update
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

        setIsAnimating(false);
        setIsFlipping(false);
        setFlipAngle(0);
    };

    const nextPage = () => {
        const isLastPage = isMobile ? currentPage === numPages : currentPage + 1 >= numPages;
        if (isLastPage) return;
        startFlip("next");
    };

    const prevPage = () => {
        if (currentPage === 1) return;
        startFlip("prev");
    };

    // 5. Mobile Touch Pinch-to-zoom Gesture Handler
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

                const wrapper = bookWrapperRef.current;
                if (wrapper) {
                    wrapper.style.transform = `scale(${ratio})`;
                    wrapper.style.transformOrigin = "center center";
                }
            }
        };

        const handleTouchEnd = () => {
            if (initialTouchDistanceRef.current !== null && currentRatioRef.current !== 1.0) {
                const wrapper = bookWrapperRef.current;
                if (wrapper) {
                    wrapper.style.transform = "";
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

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") nextPage();
            if (e.key === "ArrowLeft") prevPage();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pdf, currentPage, isLoading, isFlipping]);

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

    const isDoubleLayout = !isMobile && (currentPage > 1 || isFlipping);
    const showLeftPage = isDoubleLayout && (currentPage > 1 || isFlipping);

    const dims = getBookDimensions();
    const bookWidth = dims.width;
    const bookHeight = dims.height;
    const pageWidth = isMobile ? bookWidth : (bookWidth / 2);

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

                    <div className="h-5 w-[1px] bg-[#242424] mx-1 mx-2" />

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
                    <div className="flex flex-col items-center gap-4 text-white z-40 bg-black/40 p-6 rounded-2xl backdrop-blur-md">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                        <span className="text-sm font-semibold tracking-wide animate-pulse">Loading magazine...</span>
                    </div>
                ) : (
                    /* Book Container Wrapper */
                    <div 
                        ref={bookWrapperRef}
                        className="relative flex items-center justify-center shadow-2xl bg-[#141414] p-2 rounded-lg border border-white/5 transition-transform duration-100 ease-out"
                        style={{
                            width: `${bookWidth}px`,
                            height: `${bookHeight}px`,
                            perspective: "2500px",
                            transformStyle: "preserve-3d"
                        }}
                    >
                        {/* LEFT STATIC PAGE */}
                        <div 
                            className="relative overflow-hidden"
                            style={{
                                width: `${pageWidth}px`,
                                height: `${bookHeight}px`,
                                display: showLeftPage ? "block" : "none"
                            }}
                        >
                            <canvas ref={canvasLeftRef} className="block mx-auto" />
                            <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                            
                            {/* Inner Crease Shadow */}
                            {showLeftPage && (
                                <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-black/10 to-transparent pointer-events-none z-10" />
                            )}
                        </div>

                        {/* RIGHT STATIC PAGE */}
                        <div 
                            className="relative overflow-hidden"
                            style={{
                                width: `${pageWidth}px`,
                                height: `${bookHeight}px`,
                                display: (isMobile || currentPage + 1 <= numPages || isFlipping || currentPage === 1) ? "block" : "none"
                            }}
                        >
                            <canvas ref={canvasRightRef} className="block mx-auto" />
                            <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                            
                            {/* Inner Crease Shadow */}
                            {isDoubleLayout && currentPage > 1 && (
                                <div className="absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-10" />
                            )}
                            {/* Cover Spine creases */}
                            {!isMobile && currentPage === 1 && !isFlipping && (
                                <div className="absolute top-0 left-0 bottom-0 w-[5px] bg-black/25 pointer-events-none z-10 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.4)]" />
                            )}
                        </div>

                        {/* 3D FLIPPING SHEET OVERLAY (CSS 3D GPU transition) */}
                        {isFlipping && (
                            <div
                                className="absolute top-2 bottom-2 z-30 shadow-2xl"
                                style={{
                                    width: `${pageWidth}px`,
                                    left: direction === "next" ? (isMobile ? "0px" : "50%") : "auto",
                                    right: direction === "prev" ? (isMobile ? "0px" : "50%") : "auto",
                                    transformOrigin: direction === "next" ? "left center" : "right center",
                                    transformStyle: "preserve-3d",
                                    transform: `rotateY(${flipAngle}deg)`,
                                    transition: isAnimating ? "transform 800ms cubic-bezier(0.25, 1, 0.5, 1)" : "none",
                                    pointerEvents: "none"
                                }}
                                onTransitionEnd={handleAnimationComplete}
                            >
                                {/* FRONT FACE (Visible initially) */}
                                <div className="absolute inset-0 bg-white backface-hidden z-20 shadow-2xl">
                                    <canvas ref={canvasFlipFrontRef} className="block w-full h-full" />
                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                    {/* Crease shadow sweep */}
                                    <div 
                                        className="absolute inset-0 bg-black pointer-events-none z-30 transition-opacity duration-300"
                                        style={{
                                            opacity: isAnimating ? (direction === "next" ? 0.25 : 0) : 0,
                                            mixBlendMode: "multiply"
                                        }}
                                    />
                                    {/* Fold shadow */}
                                    <div className={`absolute top-0 bottom-0 w-4 pointer-events-none z-10 ${direction === "next" ? "right-0 bg-gradient-to-l from-black/5 to-transparent" : "left-0 bg-gradient-to-r from-black/5 to-transparent"}`} />
                                </div>

                                {/* BACK FACE (Visible after 90 degree rotation) */}
                                <div 
                                    className="absolute inset-0 bg-white backface-hidden z-10 shadow-2xl"
                                    style={{ transform: "rotateY(180deg)" }}
                                >
                                    <canvas ref={canvasFlipBackRef} className="block w-full h-full" />
                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                    {/* Crease shadow sweep */}
                                    <div 
                                        className="absolute inset-0 bg-black pointer-events-none z-30 transition-opacity duration-300"
                                        style={{
                                            opacity: isAnimating ? (direction === "next" ? 0 : 0.25) : 0,
                                            mixBlendMode: "multiply"
                                        }}
                                    />
                                    {/* Fold shadow */}
                                    <div className={`absolute top-0 bottom-0 w-4 pointer-events-none z-10 ${direction === "next" ? "left-0 bg-gradient-to-r from-black/5 to-transparent" : "right-0 bg-gradient-to-l from-black/5 to-transparent"}`} />
                                </div>
                            </div>
                        )}
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
                    Tip: Click page arrows or use Keyboard Arrow Keys to flip, pinch to zoom
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
