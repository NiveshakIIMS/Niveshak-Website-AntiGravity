"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Maximize2, Minimize2, BookOpen, Layers, RotateCw } from "lucide-react";
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
    
    // Dynamic PDF aspect ratio
    const [pageRatio, setPageRatio] = useState<number>(1.414);

    // Responsive Controls (2-page layout active by default)
    const [doublePageMode, setDoublePageMode] = useState<boolean>(true);
    const [isLandscape, setIsLandscape] = useState<boolean>(false);
    const [forceLandscape, setForceLandscape] = useState<boolean>(false);

    // Editable Zoom State
    const [zoomInput, setZoomInput] = useState<string>("100");
    const [debouncedScale, setDebouncedScale] = useState<number>(1.0);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedScale(scale);
        }, 250);
        return () => clearTimeout(handler);
    }, [scale]);

    // page-flip integration states and refs
    const [isPageFlipInit, setIsPageFlipInit] = useState<boolean>(false);
    const pageFlipRef = useRef<any>(null);
    const bookContainerRef = useRef<HTMLDivElement | null>(null);
    const pageCanvasesRef = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

    // Modern Distraction-free floating controls timeout
    const [showToolbar, setShowToolbar] = useState<boolean>(true);
    const toolbarTimeoutRef = useRef<any>(null);

    // Scroll Activity trackers for toolbar triggers
    const lastScrollDirRef = useRef<"up" | "down" | null>(null);
    const scrollCountRef = useRef<number>(0);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const renderTasksRef = useRef<{ [key: string]: any }>({});
    
    // Mobile Pinch Gesture tracking refs
    const initialTouchDistanceRef = useRef<number | null>(null);
    const initialScaleRef = useRef<number>(1.0);
    const currentRatioRef = useRef<number>(1.0);

    // Pinch zoom isolation state
    const isPinchActiveRef = useRef<boolean>(false);

    // Unified pointer interaction tracking refs
    const interactionStartXRef = useRef<number>(0);
    const interactionStartYRef = useRef<number>(0);
    const interactionStartTimeRef = useRef<number>(0);

    // Sync state values to references to prevent event listener re-bindings and clearTimeout cancellations
    const showToolbarRef = useRef(showToolbar);
    
    useEffect(() => { showToolbarRef.current = showToolbar; }, [showToolbar]);

    // Calculated layout mode based on device, manual toggle, orientation, and forced landscape rotation
    const isDouble = doublePageMode || (isMobile && isLandscape) || forceLandscape;
    const isDoubleLayout = isDouble; // Strictly bound to double-page mode to prevent mid-flip shrinking

    // 1. Detect Screen Size & Orientation
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsLandscape(window.innerWidth > window.innerHeight);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
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

    // Keep zoom percentage input in sync when scale state changes
    useEffect(() => {
        setZoomInput(Math.round(scale * 100).toString());
    }, [scale]);

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

    // 4. Distraction-Free Toolbar Hiding Timeout (Bound ONCE on mount using empty dependency array)
    const handleUserInteraction = () => {
        setShowToolbar(true);
        if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
        toolbarTimeoutRef.current = setTimeout(() => {
            setShowToolbar(false);
        }, 3000);
    };

    useEffect(() => {
        if (!isLoading) {
            handleUserInteraction();
        }
        return () => {
            if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
        };
    }, [isLoading]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleContainerPointerDown = (e: PointerEvent) => {
            if (e.button !== 0 && e.pointerType === "mouse") return;
            interactionStartXRef.current = e.clientX;
            interactionStartYRef.current = e.clientY;
            interactionStartTimeRef.current = Date.now();
        };

        const handleContainerPointerUp = (e: PointerEvent) => {
            if (isPinchActiveRef.current) return;
            
            const deltaX = e.clientX - interactionStartXRef.current;
            const deltaY = e.clientY - interactionStartYRef.current;
            const distance = Math.hypot(deltaX, deltaY);
            const duration = Date.now() - interactionStartTimeRef.current;

            if (distance < 10 && duration < 300) {
                const target = e.target as HTMLElement;
                const isToolbarAction = target.closest("button") || target.closest("input");
                if (isToolbarAction) return;

                if (showToolbarRef.current) {
                    setShowToolbar(false);
                    if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
                } else {
                    handleUserInteraction();
                }
            }
        };

        const handleWheelScroll = (e: WheelEvent) => {
            if (e.ctrlKey) return;
            const dir = e.deltaY > 0 ? "down" : "up";
            if (dir === lastScrollDirRef.current) {
                scrollCountRef.current += 1;
            } else {
                lastScrollDirRef.current = dir;
                scrollCountRef.current = 1;
            }

            // Reveal toolbar if scrolling more than once in the same direction
            if (scrollCountRef.current >= 2) {
                handleUserInteraction();
            }
        };

        container.addEventListener("pointerdown", handleContainerPointerDown);
        container.addEventListener("pointerup", handleContainerPointerUp);
        container.addEventListener("wheel", handleWheelScroll);

        return () => {
            container.removeEventListener("pointerdown", handleContainerPointerDown);
            container.removeEventListener("pointerup", handleContainerPointerUp);
            container.removeEventListener("wheel", handleWheelScroll);
            if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
        };
    }, []);

    // Sync scale state to ref for touch gesture handler
    const scaleRef = useRef(scale);
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    // Mobile Pinch Gesture tracking for smooth zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let startDist = 0;
        let startScale = 1.0;
        let isPinching = false;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                isPinchActiveRef.current = true;
                isPinching = true;
                startDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                startScale = scaleRef.current;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isPinching && e.touches.length === 2) {
                e.preventDefault(); // prevent native scroll
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                if (startDist > 0) {
                    const factor = dist / startDist;
                    const newScale = Math.min(3.0, Math.max(0.6, startScale * factor));
                    setScale(newScale);
                    setZoomInput(Math.round(newScale * 100).toString());
                }
            }
        };

        const handleTouchEnd = () => {
            if (isPinching) {
                isPinching = false;
                setTimeout(() => {
                    isPinchActiveRef.current = false;
                }, 200);
            }
        };

        container.addEventListener("touchstart", handleTouchStart, { passive: true });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });
        container.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
            container.removeEventListener("touchend", handleTouchEnd);
        };
    }, []);

    // Helper: Calculate book dimensions fitting page aspect ratio exactly
    const getBookDimensions = () => {
        const hVal = forceLandscape ? window.innerWidth : window.innerHeight;
        const wVal = forceLandscape ? window.innerHeight : window.innerWidth;

        const padY = isMobile ? 8 : 180;
        const padX = isMobile ? 8 : 80;

        const availableHeight = hVal - padY;
        const availableWidth = wVal - padX;

        let height = availableHeight;
        let width = height / pageRatio;

        if (isDoubleLayout) {
            width = width * 2;
            if (width > availableWidth) {
                width = availableWidth;
                height = (width / 2) * pageRatio;
            }
        } else {
            if (width > availableWidth) {
                width = availableWidth;
                height = width * pageRatio;
            }
        }

        // Ensure width is even when in double page layout to prevent subpixel gaps
        let finalWidth = Math.round(width);
        if (isDoubleLayout && finalWidth % 2 !== 0) {
            finalWidth -= 1;
        }

        return {
            width: finalWidth,
            height: Math.round(height)
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

            const offscreen = document.createElement("canvas");
            offscreen.width = targetWidth;
            offscreen.height = targetHeight;
            
            const offscreenCtx = offscreen.getContext("2d");
            if (offscreenCtx) {
                offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

                const renderTask = page.render({
                    canvasContext: offscreenCtx,
                    viewport: finalViewport
                });
                renderTasksRef.current[taskKey] = renderTask;
                await renderTask.promise;
                delete renderTasksRef.current[taskKey];

                if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
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

    // Virtualization Helper: Keeps page canvas rendered if within view window
    const isPageActive = (pageNum: number) => {
        return pageNum >= currentPage - 3 && pageNum <= currentPage + 3;
    };

    // St.PageFlip initialization and management effect
    useEffect(() => {
        if (!pdf || isLoading) return;

        let active = true;
        let pageFlipInstance: any = null;

        const initPageFlip = async () => {
            // Wait a frame for React to mount page wrapper containers
            await new Promise((resolve) => requestAnimationFrame(resolve));
            if (!active || !bookContainerRef.current) return;

            try {
                const { PageFlip } = await import("page-flip");
                
                const dims = getBookDimensions();
                const pWidth = isDouble ? Math.round(dims.width / 2) : dims.width;
                const pHeight = dims.height;

                pageFlipInstance = new PageFlip(bookContainerRef.current, {
                    width: pWidth,
                    height: pHeight,
                    size: "stretch",
                    minWidth: 200,
                    maxWidth: 1500,
                    minHeight: 300,
                    maxHeight: 1500,
                    drawShadow: true,
                    maxShadowOpacity: 0.3,
                    showCover: isDouble,
                    usePortrait: !isDouble,
                    flippingTime: 850,
                    mobileScrollSupport: false,
                    clickEventForward: false
                });

                const pages = bookContainerRef.current.querySelectorAll(".st-page-wrapper");
                if (pages.length > 0) {
                    pageFlipInstance.loadFromHTML(pages);
                    
                    // Turn to current page (0-indexed)
                    pageFlipInstance.turnToPage(Math.min(currentPage - 1, numPages - 1));
                    
                    // Bind events
                    pageFlipInstance.on("flip", (e: any) => {
                        if (active) {
                            setCurrentPage(e.data + 1);
                        }
                    });

                    pageFlipRef.current = pageFlipInstance;
                    setIsPageFlipInit(true);
                }
            } catch (err) {
                console.error("Failed to initialize PageFlip:", err);
            }
        };

        setIsPageFlipInit(false);
        initPageFlip();

        return () => {
            active = false;
            if (pageFlipInstance) {
                try {
                    pageFlipInstance.destroy();
                } catch (e) {}
            }
            pageFlipRef.current = null;
        };
    }, [pdf, isLoading, isDouble, forceLandscape, numPages]);

    // Active pages renderer effect
    useEffect(() => {
        if (!pdf || isLoading || !isPageFlipInit) return;

        const startActive = Math.max(1, currentPage - 3);
        const endActive = Math.min(numPages, currentPage + 3);

        const dims = getBookDimensions();
        const pWidth = isDouble ? Math.round(dims.width / 2) : dims.width;
        const pHeight = dims.height;

        const renderWidth = Math.round(pWidth * debouncedScale);
        const renderHeight = Math.round(pHeight * debouncedScale);

        for (let pageNum = startActive; pageNum <= endActive; pageNum++) {
            const canvas = pageCanvasesRef.current[pageNum];
            if (canvas) {
                renderPageToCanvas(
                    pdf,
                    pageNum,
                    canvas,
                    renderWidth,
                    renderHeight,
                    `page-${pageNum}-${debouncedScale}`
                );
            }
        }
    }, [pdf, currentPage, isPageFlipInit, debouncedScale, isDouble, isMobile, forceLandscape, numPages]);

    // Helper functions for page turning
    const nextPage = () => {
        if (pageFlipRef.current) {
            pageFlipRef.current.flipNext();
        }
    };

    const prevPage = () => {
        if (pageFlipRef.current) {
            pageFlipRef.current.flipPrev();
        }
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
    }, [onClose]);

    // Custom text input zoom handlers
    const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setZoomInput(e.target.value);
    };

    const handleZoomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            applyCustomZoom();
        }
    };

    const applyCustomZoom = () => {
        const val = parseInt(zoomInput.replace(/%/g, ""), 10);
        if (!isNaN(val)) {
            const clamped = Math.min(300, Math.max(50, val));
            setScale(clamped / 100);
        } else {
            setZoomInput(Math.round(scale * 100).toString());
        }
    };

    // Double-click to zoom
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setScale((s) => (s > 1.05 ? 1.0 : 1.8));
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    const getPageRangeString = () => {
        if (!isDouble) return `Page ${currentPage} of ${numPages}`;
        if (currentPage === 1) return `Cover (Page 1 of ${numPages})`;
        const next = currentPage + 1;
        return next <= numPages ? `Pages ${currentPage}-${next} of ${numPages}` : `Page ${currentPage} of ${numPages}`;
    };

    const dims = getBookDimensions();
    const bookWidth = dims.width;
    const bookHeight = dims.height;
    const pageWidth = isDouble ? Math.round(bookWidth / 2) : bookWidth;

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col justify-between select-none transition-colors duration-500"
            style={{
                background: "radial-gradient(circle, rgba(13, 27, 42, 0.94) 0%, rgba(6, 12, 20, 0.98) 100%)",
                backdropFilter: "blur(35px)",
                WebkitBackdropFilter: "blur(35px)",
                ...(forceLandscape && isMobile ? {
                    width: "100vh",
                    height: "100vw",
                    transform: "translate(-50%, -50%) rotate(90deg)",
                    transformOrigin: "center center",
                    left: "50%",
                    top: "50%",
                    position: "fixed"
                } : {})
            }}
        >
            
            {/* Header Floating Glass Toolbar */}
            <div 
                className={`fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl px-6 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-between text-white z-50 shadow-2xl transition-all duration-500 ease-in-out ${
                    showToolbar ? "translate-y-0 opacity-100 scale-100" : "-translate-y-24 opacity-0 scale-95 pointer-events-none"
                }`}
            >
                <div className="flex flex-col min-w-0 pr-4">
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
                    
                    {/* Custom Text input to type custom zoom size percentage */}
                    <div className="flex items-center bg-white/5 px-2 py-0.5 rounded-md border border-white/10 w-[60px] justify-center">
                        <input
                            type="text"
                            value={zoomInput}
                            onChange={handleZoomInputChange}
                            onKeyDown={handleZoomInputKeyDown}
                            onBlur={applyCustomZoom}
                            className="text-[10px] sm:text-xs font-bold text-gray-300 w-8 text-center bg-transparent border-none outline-none focus:ring-0 focus:text-white p-0"
                            title="Set custom zoom % (Enter to apply)"
                        />
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 select-none">%</span>
                    </div>

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

            {/* Reader Stage (Scroll stage container) with 0.1% background opacity to guarantee 100% WebKit mobile touch hit-testing */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto relative"
                style={{ backgroundColor: "rgba(0,0,0,0.001)" }}
            >
                {/* Fixed Navigation Overlays */}
                <button
                    onClick={prevPage}
                    disabled={isLoading || currentPage === 1}
                    className="fixed left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-40 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <button
                    onClick={nextPage}
                    disabled={isLoading || (isDouble ? currentPage + 1 >= numPages : currentPage === numPages)}
                    className="fixed right-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-40 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Centering Wrapper with Generous Scroll Padding, letting zoomed-in readers scroll past margins */}
                <div className="flex items-center justify-center min-h-full min-w-full p-1 sm:p-2 md:p-4 relative">
                    {/* Spinner Overlay - displayed if loading or if St.PageFlip is still initializing */}
                    {(isLoading || !isPageFlipInit) && (
                        <div className="flex flex-col items-center gap-4 text-white z-40 bg-black/40 p-6 rounded-2xl backdrop-blur-md absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                            <span className="text-sm font-semibold tracking-wide animate-pulse">Loading magazine...</span>
                        </div>
                    )}

                    {/* Book container - mounted when PDF is loaded so PageFlip can access DOM elements */}
                    {!isLoading && (
                        /* Zoom Scroll Container Wrapper (GPU scale sizing container) */
                        <div
                            style={{
                                width: `${bookWidth * scale}px`,
                                height: `${bookHeight * scale}px`,
                                position: "relative",
                                transition: "width 350ms cubic-bezier(0.25, 1, 0.5, 1), height 350ms cubic-bezier(0.25, 1, 0.5, 1)",
                                visibility: isPageFlipInit ? "visible" : "hidden"
                            }}
                        >
                            {/* Scaled Book Element */}
                            <div
                                style={{
                                    width: `${bookWidth}px`,
                                    height: `${bookHeight}px`,
                                    transform: `scale(${scale}) translateX(${currentPage === 1 && isDouble ? -pageWidth / 2 : 0}px)`,
                                    transformOrigin: "top left",
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    transition: "width 350ms cubic-bezier(0.25, 1, 0.5, 1), height 350ms cubic-bezier(0.25, 1, 0.5, 1), transform 350ms cubic-bezier(0.25, 1, 0.5, 1)"
                                }}
                            >
                                {/* The container for PageFlip */}
                                <div 
                                    key={isDouble ? "double" : "single"}
                                    ref={bookContainerRef}
                                    className="st-pageflip-book"
                                    style={{
                                        margin: "auto",
                                        boxShadow: "0 30px 70px rgba(0,0,0,0.85)",
                                        backgroundColor: "#121212",
                                        pointerEvents: scale > 1.05 ? "none" : "auto"
                                    }}
                                    onDoubleClick={handleDoubleClick}
                                >
                                    {/* Render all pages */}
                                    {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                                        const active = isPageActive(pageNum);
                                        return (
                                            <div 
                                                key={pageNum}
                                                className="st-page-wrapper bg-[#151515] overflow-hidden select-none"
                                                data-density={isDouble && (pageNum === 1 || pageNum === numPages) ? "hard" : "soft"}
                                                style={{
                                                    width: `${pageWidth}px`,
                                                    height: `${bookHeight}px`
                                                }}
                                            >
                                                <div className="relative w-full h-full bg-[#151515] overflow-hidden flex items-center justify-center">
                                                    {active ? (
                                                        <canvas
                                                            ref={(el) => {
                                                                pageCanvasesRef.current[pageNum] = el;
                                                            }}
                                                            className="block w-full h-full object-fill"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                                                            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                                        </div>
                                                    )}
                                                    {/* Paper sheen overlay */}
                                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                                    
                                                    {/* Inner Crease Shadow when two pages are open */}
                                                    {isDoubleLayout && pageNum > 1 && pageNum < numPages && (
                                                        <div 
                                                            className={`absolute top-0 bottom-0 w-16 pointer-events-none z-10 ${
                                                                pageNum % 2 === 0
                                                                    ? "right-0 bg-gradient-to-l from-black/25 to-transparent" // Left side page: shadow on right
                                                                    : "left-0 bg-gradient-to-r from-black/25 to-transparent"  // Right side page: shadow on left
                                                            }`} 
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
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
                <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs font-semibold text-gray-300 tracking-wide select-none">{getPageRangeString()}</span>
                    
                    {/* Segmented Mode Selector Controls (both desktop & mobile layout controls) */}
                    <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                            onClick={() => {
                                setDoublePageMode(false);
                            }}
                            className={`p-1 px-2 rounded-md transition-all text-[10px] font-bold flex items-center gap-1.5 ${
                                !isDouble ? "bg-orange-500 text-white shadow-md" : "hover:bg-white/5 text-gray-400 hover:text-white"
                            }`}
                            title="Single Page Mode"
                        >
                            <Layers className="w-3.5 h-3.5" /> <span className="hidden sm:inline">1-Page</span>
                        </button>
                        <button
                            onClick={() => {
                                setDoublePageMode(true);
                            }}
                            className={`p-1 px-2 rounded-md transition-all text-[10px] font-bold flex items-center gap-1.5 ${
                                isDouble ? "bg-orange-500 text-white shadow-md" : "hover:bg-white/5 text-gray-400 hover:text-white"
                            }`}
                            title="Double Page Mode"
                        >
                            <BookOpen className="w-3.5 h-3.5" /> <span className="hidden sm:inline">2-Page</span>
                        </button>
                    </div>
                    
                    {isMobile && (
                        /* Force Landscape Orientation mode toggle */
                        <button
                            onClick={() => setForceLandscape(!forceLandscape)}
                            className={`p-1.5 active:scale-90 border rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold ${
                                forceLandscape ? "bg-orange-500/20 border-orange-500/30 text-orange-400" : "bg-white/10 border-white/10 text-white"
                            }`}
                            title={forceLandscape ? "Disable Forced Landscape" : "Force Landscape Mode"}
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={prevPage}
                        disabled={isLoading || currentPage === 1}
                        className="p-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 rounded-full sm:rounded-xl flex items-center justify-center gap-1 font-bold text-xs border border-white/5 active:scale-95 transition-all text-white shadow-md cursor-pointer"
                        title="Previous Page"
                    >
                        <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Prev</span>
                    </button>
                    <button
                        onClick={nextPage}
                        disabled={isLoading || (isDouble ? currentPage + 1 >= numPages : currentPage === numPages)}
                        className="p-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 rounded-full sm:rounded-xl flex items-center justify-center gap-1 font-bold text-xs border border-white/5 active:scale-95 transition-all text-white shadow-md cursor-pointer"
                        title="Next Page"
                    >
                        <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4" />
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

                .st-pageflip-book {
                    display: block;
                    box-sizing: border-box;
                }

                .st-page-wrapper {
                    display: none;
                }
            `}</style>
        </div>
    );
}
