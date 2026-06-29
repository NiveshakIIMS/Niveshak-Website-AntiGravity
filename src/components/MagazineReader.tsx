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

    // Responsive Mobile Controls (2-page layout active by default on mobile)
    const [mobileDoublePage, setMobileDoublePage] = useState<boolean>(true);
    const [isLandscape, setIsLandscape] = useState<boolean>(false);
    const [forceLandscape, setForceLandscape] = useState<boolean>(false);

    // Editable Zoom State
    const [zoomInput, setZoomInput] = useState<string>("100");

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

    // Scroll Activity trackers for toolbar triggers
    const lastScrollDirRef = useRef<"up" | "down" | null>(null);
    const scrollCountRef = useRef<number>(0);

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

    // Pinch zoom isolation state
    const isPinchActiveRef = useRef<boolean>(false);

    // Unified pointer interaction tracking refs
    const interactionStartXRef = useRef<number>(0);
    const interactionStartYRef = useRef<number>(0);
    const interactionStartTimeRef = useRef<number>(0);

    // Sync state values to references to prevent event listener re-bindings and clearTimeout cancellations
    const isFlippingRef = useRef(isFlipping);
    const isDraggingRef = useRef(isDragging);
    const showToolbarRef = useRef(showToolbar);
    
    useEffect(() => { isFlippingRef.current = isFlipping; }, [isFlipping]);
    useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
    useEffect(() => { showToolbarRef.current = showToolbar; }, [showToolbar]);

    // Calculated layout mode based on device, manual toggle, orientation, and forced landscape rotation
    const isDouble = !isMobile || mobileDoublePage || (isMobile && isLandscape) || forceLandscape;
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
            if (!isFlippingRef.current && !isDraggingRef.current) {
                setShowToolbar(false);
            }
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
            const pageWidth = isDouble ? (dims.width / 2) : dims.width;
            const pageHeight = dims.height;

            if (!isDouble) {
                if (canvasRightRef.current) {
                    await renderPageToCanvas(pdf, currentPage, canvasRightRef.current, pageWidth, pageHeight, "rightStatic");
                }
            } else {
                const renderPromises = [];
                if (currentPage === 1) {
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
    }, [pdf, currentPage, scale, isMobile, isFlipping, isLoading, pageRatio, mobileDoublePage, isLandscape, forceLandscape]);

    // 5. Trigger Flip Turn Animation
    const startFlip = async (dir: "next" | "prev") => {
        if (isFlipping || isLoading || !pdf) return;

        const dims = getBookDimensions();
        const pageWidth = isDoubleLayout ? (dims.width / 2) : dims.width;
        const pageHeight = dims.height;

        setDirection(dir);
        setIsAnimating(false);
        setFlipAngle(dir === "next" ? 0 : -180);

        if (dir === "next") {
            const currentRight = isDouble ? (currentPage === 1 ? 1 : currentPage + 1) : currentPage;
            const targetLeft = isDouble ? (currentPage === 1 ? 2 : currentPage + 2) : currentPage + 1;
            const targetRight = targetLeft + 1;

            const renderPromises = [
                canvasFlipFrontRef.current ? renderPageToCanvas(pdf, currentRight, canvasFlipFrontRef.current, pageWidth, pageHeight, "flipFront") : Promise.resolve(),
                canvasFlipBackRef.current ? renderPageToCanvas(pdf, targetLeft, canvasFlipBackRef.current, pageWidth, pageHeight, "flipBack") : Promise.resolve(),
                (canvasRightRef.current && targetRight <= numPages && isDouble) ? renderPageToCanvas(pdf, targetRight, canvasRightRef.current, pageWidth, pageHeight, "rightStatic") : Promise.resolve(),
                (canvasRightRef.current && !isDouble && targetLeft <= numPages) ? renderPageToCanvas(pdf, targetLeft, canvasRightRef.current, pageWidth, pageHeight, "rightStatic") : Promise.resolve()
            ];
            await Promise.all(renderPromises);

            setIsFlipping(true);

            setTimeout(() => {
                if (canvasLeftRef.current && targetLeft <= numPages && isDouble) {
                    renderPageToCanvas(pdf, targetLeft, canvasLeftRef.current, pageWidth, pageHeight, "leftStatic");
                }
            }, 350);
        } else {
            const targetLeft = isDouble ? (currentPage === 2 ? 1 : currentPage - 2) : currentPage - 1;
            const targetRight = targetLeft + 1;

            const renderPromises = [
                canvasFlipBackRef.current ? renderPageToCanvas(pdf, currentPage, canvasFlipBackRef.current, pageWidth, pageHeight, "flipBack") : Promise.resolve(),
                canvasFlipFrontRef.current ? renderPageToCanvas(pdf, targetRight, canvasFlipFrontRef.current, pageWidth, pageHeight, "flipFront") : Promise.resolve(),
                (canvasLeftRef.current && targetLeft > 1 && isDouble) ? renderPageToCanvas(pdf, targetLeft, canvasLeftRef.current, pageWidth, pageHeight, "leftStatic") : Promise.resolve(),
                (canvasRightRef.current && !isDouble) ? renderPageToCanvas(pdf, targetLeft, canvasRightRef.current, pageWidth, pageHeight, "rightStatic") : Promise.resolve()
            ];
            await Promise.all(renderPromises);

            setIsFlipping(true);

            setTimeout(() => {
                if (canvasRightRef.current && targetRight <= numPages && isDouble) {
                    renderPageToCanvas(pdf, targetRight, canvasRightRef.current, pageWidth, pageHeight, "rightStatic");
                }
            }, 350);
        }

        setTimeout(() => {
            setIsAnimating(true);
            setFlipAngle(dir === "next" ? -180 : 0);
        }, 50);
    };

    const handleAnimationComplete = () => {
        if (!isFlipping) return;

        if (direction === "next") {
            const targetPg = isDouble 
                ? (currentPage === 1 ? 2 : currentPage + 2)
                : currentPage + 1;
            setCurrentPage(targetPg);
        } else {
            const targetPg = isDouble 
                ? (currentPage === 2 ? 1 : currentPage - 2)
                : currentPage - 1;
            setCurrentPage(targetPg);
        }

        setIsAnimating(false);
        setIsFlipping(false);
        setFlipAngle(0);
    };

    const nextPage = () => {
        const isLastPage = isDouble ? currentPage + 1 >= numPages : currentPage === numPages;
        if (isLastPage) return;
        startFlip("next");
    };

    const prevPage = () => {
        if (currentPage === 1) return;
        startFlip("prev");
    };

    // 6. Interactive Drag-to-Flip Physics Handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        if (isFlipping || isLoading || isDragging || isPinchActiveRef.current) return;

        const wrapper = bookWrapperRef.current;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        let side: "next" | "prev" | null = null;
        if (clickX > width * 0.7) {
            side = "next";
        } else if (clickX < width * 0.3) {
            side = "prev";
        }

        if (!side) return;

        const isLastPage = isDouble ? currentPage + 1 >= numPages : currentPage === numPages;
        if (side === "next" && isLastPage) return;
        if (side === "prev" && currentPage === 1) return;

        setIsDragging(true);
        dragStartXRef.current = e.clientX;
        dragCurrentXRef.current = e.clientX;

        // Only capture pointer focus on standard flat zoom modes to prevent panning scroll lockups
        if (scale <= 1.0) {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || isPinchActiveRef.current) return;
        dragCurrentXRef.current = e.clientX;
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging || isPinchActiveRef.current) return;
        setIsDragging(false);
        
        if (scale <= 1.0) {
            try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            } catch (err) {}
        }

        const deltaX = dragCurrentXRef.current - dragStartXRef.current;
        const dragDistance = Math.abs(deltaX);

        // Zoomed swipe navigation overlay: if zoomed in, let swiping at the edges turn the pages!
        if (scale > 1.0 && dragDistance > 60) {
            const container = containerRef.current;
            if (container) {
                const scrollLeft = container.scrollLeft;
                const maxScroll = container.scrollWidth - container.clientWidth;
                
                // Swipe right at left edge -> Page Prev
                if (deltaX > 60 && scrollLeft <= 15) {
                    prevPage();
                    return;
                }
                // Swipe left at right edge -> Page Next
                if (deltaX < -60 && scrollLeft >= maxScroll - 15) {
                    nextPage();
                    return;
                }
            }
            return;
        }

        // Tap Click turn navigation
        if (dragDistance < 15) {
            const rect = bookWrapperRef.current?.getBoundingClientRect();
            if (rect) {
                // If forced mobile landscape mode, evaluate coordinates vertically along Y axis (rotated 90deg)
                if (forceLandscape && isMobile) {
                    const clickY = e.clientY - rect.top;
                    if (clickY < rect.height / 2) {
                        prevPage();
                    } else {
                        nextPage();
                    }
                } else {
                    const clickX = e.clientX - rect.left;
                    if (clickX < rect.width / 2) {
                        prevPage();
                    } else {
                        nextPage();
                    }
                }
            }
            return;
        }

        // Flat view drag swipes
        if (scale <= 1.0) {
            const threshold = window.innerWidth * 0.15;
            if (dragDistance > threshold) {
                if (deltaX < 0) {
                    nextPage();
                } else {
                    prevPage();
                }
            }
        }
    };

    const handlePointerCancel = (e: React.PointerEvent) => {
        setIsDragging(false);
        if (e.target) {
            try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            } catch (err) {}
        }
    };

    // 7. Stable Touch-Zoom Effect (with pinch-zoom collision isolation)
    const scaleRef = useRef(scale);
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                isPinchActiveRef.current = true;
                setIsDragging(false);
                
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialTouchDistanceRef.current = dist;
                initialScaleRef.current = scaleRef.current;
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
                    const needsCoverShift = isDouble && currentPage === 1 && !isFlipping;
                    const dims = getBookDimensions();
                    const pageWidth = isDouble ? (dims.width / 2) : dims.width;
                    const shiftX = needsCoverShift ? -pageWidth / 2 : 0;
                    
                    wrapper.style.transform = `translateX(${shiftX}px) scale(${ratio})`;
                    wrapper.style.transformOrigin = "center center";
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
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

            if (e.touches.length === 0) {
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
    }, [currentPage, isFlipping, isMobile, isDouble, forceLandscape]);

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

    // 8. Double-click to zoom
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
    }, [pdf, currentPage, isLoading, isFlipping, mobileDoublePage, isLandscape, forceLandscape]);

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
    
    // Fix: pageWidth is always halved on desktop double page layout
    const pageWidth = isDouble ? (bookWidth / 2) : bookWidth;

    const showLeftPage = isDouble && (currentPage > 1 || isFlipping);

    // Keep the cover page only in center (without any black bars beside it, hide them)
    const currentBookWidth = (isDouble && currentPage === 1 && !isFlipping) ? pageWidth : bookWidth;

    // Peak page curl skew value in mid-flight (skew peaks at 90deg, 0 at flat points)
    const progress = Math.abs(flipAngle) / 180;
    const skewY = Math.sin(progress * Math.PI) * 4.0; // 4.0 degree bend curl skew

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
                    disabled={isLoading || currentPage === 1 || isFlipping}
                    className="fixed left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-40 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <button
                    onClick={nextPage}
                    disabled={isLoading || (isDouble ? currentPage + 1 >= numPages : currentPage === numPages) || isFlipping}
                    className="fixed right-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 disabled:opacity-0 disabled:pointer-events-none text-white rounded-full transition-all duration-300 border border-white/10 hover:border-orange-500 hover:scale-110 z-40 shadow-2xl hidden md:flex items-center justify-center group"
                >
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Centering Wrapper with Generous Scroll Padding, letting zoomed-in readers scroll past margins */}
                <div className="flex items-center justify-center min-h-full min-w-full p-1 sm:p-20 md:p-36">
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
                                width: `${currentBookWidth}px`,
                                height: `${bookHeight}px`,
                                perspective: "2500px",
                                transformStyle: "preserve-3d",
                                transition: "width 800ms cubic-bezier(0.25, 1, 0.5, 1), transform 800ms cubic-bezier(0.25, 1, 0.5, 1)"
                            }}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                            onDoubleClick={handleDoubleClick}
                        >
                            {/* LEFT STATIC PAGE */}
                            <div 
                                className="relative overflow-hidden transition-all duration-300"
                                style={{
                                    width: `${pageWidth}px`,
                                    height: `${bookHeight}px`,
                                    display: showLeftPage ? "block" : "none",
                                    boxShadow: showLeftPage ? "-1px 0px 0px #e5e5e5, -2px 0px 0px #dbdbdb, -3px 0px 0px #d1d1d1, -4px 0px 0px #c7c7c7, -10px 0px 20px rgba(0,0,0,0.3)" : "none"
                                }}
                            >
                                <canvas ref={canvasLeftRef} className="block mx-auto" />
                                <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                
                                {/* Inner Crease Shadow */}
                                {showLeftPage && (
                                    <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-black/20 to-transparent pointer-events-none z-10" />
                                )}

                                {/* Static Page Flip Shadow Overlay */}
                                {isFlipping && isAnimating && (
                                    <div 
                                        className={`absolute inset-0 pointer-events-none z-30 ${
                                            direction === "next" ? "animate-shadow-left-reveal" : "animate-shadow-left-hide"
                                        }`}
                                    />
                                )}
                            </div>

                            {/* RIGHT STATIC PAGE */}
                            <div 
                                className="relative overflow-hidden transition-all duration-300"
                                style={{
                                    width: `${pageWidth}px`,
                                    height: `${bookHeight}px`,
                                    display: (isMobile || currentPage + 1 <= numPages || isFlipping || currentPage === 1 || !isDouble) ? "block" : "none",
                                    boxShadow: (!isDouble || currentPage === 1) ? "0 0 15px rgba(0,0,0,0.3)" : "1px 0px 0px #e5e5e5, 2px 0px 0px #dbdbdb, 3px 0px 0px #d1d1d1, 4px 0px 0px #c7c7c7, 10px 0px 20px rgba(0,0,0,0.3)"
                                }}
                            >
                                <canvas ref={canvasRightRef} className="block mx-auto" />
                                <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                
                                {/* Inner Crease Shadow */}
                                {isDoubleLayout && currentPage > 1 && (
                                    <div className="absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-10" />
                                )}
                                
                                {/* Realistic Hardcover Book Shading Overlay for Page 1 (Cover Page) */}
                                {currentPage === 1 && !isFlipping && (
                                    <>
                                        {/* Realistic Spine highlight and hinge crease shadow without blocking page text */}
                                        <div 
                                            className="absolute inset-y-0 left-0 w-[45px] pointer-events-none z-20"
                                            style={{
                                                background: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.02) 2%, rgba(255,255,255,0.08) 5%, rgba(0,0,0,0.38) 8%, rgba(0,0,0,0.15) 12%, rgba(0,0,0,0.05) 18%, rgba(0,0,0,0) 35%)"
                                            }}
                                        />
                                        {/* Deep spine crease accent line */}
                                        <div className="absolute inset-y-0 left-[8%] w-[1px] bg-black/15 pointer-events-none z-20" />
                                        {/* Soft glare gloss sweep across cover */}
                                        <div 
                                            className="absolute inset-y-0 left-0 right-0 pointer-events-none z-25"
                                            style={{
                                                background: "linear-gradient(115deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0) 45%)"
                                            }}
                                        />
                                        {/* Soft right page boundary edge shadow */}
                                        <div className="absolute inset-y-0 right-0 w-[1px] bg-black/20 z-20 pointer-events-none" />
                                    </>
                                )}

                                {/* Static Page Flip Shadow Overlay */}
                                {isFlipping && isAnimating && (
                                    <div 
                                        className={`absolute inset-0 pointer-events-none z-30 ${
                                            direction === "next" ? "animate-shadow-right-hide" : "animate-shadow-right-reveal"
                                        }`}
                                    />
                                )}
                            </div>

                            {/* 3D FLIPPING SHEET OVERLAY (Unified Right-Hinged 3D Hinge Model) */}
                            <div
                                className={`absolute top-2 bottom-2 z-30 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ${
                                    isAnimating 
                                        ? (direction === "next" ? "animate-flip-next" : "animate-flip-prev") 
                                        : ""
                                }`}
                                style={{
                                    width: `${pageWidth}px`,
                                    left: isDouble ? "50%" : "0px",
                                    transformOrigin: "left center",
                                    transformStyle: "preserve-3d",
                                    pointerEvents: "none",
                                    visibility: isFlipping ? "visible" : "hidden",
                                    opacity: isFlipping ? 1 : 0,
                                    transform: !isAnimating ? `rotateY(${direction === "next" ? 0 : -180}deg) rotateZ(0deg) skewY(0deg)` : undefined
                                }}
                                onAnimationEnd={handleAnimationComplete}
                            >
                                {/* FRONT FACE */}
                                <div className="absolute inset-0 bg-white backface-hidden z-20 shadow-2xl">
                                    <canvas ref={canvasFlipFrontRef} className="block w-full h-full" />
                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />
                                    
                                    {/* Cover Crease Shadow on Flipping Front (Cover) */}
                                    {currentPage === 1 && (
                                        <>
                                            <div 
                                                className="absolute inset-y-0 left-0 w-[45px] pointer-events-none z-20"
                                                style={{
                                                    background: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.02) 2%, rgba(255,255,255,0.08) 5%, rgba(0,0,0,0.38) 8%, rgba(0,0,0,0.15) 12%, rgba(0,0,0,0.05) 18%, rgba(0,0,0,0) 35%)"
                                                }}
                                            />
                                            <div className="absolute inset-y-0 left-[8%] w-[1px] bg-black/15 pointer-events-none z-20" />
                                        </>
                                    )}

                                    {/* Crease shadow sweep */}
                                    {isAnimating && (
                                        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden" style={{ mixBlendMode: "multiply" }}>
                                            <div 
                                                className={`absolute inset-y-0 w-[200%] ${
                                                    direction === "next" ? "animate-sweep-next" : "animate-sweep-prev"
                                                }`}
                                                style={{
                                                    background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.35) 48%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.4) 52%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0) 100%)"
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="absolute top-0 bottom-0 w-4 pointer-events-none z-10 right-0 bg-gradient-to-l from-black/5 to-transparent" />
                                </div>

                                {/* BACK FACE */}
                                <div 
                                    className="absolute inset-0 bg-white backface-hidden z-10 shadow-2xl"
                                    style={{ transform: "rotateY(180deg)" }}
                                >
                                    <canvas ref={canvasFlipBackRef} className="block w-full h-full" />
                                    <div className="absolute inset-0 magazine-gloss pointer-events-none z-20" />

                                    {/* Crease shadow sweep */}
                                    {isAnimating && (
                                        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden" style={{ mixBlendMode: "multiply" }}>
                                            <div 
                                                className={`absolute inset-y-0 w-[200%] ${
                                                    direction === "next" ? "animate-sweep-next" : "animate-sweep-prev"
                                                }`}
                                                style={{
                                                    background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.35) 48%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.4) 52%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0) 100%)"
                                                }}
                                            />
                                        </div>
                                    )}
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
                <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs font-semibold text-gray-300 tracking-wide select-none">{getPageRangeString()}</span>
                    
                    {/* Segmented Mode Selector Controls (both desktop & mobile layout controls) */}
                    <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                            onClick={() => {
                                setMobileDoublePage(false);
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
                                setMobileDoublePage(true);
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
                        disabled={isLoading || currentPage === 1 || isFlipping}
                        className="p-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 rounded-full sm:rounded-xl flex items-center justify-center gap-1 font-bold text-xs border border-white/5 active:scale-95 transition-all text-white shadow-md cursor-pointer"
                        title="Previous Page"
                    >
                        <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Prev</span>
                    </button>
                    <button
                        onClick={nextPage}
                        disabled={isLoading || (isDouble ? currentPage + 1 >= numPages : currentPage === numPages) || isFlipping}
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
                
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }

                /* Realistic 3D Page Turn Keyframes */
                @keyframes flip-next-anim {
                    0% {
                        transform: rotateY(0deg) rotateZ(0deg) skewY(0deg) scale(1);
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                    30% {
                        transform: rotateY(-54deg) rotateZ(-2.5deg) skewY(-5deg) scale(0.98) translateX(-2px);
                        box-shadow: 0 15px 35px rgba(0,0,0,0.4);
                    }
                    50% {
                        transform: rotateY(-90deg) rotateZ(0deg) skewY(-7deg) scale(0.96) translateX(-4px);
                        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                    }
                    70% {
                        transform: rotateY(-126deg) rotateZ(2.5deg) skewY(-5deg) scale(0.98) translateX(-2px);
                        box-shadow: 0 15px 35px rgba(0,0,0,0.4);
                    }
                    100% {
                        transform: rotateY(-180deg) rotateZ(0deg) skewY(0deg) scale(1);
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                }

                @keyframes flip-prev-anim {
                    0% {
                        transform: rotateY(-180deg) rotateZ(0deg) skewY(0deg) scale(1);
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                    30% {
                        transform: rotateY(-126deg) rotateZ(2.5deg) skewY(5deg) scale(0.98) translateX(2px);
                        box-shadow: 0 15px 35px rgba(0,0,0,0.4);
                    }
                    50% {
                        transform: rotateY(-90deg) rotateZ(0deg) skewY(7deg) scale(0.96) translateX(4px);
                        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                    }
                    70% {
                        transform: rotateY(-54deg) rotateZ(-2.5deg) skewY(5deg) scale(0.98) translateX(2px);
                        box-shadow: 0 15px 35px rgba(0,0,0,0.4);
                    }
                    100% {
                        transform: rotateY(0deg) rotateZ(0deg) skewY(0deg) scale(1);
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                }

                .animate-flip-next {
                    animation: flip-next-anim 900ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }

                .animate-flip-prev {
                    animation: flip-prev-anim 900ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }

                /* Crease shadow sweep animations */
                @keyframes sweep-next-anim {
                    0% {
                        transform: translateX(50%);
                        opacity: 0;
                    }
                    15% {
                        opacity: 1;
                    }
                    85% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(-50%);
                        opacity: 0;
                    }
                }

                @keyframes sweep-prev-anim {
                    0% {
                        transform: translateX(-50%);
                        opacity: 0;
                    }
                    15% {
                        opacity: 1;
                    }
                    85% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(50%);
                        opacity: 0;
                    }
                }

                .animate-sweep-next {
                    animation: sweep-next-anim 900ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }

                .animate-sweep-prev {
                    animation: sweep-prev-anim 900ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }

                /* Static page reveal/hide shadows */
                @keyframes shadow-left-reveal-anim {
                    0% {
                        opacity: 0;
                    }
                    50% {
                        opacity: 0.45;
                        background: linear-gradient(to left, rgba(0,0,0,0.55), rgba(0,0,0,0));
                    }
                    100% {
                        opacity: 0;
                    }
                }

                @keyframes shadow-left-hide-anim {
                    0% {
                        opacity: 0.55;
                        background: linear-gradient(to left, rgba(0,0,0,0.65), rgba(0,0,0,0));
                    }
                    50% {
                        opacity: 0.25;
                        background: linear-gradient(to left, rgba(0,0,0,0.35), rgba(0,0,0,0));
                    }
                    100% {
                        opacity: 0;
                    }
                }

                @keyframes shadow-right-reveal-anim {
                    0% {
                        opacity: 0;
                    }
                    50% {
                        opacity: 0.45;
                        background: linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0));
                    }
                    100% {
                        opacity: 0;
                    }
                }

                @keyframes shadow-right-hide-anim {
                    0% {
                        opacity: 0.55;
                        background: linear-gradient(to right, rgba(0,0,0,0.65), rgba(0,0,0,0));
                    }
                    50% {
                        opacity: 0.25;
                        background: linear-gradient(to right, rgba(0,0,0,0.35), rgba(0,0,0,0));
                    }
                    100% {
                        opacity: 0;
                    }
                }

                .animate-shadow-left-reveal {
                    animation: shadow-left-reveal-anim 900ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }

                .animate-shadow-left-hide {
                    animation: shadow-left-hide-anim 900ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }

                .animate-shadow-right-reveal {
                    animation: shadow-right-reveal-anim 900ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }

                .animate-shadow-right-hide {
                    animation: shadow-right-hide-anim 900ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
            `}</style>
        </div>
    );
}
