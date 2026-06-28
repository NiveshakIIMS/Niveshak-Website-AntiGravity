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
    
    // Dynamic PDF aspect ratio (calculated on PDF load)
    const [pageRatio, setPageRatio] = useState<number>(1.414);

    // 3D Hinge Page Flip States (Custom GPU Compositor Engine)
    const [isFlipping, setIsFlipping] = useState<boolean>(false);
    const [flipAngle, setFlipAngle] = useState<number>(0);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const [direction, setDirection] = useState<"next" | "prev">("next");

    // Interactive Drag-to-Flip Physics States
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragStartXRef = useRef<number>(0);
    const dragCurrentXRef = useRef<number>(0);

    // Modern Distraction-free floating controls timeout
    const [showToolbar, setShowToolbar] = useState<boolean>(true);
    const toolbarTimeoutRef = useRef<any>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const bookWrapperRef = useRef<HTMLDivElement | null>(null);
    const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
    const canvasRightRef = useRef<HTMLCanvasElement | null>(null);
    const canvasFlipFrontRef = useRef<HTMLCanvasElement | null>(null);
    const canvasFlipBackRef = useRef<HTMLCanvasElement | null>(null);

    const renderTasksRef = useRef<{ [key: string]: any }>({});
    
    // Mobile Pinch Gesture tracking refs
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

                // Dynamically extract aspect ratio of the first page
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

    // 4. Distraction-Free Toolbar Hiding Timeout
    const handleUserInteraction = () => {
        setShowToolbar(true);
        if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
        toolbarTimeoutRef.current = setTimeout(() => {
            if (!isFlipping && !isDragging) {
                setShowToolbar(false);
            }
        }, 3000);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener("mousemove", handleUserInteraction);
        container.addEventListener("touchstart", handleUserInteraction);

        return () => {
            container.removeEventListener("mousemove", handleUserInteraction);
            container.removeEventListener("touchstart", handleUserInteraction);
            if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
        };
    }, [isFlipping, isDragging]);

    // Helper: Calculate book dimensions fitting page aspect ratio exactly
    const getBookDimensions = () => {
        const availableHeight = window.innerHeight - 180;
        const availableWidth = window.innerWidth - 80;

        let height = availableHeight;
        let width = height / pageRatio;

        if (!isMobile) {
            // Desktop: Book layout is always double-page width for 3D coordinate stability
            width = width * 2;
            if (width > availableWidth) {
                width = availableWidth;
                height = (width / 2) * pageRatio;
            }
        } else {
            // Mobile: Single page layout
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
            const isDoubleLayout = !isMobile;
            const pageWidth = isDoubleLayout ? (dims.width / 2) : dims.width;
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

    // 5. Trigger Flip Turn Animation (Unified Right-Hinged 3D Hinge Model)
    const startFlip = async (dir: "next" | "prev") => {
        if (isFlipping || isLoading || !pdf) return;

        const dims = getBookDimensions();
        const pageWidth = isMobile ? dims.width : (dims.width / 2);
        const pageHeight = dims.height;

        setDirection(dir);
        setIsAnimating(false);
        
        // Unified position: Page sheet is always on the right (left: 50%), hinging on left spine edge.
        // next: starts flat on right (0deg), swings to left (-180deg).
        // prev: starts folded on left (-180deg), swings to right (0deg).
        setFlipAngle(dir === "next" ? 0 : -180);

        if (dir === "next") {
            const currentLeft = currentPage;
            const currentRight = isMobile ? currentLeft : currentLeft + 1;
            const targetLeft = isMobile ? currentLeft + 1 : (currentLeft === 1 ? 2 : currentLeft + 2);
            const targetRight = targetLeft + 1;

            const renderPromises = [
                // Front face is visible initially on right (page currentRight)
                canvasFlipFrontRef.current ? renderPageToCanvas(pdf, currentRight, canvasFlipFrontRef.current, pageWidth, pageHeight, "flipFront") : Promise.resolve(),
                // Back face turns visible on left (page targetLeft)
                canvasFlipBackRef.current ? renderPageToCanvas(pdf, targetLeft, canvasFlipBackRef.current, pageWidth, pageHeight, "flipBack") : Promise.resolve(),
                // Static right underneath reveals targetRight
                (canvasRightRef.current && targetRight <= numPages && !isMobile) ? renderPageToCanvas(pdf, targetRight, canvasRightRef.current, pageWidth, pageHeight, "rightStatic") : Promise.resolve()
            ];
            await Promise.all(renderPromises);

            setIsFlipping(true);

            // Mid-Flip pre-render left page background
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
                // Back face is visible initially on left (page currentLeft)
                canvasFlipBackRef.current ? renderPageToCanvas(pdf, currentLeft, canvasFlipBackRef.current, pageWidth, pageHeight, "flipBack") : Promise.resolve(),
                // Front face turns visible on right (page targetRight)
                canvasFlipFrontRef.current ? renderPageToCanvas(pdf, targetRight, canvasFlipFrontRef.current, pageWidth, pageHeight, "flipFront") : Promise.resolve(),
                // Static left underneath reveals targetLeft
                (canvasLeftRef.current && targetLeft > 1 && !isMobile) ? renderPageToCanvas(pdf, targetLeft, canvasLeftRef.current, pageWidth, pageHeight, "leftStatic") : Promise.resolve()
            ];
            await Promise.all(renderPromises);

            setIsFlipping(true);

            // Mid-Flip pre-render right page background
            setTimeout(() => {
                if (canvasRightRef.current && targetRight <= numPages) {
                    renderPageToCanvas(pdf, targetRight, canvasRightRef.current, pageWidth, pageHeight, "rightStatic");
                }
            }, 350);
        }

        // Trigger CSS 3D folding transition in next paint frame (duration 800ms)
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

    // 6. Interactive Drag-to-Flip Physics Handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        if (isFlipping || isLoading || isDragging) return;

        const wrapper = bookWrapperRef.current;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        // Swipe starting hot-spots (outer 30% bounds)
        let side: "next" | "prev" | null = null;
        if (clickX > width * 0.7) {
            side = "next";
        } else if (clickX < width * 0.3) {
            side = "prev";
        }

        if (!side) return;

        const isLastPage = isMobile ? currentPage === numPages : currentPage + 1 >= numPages;
        if (side === "next" && isLastPage) return;
        if (side === "prev" && currentPage === 1) return;

        // Start drag capture
        setIsDragging(true);
        dragStartXRef.current = e.clientX;
        dragCurrentXRef.current = e.clientX;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        dragCurrentXRef.current = e.clientX;
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        const deltaX = dragCurrentXRef.current - dragStartXRef.current;
        const dragDistance = Math.abs(deltaX);

        if (dragDistance < 15) {
            // Click action: turn pages based on which half of the book was clicked
            const rect = bookWrapperRef.current?.getBoundingClientRect();
            if (rect) {
                const clickX = e.clientX - rect.left;
                if (clickX < rect.width / 2) {
                    prevPage();
                } else {
                    nextPage();
                }
            }
            return;
        }

        const threshold = window.innerWidth * 0.15;
        if (dragDistance > threshold) {
            if (deltaX < 0) {
                nextPage();
            } else {
                prevPage();
            }
        }
    };

    // 7. Double-click to zoom
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setScale((s) => (s > 1.05 ? 1.0 : 1.8));
    };

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

    const isDoubleLayout = !isMobile;
    const showLeftPage = isDoubleLayout && (currentPage > 1 || isFlipping);

    const dims = getBookDimensions();
    const bookWidth = dims.width;
    const bookHeight = dims.height;
    
    // Fix: pageWidth is always halved on desktop double page layout
    const pageWidth = isDoubleLayout ? (bookWidth / 2) : bookWidth;

    // Center Cover page layout using GPU translation shift on double page container
    // When currentPage === 1 (and not flipping), we shift the book container left by pageWidth/2 so the cover aligns exactly to center.
    // When flipping or currentPage > 1, the container slides back to 0px, mimicking opening a physical book cover!
    const needsCoverShift = !isMobile && currentPage === 1 && !isFlipping;
    const shiftX = needsCoverShift ? -pageWidth / 2 : 0;

    // Peak page curl skew value in mid-flight (skew peaks at 90deg, 0 at flat points)
    const progress = Math.abs(flipAngle) / 180;
    const skewY = Math.sin(progress * Math.PI) * 4.0; // 4.0 degree bend curl skew

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col justify-between select-none transition-colors duration-500"
            style={{
                background: "radial-gradient(circle, rgba(13, 27, 42, 0.94) 0%, rgba(6, 12, 20, 0.98) 100%)",
                backdropFilter: "blur(35px)",
                WebkitBackdropFilter: "blur(35px)"
            }}
        >
            
            {/* Header Floating Glass Toolbar */}
            <div 
                className={`fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl px-6 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-between text-white z-50 shadow-2xl transition-all duration-500 ease-in-out ${
                    showToolbar ? "translate-y-0 opacity-100 scale-100" : "-translate-y-24 opacity-0 scale-95 pointer-events-none"
                }`}
            >
                <div className="flex flex-col min-w-0 pr-4">
                    {/* Fixed: Full title is visible and never truncated or clipped */}
                    <span className="font-bold text-xs sm:text-sm text-orange-500 tracking-wide uppercase whitespace-normal">{magazine.title}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{magazine.issueMonth} {magazine.issueYear}</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                        onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
                        className="p-1.5 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5 active:scale-90"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4 text-gray-300" />
                    </button>
                    <span className="text-[10px] sm:text-xs font-bold px-1 text-gray-300 w-12 text-center select-none bg-white/5 py-1 rounded-md">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
                        className="p-1.5 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5 active:scale-90"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4 text-gray-300" />
                    </button>

                    <div className="h-4 w-[1px] bg-white/10 mx-1" />

                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5 active:scale-90"
                        title="Fullscreen Toggle"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-300" /> : <Maximize2 className="w-4 h-4 text-gray-300" />}
                    </button>

                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/30 active:scale-90"
                        title="Close Reader"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Reader Stage (Scroll stage container) */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto relative bg-transparent"
            >
                {/* Fixed Navigation Overlays */}
                {/* Stage Left Arrow Overlay */}
                <button
                    onClick={prevPage}
                    disabled={isLoading || currentPage === 1 || isFlipping}
                    className="fixed left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-40 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                {/* Stage Right Arrow Overlay */}
                <button
                    onClick={nextPage}
                    disabled={isLoading || (isMobile ? currentPage === numPages : currentPage + 1 >= numPages) || isFlipping}
                    className="fixed right-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-40 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Centering Wrapper with Generous Scroll Padding, letting zoomed-in readers scroll past margins */}
                <div className="flex items-center justify-center min-h-full min-w-full p-20 sm:p-28 md:p-36">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-4 text-white z-40 bg-black/40 p-6 rounded-2xl backdrop-blur-md">
                            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                            <span className="text-sm font-semibold tracking-wide animate-pulse">Loading magazine...</span>
                        </div>
                    ) : (
                        /* Book Container Wrapper */
                        <div 
                            ref={bookWrapperRef}
                            className="relative flex items-center justify-center shadow-[0_30px_70px_rgba(0,0,0,0.85)] bg-[#121212] p-2 rounded-lg border border-white/5 cursor-grab active:cursor-grabbing"
                            style={{
                                width: `${bookWidth}px`,
                                height: `${bookHeight}px`,
                                perspective: "2500px",
                                transformStyle: "preserve-3d",
                                // Symmetrical GPU Slide Centering Transition mimicking opening a real cover page
                                transform: `translateX(${shiftX}px)`,
                                transition: "transform 800ms cubic-bezier(0.25, 1, 0.5, 1)"
                            }}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onDoubleClick={handleDoubleClick}
                        >
                            {/* LEFT STATIC PAGE */}
                            <div 
                                className="relative overflow-hidden transition-all duration-300"
                                style={{
                                    width: `${pageWidth}px`,
                                    height: `${bookHeight}px`,
                                    display: showLeftPage ? "block" : "none",
                                    // 3D paper stack border edges simulating page thickness
                                    boxShadow: showLeftPage ? "-1px 0px 0px #e5e5e5, -2px 0px 0px #dbdbdb, -3px 0px 0px #d1d1d1, -4px 0px 0px #c7c7c7, -10px 0px 20px rgba(0,0,0,0.3)" : "none"
                                }}
                            >
                                <canvas ref={canvasLeftRef} className="block mx-auto" />
                                <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                
                                {/* Inner Crease Shadow */}
                                {showLeftPage && (
                                    <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-black/20 to-transparent pointer-events-none z-10" />
                                )}
                            </div>

                            {/* RIGHT STATIC PAGE */}
                            <div 
                                className="relative overflow-hidden transition-all duration-300"
                                style={{
                                    width: `${pageWidth}px`,
                                    height: `${bookHeight}px`,
                                    display: (isMobile || currentPage + 1 <= numPages || isFlipping || currentPage === 1) ? "block" : "none",
                                    // 3D paper stack border edges simulating page thickness
                                    boxShadow: (isMobile || currentPage === 1) ? "0 0 15px rgba(0,0,0,0.3)" : "1px 0px 0px #e5e5e5, 2px 0px 0px #dbdbdb, 3px 0px 0px #d1d1d1, 4px 0px 0px #c7c7c7, 10px 0px 20px rgba(0,0,0,0.3)"
                                }}
                            >
                                <canvas ref={canvasRightRef} className="block mx-auto" />
                                <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                
                                {/* Inner Crease Shadow */}
                                {isDoubleLayout && currentPage > 1 && (
                                    <div className="absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-10" />
                                )}
                                {/* Cover Spine creases */}
                                {!isMobile && currentPage === 1 && !isFlipping && (
                                    <div className="absolute top-0 left-0 bottom-0 w-[5px] bg-black/25 pointer-events-none z-10 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.4)]" />
                                )}
                            </div>

                            {/* 3D FLIPPING SHEET OVERLAY (Unified Right-Hinged 3D Hinge Model) */}
                            <div
                                className="absolute top-2 bottom-2 z-30 shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
                                style={{
                                    width: `${pageWidth}px`,
                                    // Unified: Always starts positionally on the right page, hinging on the left center spine
                                    left: isMobile ? "0px" : "50%",
                                    transformOrigin: "left center",
                                    transformStyle: "preserve-3d",
                                    transform: `rotateY(${flipAngle}deg) skewY(${direction === "next" ? -skewY : skewY}deg)`,
                                    transition: isAnimating ? "transform 800ms cubic-bezier(0.25, 1, 0.5, 1)" : "none",
                                    pointerEvents: "none",
                                    visibility: isFlipping ? "visible" : "hidden",
                                    opacity: isFlipping ? 1 : 0
                                }}
                                onTransitionEnd={handleAnimationComplete}
                            >
                                {/* FRONT FACE (Visible when flat or tilted right: 0 to -90 degrees) */}
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
                                    <div className="absolute top-0 bottom-0 w-4 pointer-events-none z-10 right-0 bg-gradient-to-l from-black/5 to-transparent" />
                                </div>

                                {/* BACK FACE (Visible when tilted left: -90 to -180 degrees) */}
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
                                    <div className="absolute top-0 bottom-0 w-4 pointer-events-none z-10 left-0 bg-gradient-to-r from-black/5 to-transparent" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Floating Glass Toolbar */}
            <div 
                className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl px-6 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-between text-white z-50 shadow-2xl transition-all duration-500 ease-in-out ${
                    showToolbar ? "translate-y-0 opacity-100 scale-100" : "translate-y-24 opacity-0 scale-95 pointer-events-none"
                }`}
            >
                <span className="text-xs font-semibold text-gray-300 tracking-wide select-none">{getPageRangeString()}</span>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={prevPage}
                        disabled={isLoading || currentPage === 1 || isFlipping}
                        className="px-4 py-2 bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 rounded-xl flex items-center gap-1 font-bold text-xs border border-white/5 active:scale-95 transition-all text-white shadow-md cursor-pointer"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                        onClick={nextPage}
                        disabled={isLoading || (isMobile ? currentPage === numPages : currentPage + 1 >= numPages) || isFlipping}
                        className="px-4 py-2 bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 rounded-xl flex items-center gap-1 font-bold text-xs border border-white/5 active:scale-95 transition-all text-white shadow-md cursor-pointer"
                    >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="text-[10px] text-gray-400 font-medium hidden md:block select-none">
                    Tip: Drag pages or click arrows. Pinch / double-click to zoom
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
