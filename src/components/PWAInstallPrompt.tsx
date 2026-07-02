/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, PlusSquare, Bell, CheckCircle2, MoreVertical, Sparkles, Smartphone, Laptop } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

declare global {
    interface Window {
        showNiveshakInstallPrompt?: () => void;
        deferredPrompt?: any;
    }
}

export default function PWAInstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [iosBrowser, setIosBrowser] = useState<"safari" | "chrome" | "firefox" | "edge" | "other">("safari");
    const [isAndroid, setIsAndroid] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [notificationPermission, setNotificationPermission] = useState<string>("default");
    const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
    const [isNotifDismissedThisSession, setIsNotifDismissedThisSession] = useState(false);

    // 1. Detect environment and installation status
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check if already in standalone/PWA mode
        const standalone = window.matchMedia("(display-mode: standalone)").matches;
        const isIOSStandalone = (window.navigator as any).standalone === true;
        const standaloneMode = standalone || isIOSStandalone;
        setIsStandalone(standaloneMode);

        // Detect OS and Browser (including iPadOS MacIntel touch devices)
        const ua = window.navigator.userAgent.toLowerCase();
        const isMacTouch = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
        const ios = /iphone|ipad|ipod/.test(ua) || isMacTouch;
        const android = /android/.test(ua);
        setIsIOS(ios);
        setIsAndroid(android);

        if (ios) {
            if (ua.includes("crios")) setIosBrowser("chrome");
            else if (ua.includes("fxios")) setIosBrowser("firefox");
            else if (ua.includes("edgios")) setIosBrowser("edge");
            else if (ua.includes("safari")) setIosBrowser("safari");
            else setIosBrowser("other");
        }

        // Load notification permission status
        if ("Notification" in window) {
            setNotificationPermission(Notification.permission);
        }

        // Listen for Android / Desktop beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            window.deferredPrompt = e;

            // Auto show prompt if not dismissed recently
            const dismissedTime = localStorage.getItem("niveshak_install_dismissed");
            const now = Date.now();
            if (!dismissedTime || now - parseInt(dismissedTime) > 24 * 60 * 60 * 1000) {
                if (!standaloneMode && (android || ios)) {
                    const timer = setTimeout(() => {
                        setIsVisible(true);
                    }, 3000);
                    return () => clearTimeout(timer);
                }
            }
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // iOS auto-prompt on Safari / Chrome if not standalone
        if (ios && !standaloneMode) {
            const dismissedTime = localStorage.getItem("niveshak_install_dismissed");
            const now = Date.now();
            if (!dismissedTime || now - parseInt(dismissedTime) > 24 * 60 * 60 * 1000) {
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }

        // ALWAYS expose global function so "Install Web App" button works on all devices!
        window.showNiveshakInstallPrompt = () => {
            setIsVisible(true);
        };

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    // 2. Notification auto-prompting logic
    useEffect(() => {
        if (typeof window === "undefined") return;
        const isMob = /iphone|ipad|ipod|android/.test(window.navigator.userAgent.toLowerCase()) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
        if (!isMob || !("Notification" in window)) return;

        let timer: NodeJS.Timeout;

        const checkAndPrompt = async () => {
            if (Notification.permission === "granted") {
                setShowNotificationPrompt(false);
                return;
            }

            try {
                const permission = await Notification.requestPermission();
                setNotificationPermission(permission);
                if (permission === "granted") {
                    setShowNotificationPrompt(false);
                    new Notification("Notifications Enabled 🔔", {
                        body: "You will now receive alerts whenever the NIF NAV is updated.",
                        icon: "/pwa-icon.png?v=2"
                    });
                    return;
                }
            } catch (err) {
                console.log("Auto-requesting system permission failed:", err);
            }

            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                if (Notification.permission !== "granted") {
                    setShowNotificationPrompt(true);
                }
            }, 4000);
        };

        checkAndPrompt();

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                checkAndPrompt();
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            if (timer) clearTimeout(timer);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    // 3. Supabase Realtime Subscription for NAV updates
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        let updateBuffer: any[] = [];
        let processTimeout: NodeJS.Timeout | null = null;

        const formatDateDDMMYYYY = (dateStr: string) => {
            if (!dateStr) return "";
            try {
                const parts = dateStr.split('T')[0].split('-');
                if (parts.length === 3) {
                    const [y, m, d] = parts;
                    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
                }
                const d = new Date(dateStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}-${month}-${year}`;
            } catch {
                return "";
            }
        };

        const processUpdates = () => {
            updateBuffer.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            updateBuffer.forEach((newNAV) => {
                try {
                    const formattedDate = formatDateDDMMYYYY(newNAV.date);
                    const formattedValue = Number(newNAV.value).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    new Notification("Niveshak NAV Updated 📈", {
                        body: `NIF NAV as of ${formattedDate} is ₹ ${formattedValue}`,
                        icon: "/pwa-icon.png?v=2",
                        badge: "/pwa-icon.png?v=2",
                        tag: `niveshak-nav-update-${newNAV.date}`
                    });
                } catch (err) {
                    console.error("Error displaying notification:", err);
                }
            });

            updateBuffer = [];
        };

        const channel = supabase
            .channel("nav-updates-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "nav_data" },
                (payload) => {
                    const newNAV = payload.new as any;
                    if (newNAV && newNAV.value && newNAV.date) {
                        updateBuffer.push(newNAV);
                        if (processTimeout) clearTimeout(processTimeout);
                        processTimeout = setTimeout(processUpdates, 300);
                    }
                }
            )
            .subscribe();

        return () => {
            if (processTimeout) clearTimeout(processTimeout);
            supabase.removeChannel(channel);
        };
    }, [notificationPermission]);

    // 4. Handlers
    const handleInstallAndroid = async () => {
        const promptEvent = deferredPrompt || window.deferredPrompt;
        if (!promptEvent) return;

        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setIsVisible(false);
            requestNotificationPermission();
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("niveshak_install_dismissed", Date.now().toString());
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) return;
        
        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);

            if (permission === "granted") {
                setShowNotificationPrompt(false);
                new Notification("Notifications Enabled 🔔", {
                    body: "You will now receive alerts whenever the NIF NAV is updated.",
                    icon: "/pwa-icon.png?v=2"
                });
            } else if (permission === "denied") {
                alert("Notifications are blocked. Please enable notification permissions in your browser or site settings to receive NAV updates.");
                setShowNotificationPrompt(false);
            }
        } catch (err) {
            console.error("Error requesting notification permission:", err);
        }
    };

    const handleDismissNotifPrompt = () => {
        setShowNotificationPrompt(false);
        setIsNotifDismissedThisSession(true);
    };

    const shouldShowNotifBanner = showNotificationPrompt && !isVisible && !isNotifDismissedThisSession && notificationPermission !== "granted";

    return (
        <>
            {/* Main PWA Installation Modal */}
            <AnimatePresence>
                {isVisible && (
                    <div className="fixed inset-0 z-[9999] p-4 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="w-full max-w-md rounded-2xl border border-navy-700/80 bg-navy-950/95 backdrop-blur-2xl shadow-2xl p-6 space-y-5 overflow-hidden relative text-white"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-xl p-1 overflow-hidden shadow-md shrink-0 flex items-center justify-center">
                                        <img src="/logo.png" alt="Niveshak Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
                                            Install Niveshak App <Sparkles className="w-4 h-4 text-amber-400" />
                                        </h3>
                                        <p className="text-xs text-gray-400">Finance Club of IIM Shillong</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="p-1.5 rounded-full bg-navy-800/80 text-gray-400 hover:text-white transition-colors border border-navy-700/50"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Standalone state */}
                            {isStandalone ? (
                                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 space-y-2">
                                    <div className="font-bold flex items-center gap-2 text-sm text-emerald-400">
                                        <CheckCircle2 className="w-5 h-5" /> App Already Installed!
                                    </div>
                                    <p className="text-xs leading-relaxed text-emerald-200/90">
                                        You are running Niveshak in Standalone Web App mode on your device.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Description */}
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        Install Niveshak as a lightweight Web App on your home screen for instant access, full-screen reading, and real-time NAV update alerts!
                                    </p>

                                    {/* iOS Instructions */}
                                    {isIOS && (
                                        <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-700/70 text-xs text-gray-300 space-y-3">
                                            <div className="font-bold text-white flex items-center gap-2 text-xs text-amber-300">
                                                <Smartphone className="w-4 h-4 text-amber-400" />
                                                iOS PWA Installation Guide ({iosBrowser === "chrome" ? "Chrome" : "Safari"}):
                                            </div>
                                            
                                            {iosBrowser === "chrome" ? (
                                                <div className="space-y-2.5 leading-normal text-[11px]">
                                                    <p className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-navy-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                                                        <span>Tap the <span className="font-semibold text-white">Share <Share className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /></span> icon in the address bar or Chrome menu.</span>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-navy-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                                                        <span>Scroll & tap <span className="font-bold text-white inline-flex items-center gap-1">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-white" /></span>.</span>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-navy-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                                                        <span>Tap <span className="font-bold text-white">Add</span> in the top-right corner to finish.</span>
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2.5 leading-normal text-[11px]">
                                                    <p className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-navy-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                                                        <span>Tap the <span className="font-semibold text-white">Share <Share className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /></span> button on Safari navigation bar (bottom or top).</span>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-navy-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                                                        <span>Scroll down and tap <span className="font-bold text-white inline-flex items-center gap-1">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-white" /></span>.</span>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-navy-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                                                        <span>Tap <span className="font-bold text-white">Add</span> to place Niveshak on your home screen.</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Android Instructions / Button */}
                                    {isAndroid && (
                                        <div className="space-y-3">
                                            {deferredPrompt ? (
                                                <button
                                                    onClick={handleInstallAndroid}
                                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98"
                                                >
                                                    <Download className="w-4 h-4" /> Install App Now
                                                </button>
                                            ) : (
                                                <div className="p-3.5 rounded-xl bg-navy-900/80 border border-navy-700/70 text-xs text-gray-300 space-y-2">
                                                    <div className="font-bold text-white flex items-center gap-1.5">
                                                        <MoreVertical className="w-4 h-4 text-blue-400" /> Android Installation Guide:
                                                    </div>
                                                    <p className="text-[11px] leading-relaxed">
                                                        Tap browser menu <span className="font-bold text-white">⋮</span> -&gt; select <span className="font-bold text-white">Add to Home screen</span> or <span className="font-bold text-white">Install App</span>.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Desktop Instructions */}
                                    {!isIOS && !isAndroid && (
                                        <div className="p-3.5 rounded-xl bg-navy-900/80 border border-navy-700/70 text-xs text-gray-300 space-y-2">
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <Laptop className="w-4 h-4 text-blue-400" /> Desktop Installation Guide:
                                            </div>
                                            {deferredPrompt ? (
                                                <button
                                                    onClick={handleInstallAndroid}
                                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                                                >
                                                    <Download className="w-4 h-4" /> Install Niveshak Desktop App
                                                </button>
                                            ) : (
                                                <p className="text-[11px] leading-relaxed">
                                                    Click the <span className="font-bold text-white">Install App</span> icon in your browser&apos;s address bar, or click Menu <span className="font-bold text-white">⋮</span> -&gt; <span className="font-bold text-white">Save and share</span> -&gt; <span className="font-bold text-white">Install Niveshak</span>.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Notification Toggle Section */}
                            <div className="border-t border-navy-800/80 pt-3 flex flex-col gap-2">
                                {notificationPermission !== "granted" && (
                                    <button
                                        onClick={requestNotificationPermission}
                                        className="w-full py-2.5 rounded-xl bg-navy-800/80 hover:bg-navy-800 border border-navy-700/60 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                    >
                                        <Bell className="w-4 h-4 text-amber-400" /> Enable Real-time NAV Alerts
                                    </button>
                                )}

                                {notificationPermission === "granted" && (
                                    <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1.5 py-1">
                                        <Bell className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Real-time NAV update notifications enabled!
                                    </div>
                                )}

                                <button
                                    onClick={handleDismiss}
                                    className="w-full py-1.5 rounded-xl text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all text-center"
                                >
                                    Done / Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notification Prompt Banner */}
            <AnimatePresence>
                {shouldShowNotifBanner && (
                    <div className="fixed inset-x-0 bottom-0 z-[9999] p-4 flex justify-center items-end pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="w-full max-w-sm rounded-2xl border border-navy-700/50 bg-navy-950/90 backdrop-blur-xl shadow-2xl p-5 space-y-4 pointer-events-auto overflow-hidden relative"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-navy-900 rounded-xl flex items-center justify-center shrink-0 border border-navy-700/50 shadow-inner">
                                        <Bell className="w-6 h-6 text-accent animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-white text-base">Enable Notifications</h3>
                                        <p className="text-[11px] text-gray-400">Never miss a NIF NAV update</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDismissNotifPrompt}
                                    className="p-1 rounded-full bg-navy-800 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-xs text-gray-300 leading-relaxed">
                                Get real-time updates of NIF NAV delivered straight to your device as soon as they are updated.
                            </p>

                            <div className="flex flex-col gap-2 pt-1">
                                <button
                                    onClick={requestNotificationPermission}
                                    className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-accent/25"
                                >
                                    <Bell className="w-4 h-4 text-white" /> Turn On Notifications
                                </button>

                                <button
                                    onClick={handleDismissNotifPrompt}
                                    className="w-full py-2 rounded-xl text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all text-center"
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
