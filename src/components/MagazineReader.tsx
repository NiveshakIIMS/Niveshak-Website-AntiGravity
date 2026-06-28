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
    
    // Interactive 3D Hinge Page Turn States (FlipHTML5 Style)
    const [isFlipping, setIsFlipping] = useState<boolean>(false);
    const [isAnimationActive, setIsAnimationActive] = useState<boolean>(false);
    const [direction, setDirection] = useState<"next" | "prev">("next");
    const [dragAngle, setDragAngle] = useState<number>(0);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [dragCurrentX, setDragCurrentX] = useState<number>(0);
    const [snapback, setSnapback] = useState<boolean>(false);

    // Hover Corner Lift States (Affordance just like FlipHTML5)
    const [isHoveringNext, setIsHoveringNext] = useState<boolean>(false);
    const [isHoveringPrev, setIsHoveringPrev] = useState<boolean>(false);

    const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
    const canvasRightRef = useRef<HTMLCanvasElement | null>(null);
    const canvasFlippingFrontRef = useRef<HTMLCanvasElement | null>(null);
    const canvasFlippingBackRef = useRef<HTMLCanvasElement | null>(null);
    
    const containerRef = useRef<HTMLDivElement | null>(null);
    const bookContainerRef = useRef<HTMLDivElement | null>(null);
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

    // 3. Laptop Trackpad Pinch-to-zoom integration
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                // Intercept trackpad pinch zoom
                e.preventDefault();
                const zoomFactor = 0.04;
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
            const newWidth = finalViewport.width * dpr;
            const newHeight = finalViewport.height * dpr;

            // ONLY resize backing store if dimensions changed, preventing blank-screen flicker
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
                // Clear the backing store at native resolution
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Re-apply dpr scaling
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

    // Helper: Copy canvas pixels instantly to prevent the 1ms render transition flicker
    const copyCanvas = (src: HTMLCanvasElement, dest: HTMLCanvasElement) => {
        const destCtx = dest.getContext("2d");
        if (destCtx) {
            dest.width = src.width;
            dest.height = src.height;
            dest.style.width = src.style.width;
            dest.style.height = src.style.height;
            destCtx.setTransform(1, 0, 0, 1, 0, 0);
            destCtx.clearRect(0, 0, dest.width, dest.height);
            destCtx.drawImage(src, 0, 0);
        }
    };

    // 3. Render Pages when currentPage, scale, layout, or isFlipping state changes
    useEffect(() => {
        if (!pdf) return;

        const renderPages = async () => {
            // Cancel previous tasks
            if (renderTasksRef.current.left) renderTasksRef.current.left.cancel();
            if (renderTasksRef.current.right) renderTasksRef.current.right.cancel();
            if (renderTasksRef.current.flipFront) renderTasksRef.current.flipFront.cancel();
            if (renderTasksRef.current.flipBack) renderTasksRef.current.flipBack.cancel();

            const container = containerRef.current;
            if (!container) return;

            const availableHeight = window.innerHeight - 180;
            const availableWidth = container.clientWidth - 80;

            if (isFlipping) {
                // RENDER IN BACKGROUND (BEFORE STARTING ROTATION TRANSITION)
                const canvasFront = canvasFlippingFrontRef.current;
                const canvasBack = canvasFlippingBackRef.current;

                if (isMobile) {
                    const canvasBg = canvasLeftRef.current;
                    const currentPg = currentPage;
                    const targetPg = direction === "next" ? currentPage + 1 : currentPage - 1;

                    if (canvasFront && canvasBack && canvasBg) {
                        await Promise.all([
                            renderPageToCanvas(pdf, direction === "next" ? currentPg : targetPg, canvasFront, availableWidth, availableHeight, scale, false, 'flipFront'),
                            renderPageToCanvas(pdf, direction === "next" ? targetPg : currentPg, canvasBack, availableWidth, availableHeight, scale, false, 'flipBack'),
                            renderPageToCanvas(pdf, targetPg, canvasBg, availableWidth, availableHeight, scale, false, 'left')
                        ]);
                    }
                } else {
                    const canvasLeftBg = canvasLeftRef.current;
                    const canvasRightBg = canvasRightRef.current;

                    if (canvasFront && canvasBack) {
                        if (direction === "next") {
                            const targetPg = currentPage === 1 ? 2 : currentPage + 2;
                            const renderTasks = [
                                renderPageToCanvas(pdf, currentPage === 1 ? 1 : currentPage + 1, canvasFront, availableWidth, availableHeight, scale, true, 'flipFront'),
                                renderPageToCanvas(pdf, targetPg, canvasBack, availableWidth, availableHeight, scale, true, 'flipBack')
                            ];
                            if (canvasRightBg && targetPg + 1 <= numPages) {
                                renderTasks.push(renderPageToCanvas(pdf, targetPg + 1, canvasRightBg, availableWidth, availableHeight, scale, true, 'right'));
                            }
                            await Promise.all(renderTasks);
                        } else {
                            const targetPg = currentPage === 2 ? 1 : currentPage - 2;
                            const renderTasks = [
                                renderPageToCanvas(pdf, currentPage, canvasFront, availableWidth, availableHeight, scale, true, 'flipFront'),
                                renderPageToCanvas(pdf, targetPg === 1 ? 1 : targetPg + 1, canvasBack, availableWidth, availableHeight, scale, true, 'flipBack')
                            ];
                            if (canvasLeftBg && targetPg > 1) {
                                renderTasks.push(renderPageToCanvas(pdf, targetPg, canvasLeftBg, availableWidth, availableHeight, scale, true, 'left'));
                            }
                            await Promise.all(renderTasks);
                        }
                    }
                }
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
                        const renderTasks = [];
                        if (leftCanvas && currentPage <= numPages) {
                            renderTasks.push(renderPageToCanvas(pdf, currentPage, leftCanvas, availableWidth, availableHeight, scale, true, 'left'));
                        }
                        if (rightCanvas) {
                            if (currentPage + 1 <= numPages) {
                                renderTasks.push(renderPageToCanvas(pdf, currentPage + 1, rightCanvas, availableWidth, availableHeight, scale, true, 'right'));
                            } else {
                                rightCanvas.width = 0;
                                rightCanvas.height = 0;
                                rightCanvas.style.width = "0px";
                                rightCanvas.style.height = "0px";
                            }
                        }
                        await Promise.all(renderTasks);
                    }
                }
                setIsLoading(false);
            }
        };

        renderPages();
    }, [pdf, currentPage, scale, isMobile, numPages, isFlipping]);

    // 4. Interactive Click & Drag Handlers
    const handleDragStart = (clientX: number) => {
        if (!pdf || isFlipping || isDragging) return;

        const book = bookContainerRef.current;
        if (!book) return;

        const rect = book.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const bookWidth = rect.width;

        let side: "next" | "prev" | null = null;
        // Check outer 35% click zones for page dragging
        if (clickX > bookWidth * 0.65) {
            side = "next";
        } else if (clickX < bookWidth * 0.35) {
            side = "prev";
        }

        if (!side) return;

        const isLastPage = isMobile ? currentPage === numPages : currentPage + 1 >= numPages;
        if (side === "next" && isLastPage) return;
        if (side === "prev" && currentPage === 1) return;

        setDirection(side);
        setIsFlipping(true);
        setIsDragging(true);
        setDragStartX(clientX);
        setDragCurrentX(clientX);
        setDragAngle(side === "next" ? 0 : -180);
        setSnapback(false);
    };

    const handleDragMove = (clientX: number) => {
        if (!isDragging || !isFlipping) return;
        setDragCurrentX(clientX);

        const book = bookContainerRef.current;
        if (!book) return;
        const rect = book.getBoundingClientRect();
        const bookWidth = rect.width;

        const dx = clientX - dragStartX;
        const maxDist = bookWidth / 2;
        let pct = Math.abs(dx) / maxDist;
        pct = Math.min(1, Math.max(0, pct));

        if (direction === "next") {
            const angle = -180 * (dx < 0 ? pct : 0);
            setDragAngle(angle);
        } else {
            const angle = -180 + (180 * (dx > 0 ? pct : 0));
            setDragAngle(angle);
        }
    };

    const handleDragEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const book = bookContainerRef.current;
        if (!book) return;
        const rect = book.getBoundingClientRect();
        const bookWidth = rect.width;

        const dx = dragCurrentX - dragStartX;
        const dragDistance = Math.abs(dx);
        const pct = dragDistance / (bookWidth / 2);

        // Click Trigger (if drag distance is minimal, trigger full flip animation)
        if (dragDistance < 12) {
            setIsAnimationActive(true);
            setDragAngle(direction === "next" ? -180 : 0);
            return;
        }

        // Drag Release Resolution
        if (pct > 0.35) {
            // Succeeded: complete the turn
            setIsAnimationActive(true);
            setDragAngle(direction === "next" ? -180 : 0);
        } else {
            // Snapped back: revert to initial position
            setIsAnimationActive(true);
            setDragAngle(direction === "next" ? 0 : -180);
            setSnapback(true);
        }
    };

    const handleFlipEnd = () => {
        if (!isFlipping) return;

        if (snapback) {
            setIsFlipping(false);
            setIsAnimationActive(false);
            setSnapback(false);
            return;
        }

        // Synchronously copy the rendered canvas to the static canvas to prevent 1ms flickering
        if (canvasFlippingBackRef.current) {
            if (isMobile) {
                if (canvasLeftRef.current) {
                    copyCanvas(canvasFlippingBackRef.current, canvasLeftRef.current);
                }
            } else {
                if (direction === "next" && canvasLeftRef.current) {
                    copyCanvas(canvasFlippingBackRef.current, canvasLeftRef.current);
                } else if (direction === "prev" && canvasRightRef.current) {
                    copyCanvas(canvasFlippingBackRef.current, canvasRightRef.current);
                }
            }
        }

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

        setIsFlipping(false);
        setIsAnimationActive(false);
    };

    const nextPage = () => {
        if (isFlipping || isDragging) return;
        handleDragStart(window.innerWidth);
        setTimeout(() => {
            setIsAnimationActive(true);
            setDragAngle(-180);
        }, 50);
    };

    const prevPage = () => {
        if (isFlipping || isDragging) return;
        handleDragStart(0);
        setTimeout(() => {
            setIsAnimationActive(true);
            setDragAngle(0);
        }, 50);
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
        <div 
            ref={containerRef}
            className="fixed inset-0 z-50 bg-[#0c0c0c]/98 backdrop-blur-xl flex flex-col justify-between select-none touch-none"
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchMove={(e) => {
                if (e.touches.length === 1) handleDragMove(e.touches[0].clientX);
            }}
            onTouchEnd={handleDragEnd}
        >
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
                className="flex-1 flex items-center justify-center overflow-auto px-4 py-8 relative"
                style={{ perspective: "2200px" }}
            >
                {/* Stage Left Arrow Overlay */}
                <button
                    onClick={prevPage}
                    onMouseEnter={() => { if (currentPage > 1) setIsHoveringPrev(true); }}
                    onMouseLeave={() => setIsHoveringPrev(false)}
                    disabled={isLoading || currentPage === 1 || isFlipping}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-30 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                {/* Stage Right Arrow Overlay */}
                <button
                    onClick={nextPage}
                    onMouseEnter={() => { 
                        const isLastPage = isMobile ? currentPage === numPages : currentPage + 1 >= numPages;
                        if (!isLastPage) setIsHoveringNext(true); 
                    }}
                    onMouseLeave={() => setIsHoveringNext(false)}
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
                    <div 
                        ref={bookContainerRef}
                        className="relative flex items-center justify-center max-w-full z-10 cursor-grab active:cursor-grabbing" 
                        style={{ transformStyle: "preserve-3d" }}
                        onMouseDown={(e) => handleDragStart(e.clientX)}
                        onTouchStart={(e) => {
                            if (e.touches.length === 1) handleDragStart(e.touches[0].clientX);
                        }}
                    >
                        {/* Static / Background Book Pages Container */}
                        <div className="flex relative shadow-2xl rounded-lg overflow-hidden border border-[#222]/80 bg-[#141414] p-2" style={{ transformStyle: "preserve-3d" }}>
                            {isMobile ? (
                                // Mobile view: single static page with FlipHTML5 corner hover curl
                                <div 
                                    className="relative bg-white transition-transform duration-300 ease-out"
                                    style={{
                                        transformOrigin: "left center",
                                        transform: isHoveringNext ? "rotateY(-7deg)" : "rotateY(0deg)",
                                        transformStyle: "preserve-3d"
                                    }}
                                >
                                    <canvas ref={canvasLeftRef} className="max-w-full block shadow-inner" />
                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                </div>
                            ) : (
                                // Desktop view: double static page
                                <>
                                    {/* Left static background page (with FlipHTML5 Hover Lift) */}
                                    <div 
                                        className={`relative bg-white transition-transform duration-300 ease-out ${currentPage === 1 ? "w-0 h-0 overflow-hidden p-0 m-0 border-0" : ""}`}
                                        style={{
                                            transformOrigin: "right center",
                                            transform: (isHoveringPrev && !isFlipping) ? "rotateY(8deg)" : "rotateY(0deg)",
                                            transformStyle: "preserve-3d"
                                        }}
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
                                                
                                                {/* Corner curl highlight for hover */}
                                                <div className={`absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none z-20 rounded-bl-lg transition-opacity duration-300 ${isHoveringPrev ? "opacity-100" : "opacity-0"}`} />
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

                                    {/* Right static background page (with FlipHTML5 Hover Lift) */}
                                    <div 
                                        className="relative bg-white transition-transform duration-300 ease-out"
                                        style={{
                                            transformOrigin: "left center",
                                            transform: (isHoveringNext && !isFlipping) ? "rotateY(-8deg)" : "rotateY(0deg)",
                                            transformStyle: "preserve-3d"
                                        }}
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

                                        {/* Corner curl highlight for hover */}
                                        <div className={`absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-white/20 to-transparent pointer-events-none z-20 rounded-br-lg transition-opacity duration-300 ${isHoveringNext ? "opacity-100" : "opacity-0"}`} />
                                    </div>
                                </>
                            )}

                            {/* Dynamic 3D Flipping Page Sheet (FlipHTML5 Professional Page Curl Style) */}
                            {isFlipping && (
                                <div 
                                    className="absolute top-2 bottom-2 z-30"
                                    style={{
                                        width: isMobile ? "calc(100% - 16px)" : "calc(50% - 6px)",
                                        left: direction === "next" ? (isMobile ? "8px" : "50%") : "auto",
                                        right: direction === "prev" ? (isMobile ? "8px" : "50%") : "auto",
                                        transformOrigin: direction === "next" ? "left center" : "right center",
                                        transform: direction === "next" 
                                            ? `rotateY(${dragAngle}deg) skewY(${dragAngle * 0.01}deg)`
                                            : `rotateY(${dragAngle}deg) skewY(${(dragAngle + 180) * 0.01}deg)`,
                                        transformStyle: "preserve-3d",
                                        opacity: (isAnimationActive || isDragging) ? 1 : 0,
                                        visibility: (isAnimationActive || isDragging) ? "visible" : "hidden",
                                        transition: isAnimationActive ? "transform 600ms cubic-bezier(0.2, 0.6, 0.3, 1.0), opacity 600ms" : "none",
                                    }}
                                    onTransitionEnd={handleFlipEnd}
                                >
                                    {/* Front Page Face (Visible from 0 to 90 degrees) */}
                                    <div className="absolute inset-0 bg-white backface-hidden z-20 shadow-2xl border-r border-gray-200">
                                        <canvas ref={canvasFlippingFrontRef} className="block w-full h-full" />
                                        <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                        
                                        {/* Moving Crease Shadow Overlay (FlipHTML5 Crease Effect) */}
                                        <div className={`absolute inset-0 pointer-events-none z-30 ${isAnimationActive ? 'shadow-sweep-next' : ''}`} />

                                        {/* Page edge fold shadow */}
                                        <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/5 to-transparent pointer-events-none z-10" />
                                    </div>

                                    {/* Back Page Face (Visible from 90 to 180 degrees, flipped on Y axis) */}
                                    <div 
                                        className="absolute inset-0 bg-white backface-hidden z-10 shadow-2xl border-l border-gray-200" 
                                        style={{ transform: "rotateY(180deg)" }}
                                    >
                                        <canvas ref={canvasFlippingBackRef} className="block w-full h-full" />
                                        <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />

                                        {/* Moving Crease Shadow Overlay (FlipHTML5 Crease Effect) */}
                                        <div className={`absolute inset-0 pointer-events-none z-30 ${isAnimationActive ? 'shadow-sweep-prev' : ''}`} />

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
                    Tip: Click and drag pages or use Arrow keys to flip pages
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

                /* FlipHTML5 Crease Shadow Sweep Animations */
                @keyframes nextShadowSweep {
                    0% {
                        background: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0.2) 100%);
                    }
                    50% {
                        background: linear-gradient(to right, rgba(0,0,0,0) 20%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0) 100%);
                    }
                    100% {
                        background: linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0) 100%);
                    }
                }
                @keyframes prevShadowSweep {
                    0% {
                        background: linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0.2) 100%);
                    }
                    50% {
                        background: linear-gradient(to left, rgba(0,0,0,0) 20%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0) 100%);
                    }
                    100% {
                        background: linear-gradient(to left, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0) 100%);
                    }
                }

                .shadow-sweep-next {
                    position: absolute;
                    inset: 0;
                    z-index: 30;
                    mix-blend-mode: multiply;
                    animation: nextShadowSweep 600ms cubic-bezier(0.2, 0.6, 0.3, 1.0) forwards;
                }

                .shadow-sweep-prev {
                    position: absolute;
                    inset: 0;
                    z-index: 30;
                    mix-blend-mode: multiply;
                    animation: prevShadowSweep 600ms cubic-bezier(0.2, 0.6, 0.3, 1.0) forwards;
                }
            `}</style>
        </div>
    );
}
