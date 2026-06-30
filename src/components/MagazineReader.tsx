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
    const interactionStartTargetRef = useRef<HTMLElement | null>(null);

    // Sync state values to references to prevent event listener re-bindings and clearTimeout cancellations
    const showToolbarRef = useRef(showToolbar);
    
    useEffect(() => { showToolbarRef.current = showToolbar; }, [showToolbar]);

    // Calculated layout mode based on device, manual toggle, and forced landscape rotation
    const isDouble = doublePageMode || forceLandscape;
    const isDoubleLayout = isDouble; // Strictly bound to double-page mode to prevent mid-flip shrinking

    // 1. Detect Screen Size & Orientation & Set Default Mobile Reading Mode (2-pager Landscape)
    const hasDefaultedMobileRef = useRef<boolean>(false);
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            setIsLandscape(window.innerWidth > window.innerHeight);

            // Change default reading mode on mobile to 2-pager landscape by default
            if (mobile && !hasDefaultedMobileRef.current) {
                hasDefaultedMobileRef.current = true;
                setForceLandscape(true);
            }
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
            interactionStartTargetRef.current = e.target as HTMLElement;
        };

        const handleContainerPointerUp = (e: PointerEvent) => {
            if (isPinchActiveRef.current) return;
            
            const deltaX = e.clientX - interactionStartXRef.current;
            const deltaY = e.clientY - interactionStartYRef.current;
            const distance = Math.hypot(deltaX, deltaY);
            const duration = Date.now() - interactionStartTimeRef.current;

            const startTarget = interactionStartTargetRef.current;
            const startInsideBook = !!startTarget?.closest(".st-pageflip-book");

            // 1. Swipe Gesture Page Turning (Linear touch swiping)
            // Swiping to turn pages should only happen if the swipe started inside the magazine
            const isSwipe = distance > 30 && duration < 350;
            if (isSwipe && startInsideBook) {
                const useRotatedCoords = isMobile && forceLandscape;
                const deltaVal = useRotatedCoords ? deltaY : deltaX;
                const crossDeltaVal = useRotatedCoords ? deltaX : deltaY;

                // Ensure swipe is horizontal relative to the book orientation
                if (Math.abs(deltaVal) > Math.abs(crossDeltaVal) * 1.2) {
                    const canFlipNext = !isLoading && (isDouble ? currentPage + 1 < numPages : currentPage < numPages);
                    const canFlipPrev = !isLoading && currentPage > 1;

                    if (deltaVal > 0 && canFlipPrev) {
                        prevPage();
                        // Swipe touches should not trigger the toolbar to come back (stay hidden)
                        if (showToolbarRef.current) {
                            handleUserInteraction();
                        }
                        return;
                    }
                    if (deltaVal < 0 && canFlipNext) {
                        nextPage();
                        // Swipe touches should not trigger the toolbar to come back (stay hidden)
                        if (showToolbarRef.current) {
                            handleUserInteraction();
                        }
                        return;
                    }
                }
            }

            // 2. Click/Tap Interaction (taps/clicks must have very little movement)
            if (distance < 10 && duration < 300) {
                const target = e.target as HTMLElement;
                const isToolbarAction = target.closest("button") || target.closest("input");
                if (isToolbarAction) return;

                if (!startInsideBook) {
                    // Touching in the black area outside the magazine triggers the toolbox to appear/toggle
                    if (showToolbarRef.current) {
                        setShowToolbar(false);
                        if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
                    } else {
                        handleUserInteraction();
                    }
                    return;
                }

                // If touched/clicked inside the pages, page turns should happen ONLY if clicked on the 30% left/right edges of the screen/viewport
                const useRotatedCoords = isMobile && forceLandscape;
                const clientVal = useRotatedCoords ? e.clientY : e.clientX;
                const limitVal = useRotatedCoords ? window.innerHeight : window.innerWidth;

                const canFlipNext = !isLoading && (isDouble ? currentPage + 1 < numPages : currentPage < numPages);
                const canFlipPrev = !isLoading && currentPage > 1;

                if (clientVal < limitVal * 0.30 && canFlipPrev) {
                    prevPage();
                    if (showToolbarRef.current) handleUserInteraction();
                    return;
                }
                if (clientVal > limitVal * 0.70 && canFlipNext) {
                    nextPage();
                    if (showToolbarRef.current) handleUserInteraction();
                    return;
                }
                // Clicking in the middle (between 30% and 70%) of the magazine does absolutely nothing
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
    }, [isLoading, isDouble, currentPage, numPages, isMobile]);

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
            if (e.touches.length >= 2) {
                isPinchActiveRef.current = true;
                isPinching = true;
                startDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                startScale = scaleRef.current;
                e.stopPropagation(); // Stop propagation down to page-flip children
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length >= 2) {
                e.stopPropagation(); // Stop propagation down to page-flip children
            }
            if (isPinching && e.touches.length === 2) {
                e.preventDefault(); // prevent native scroll
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                if (startDist > 0) {
                    const factor = dist / startDist;
                    // Apply a damping factor (0.35) to prevent overly sensitive zoom jumps
                    const damping = 0.35;
                    const dampedFactor = 1 + (factor - 1) * damping;
                    const newScale = Math.min(3.0, Math.max(0.6, startScale * dampedFactor));
                    setScale(newScale);
                    setZoomInput(Math.round(newScale * 100).toString());
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (isPinching) {
                isPinching = false;
                setTimeout(() => {
                    isPinchActiveRef.current = false;
                }, 200);
                e.stopPropagation(); // Stop propagation down to page-flip children
            }
        };

        container.addEventListener("touchstart", handleTouchStart, { capture: true, passive: false });
        container.addEventListener("touchmove", handleTouchMove, { capture: true, passive: false });
        container.addEventListener("touchend", handleTouchEnd, { capture: true, passive: false });

        return () => {
            container.removeEventListener("touchstart", handleTouchStart, { capture: true });
            container.removeEventListener("touchmove", handleTouchMove, { capture: true });
            container.removeEventListener("touchend", handleTouchEnd, { capture: true });
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
        let width = (height / pageRatio) * 2;

        if (width > availableWidth) {
            width = availableWidth;
            height = (width / 2) * pageRatio;
        }

        // Ensure width is even to prevent subpixel gaps
        let finalWidth = Math.round(width);
        if (finalWidth % 2 !== 0) {
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
            
            const dpr = window.devicePixelRatio || 1;
            const qualityMultiplier = 1.5; // Boost resolution by 1.5x for print-quality sharp text
            const renderScale = fitScale * dpr * qualityMultiplier;
            const finalViewport = page.getViewport({ scale: renderScale });
            
            const targetWidth = Math.round(finalViewport.width);
            const targetHeight = Math.round(finalViewport.height);

            const offscreen = document.createElement("canvas");
            offscreen.width = targetWidth;
            offscreen.height = targetHeight;
            
            const offscreenCtx = offscreen.getContext("2d");
            if (offscreenCtx) {
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
                const pWidth = Math.round(dims.width / 2);
                const pHeight = dims.height;

                pageFlipInstance = new PageFlip(bookContainerRef.current, {
                    width: pWidth,
                    height: pHeight,
                    size: "fixed",
                    autoSize: false,
                    minWidth: isDouble ? 200 : 99999,
                    maxWidth: 1500,
                    minHeight: 300,
                    maxHeight: 1500,
                    drawShadow: true,
                    maxShadowOpacity: 0.3,
                    showCover: isDouble,
                    usePortrait: !isDouble,
                    flippingTime: 850,
                    useMouseEvents: true,
                    showPageCorners: false,
                    disableFlipByClick: true,
                    mobileScrollSupport: false,
                    clickEventForward: true
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
        const pWidth = Math.round(dims.width / 2);
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
    const pageWidth = Math.round(bookWidth / 2);

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col justify-between select-none transition-colors duration-500"
            style={{
                backgroundColor: "#000000",
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
                    <span className="font-bold text-xs sm:text-sm text-[#00A8E8] tracking-wide uppercase whitespace-normal">{magazine.title}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{magazine.issueMonth} {magazine.issueYear}</span>
                </div>

                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/30 active:scale-90 flex-shrink-0"
                    title="Close Reader"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Reader Stage (Scroll stage container) with 0.1% background opacity to guarantee 100% WebKit mobile touch hit-testing */}
            <div
                ref={containerRef}
                className={`flex-1 relative ${scale > 1.05 ? "overflow-auto" : "overflow-hidden"}`}
                style={{ 
                    backgroundColor: "rgba(0,0,0,0.001)",
                    overflowAnchor: "none"
                }}
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
                                width: `${(isDouble ? bookWidth : bookWidth - 1) * scale}px`,
                                height: `${bookHeight * scale}px`,
                                position: "relative",
                                transition: "width 350ms cubic-bezier(0.25, 1, 0.5, 1), height 350ms cubic-bezier(0.25, 1, 0.5, 1)",
                                visibility: isPageFlipInit ? "visible" : "hidden"
                            }}
                        >
                            {/* Scaled Book Element */}
                            <div
                                style={{
                                    width: `${isDouble ? bookWidth : bookWidth - 1}px`,
                                    height: `${bookHeight}px`,
                                    transform: `scale(${scale}) translateX(${currentPage === 1 && isDouble ? -pageWidth / 2 : (currentPage === numPages && isDouble ? (numPages % 2 === 0 ? pageWidth / 2 : -pageWidth / 2) : 0)}px)`,
                                    transformOrigin: "top left",
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    transition: "transform 350ms cubic-bezier(0.25, 1, 0.5, 1)"
                                }}
                            >
                                {/* The container for PageFlip */}
                                <div 
                                    key={isDouble ? (forceLandscape ? "double-landscape" : "double-portrait") : "single"}
                                    ref={bookContainerRef}
                                    className="st-pageflip-book"
                                    style={{
                                        width: `${isDouble ? bookWidth : bookWidth - 1}px`,
                                        height: `${bookHeight}px`,
                                        margin: "auto",
                                        boxShadow: "0 30px 70px rgba(0,0,0,0.85)",
                                        backgroundColor: "#000000",
                                        pointerEvents: "auto"
                                    }}
                                >
                                    {/* Render all pages */}
                                    {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                                        const active = isPageActive(pageNum);
                                        return (
                                            <div 
                                                key={pageNum}
                                                className="st-page-wrapper bg-white overflow-hidden select-none"
                                                data-density={isDouble && (pageNum === 1 || pageNum === numPages) ? "hard" : "soft"}
                                                style={{
                                                    width: `${pageWidth}px`,
                                                    height: `${bookHeight}px`
                                                }}
                                            >
                                                <div className="relative w-full h-full bg-white overflow-hidden flex items-center justify-center">
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
                className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-3 sm:px-5 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col items-center gap-2 text-white z-50 shadow-2xl transition-all duration-500 ease-in-out w-fit max-w-[95%] ${
                    showToolbar ? "translate-y-0 opacity-100 scale-100" : "translate-y-24 opacity-0 scale-95 pointer-events-none"
                }`}
            >
                {/* Row 1: Main controls */}
                <div className="flex items-center gap-2 sm:gap-4 select-none">
                    {/* Page Navigation */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevPage}
                            disabled={isLoading || currentPage === 1}
                            className="p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all active:scale-90"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-300" />
                        </button>
                        
                        <span className="text-xs font-semibold text-gray-300 select-none min-w-[45px] sm:min-w-[55px] text-center">
                            {currentPage} / {numPages}
                        </span>

                        <button
                            onClick={nextPage}
                            disabled={isLoading || (isDouble ? currentPage + 1 >= numPages : currentPage === numPages)}
                            className="p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all active:scale-90"
                            title="Next Page"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                        </button>
                    </div>

                    <div className="h-4 w-[1px] bg-white/10" />

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
                            className="p-1.5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-4 h-4 text-gray-300" />
                        </button>

                        <div className="flex items-center bg-white/5 px-2 py-0.5 rounded-md border border-white/10 w-[55px] justify-center select-none">
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
                            className="p-1.5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-4 h-4 text-gray-300" />
                        </button>
                    </div>

                    <div className="h-4 w-[1px] bg-white/10" />

                    {/* Layout Mode Toggle */}
                    <button
                        onClick={() => setDoublePageMode(!doublePageMode)}
                        className="p-1.5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                        title={isDouble ? "Switch to 1-Page Layout" : "Switch to 2-Page Layout"}
                    >
                        {isDouble ? <Layers className="w-4 h-4 text-gray-300" /> : <BookOpen className="w-4 h-4 text-gray-300" />}
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                        title="Toggle Fullscreen"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-300" /> : <Maximize2 className="w-4 h-4 text-gray-300" />}
                    </button>
                </div>

                {/* Row 2: Portrait/Landscape selector (Mobile 2-Pager only) */}
                {isMobile && isDouble && (
                    <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 text-[10px] font-bold select-none mt-1">
                        <button
                            onClick={() => setForceLandscape(false)}
                            className={`px-3 py-1 rounded-md transition-all ${
                                !forceLandscape ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Portrait
                        </button>
                        <button
                            onClick={() => setForceLandscape(true)}
                            className={`px-3 py-1 rounded-md transition-all ${
                                forceLandscape ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Landscape
                        </button>
                    </div>
                )}
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
