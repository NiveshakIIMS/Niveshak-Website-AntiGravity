/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, PlusSquare, Bell, Check, Copy, Sparkles, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

declare global {
    interface Window {
        showNiveshakInstallPrompt?: () => void;
        deferredPrompt?: any;
    }
}

const getDeviceInfo = () => {
    if (typeof window === "undefined") {
        return { isIOS: false, isIOSChrome: false, isIOSSafari: false, isAndroid: false, isStandalone: false };
    }

    const ua = window.navigator.userAgent.toLowerCase();

    // Standalone / PWA Mode
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isStandalone = standalone || isIOSStandalone;

    // OS Detection (including iPadOS Mac OS X user agent)
    const isIPhoneIPod = /iphone|ipod/.test(ua);
    const isIPad = /ipad/.test(ua) || (/macintosh/.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    const isIOS = isIPhoneIPod || isIPad;
    const isAndroid = /android/.test(ua);

    // iOS Browser Variant
    const isIOSChrome = isIOS && /crios/i.test(ua);
    const isIOSSafari = isIOS && !isIOSChrome && /safari/i.test(ua) && !/fxios|optios|edgios/i.test(ua);

    return { isIOS, isIOSChrome, isIOSSafari, isAndroid, isStandalone };
};

export default function PWAInstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [notificationPermission, setNotificationPermission] = useState<string>("default");
    const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
    const [isNotifDismissedThisSession, setIsNotifDismissedThisSession] = useState(false);

    const deviceInfo = useMemo(() => getDeviceInfo(), []);
    const { isIOS, isIOSChrome, isIOSSafari, isAndroid, isStandalone } = deviceInfo;

    // 1. Detect environment and register global trigger
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Expose global function to trigger prompt from navbar menu
        window.showNiveshakInstallPrompt = () => {
            setIsVisible(true);
        };

        // Load notification permission status
        if ("Notification" in window) {
            setNotificationPermission(Notification.permission);
        }

        // Listen for Android beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            try {
                (window as any).deferredPrompt = e;
            } catch (err) {
                console.log(err);
            }
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Auto show prompt if not dismissed recently and not standalone
        if (!isStandalone) {
            const dismissedTime = localStorage.getItem("niveshak_install_dismissed");
            const now = Date.now();
            if (!dismissedTime || now - parseInt(dismissedTime) > 24 * 60 * 60 * 1000) {
                if (isIOS || isAndroid) {
                    const timer = setTimeout(() => {
                        setIsVisible(true);
                    }, 3500);
                    return () => clearTimeout(timer);
                }
            }
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, [isIOS, isAndroid, isStandalone]);

    // 2. Notification auto-prompting logic on mount and visibility change
    useEffect(() => {
        if (typeof window === "undefined") return;
        const isMob = /iphone|ipad|ipod|android/.test(window.navigator.userAgent.toLowerCase()) ||
            (/macintosh/.test(window.navigator.userAgent.toLowerCase()) && navigator.maxTouchPoints > 1);
        if (!isMob || !("Notification" in window)) return;

        let timer: NodeJS.Timeout;

        const checkAndPrompt = async () => {
            if (Notification.permission === "granted") {
                setShowNotificationPrompt(false);
                return;
            }

            // Attempt system-level popup directly
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

            // Show in-app prompt if still not granted after a small delay
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                if (Notification.permission !== "granted") {
                    setShowNotificationPrompt(true);
                }
            }, 5000);
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

    // 3. Setup Supabase Realtime Subscription for NAV updates
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

    // Handlers
    const handleInstallAndroid = async () => {
        const promptEvent = deferredPrompt || (window as any).deferredPrompt;
        if (!promptEvent) return;

        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
            try {
                // eslint-disable-next-line react-hooks/immutability
                delete (window as any).deferredPrompt;
            } catch {
                // eslint-disable-next-line react-hooks/immutability
                (window as any).deferredPrompt = null;
            }
            setIsVisible(false);
            requestNotificationPermission();
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("niveshak_install_dismissed", Date.now().toString());
    };

    const handleCopyUrl = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
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
            {/* Install Web App Modal */}
            <AnimatePresence>
                {isVisible && (
                    <div className="fixed inset-0 z-[9999] p-4 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 320, damping: 26 }}
                            className="w-full max-w-sm rounded-3xl border border-navy-700/60 bg-navy-950/95 backdrop-blur-2xl shadow-2xl p-5 sm:p-6 space-y-4 text-white overflow-hidden relative"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-2xl p-1.5 shadow-md shrink-0 flex items-center justify-center border border-navy-700">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src="/logo.png" alt="Niveshak Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
                                            Niveshak Web App
                                            <Sparkles className="w-4 h-4 text-yellow-400" />
                                        </h3>
                                        <p className="text-[11px] text-gray-400">Finance Club of IIM Shillong</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="p-1.5 rounded-full bg-navy-800/80 hover:bg-navy-800 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Content based on device */}
                            {isStandalone ? (
                                /* Already Installed */
                                <div className="space-y-4 py-2 text-center">
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                                        <Check className="w-4 h-4" /> App is installed &amp; active!
                                    </div>
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        You are currently running Niveshak in standalone Web App mode on your home screen.
                                    </p>
                                    <button
                                        onClick={handleDismiss}
                                        className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        Got It
                                    </button>
                                </div>
                            ) : isIOS ? (
                                /* iOS Devices (Safari or Chrome on iOS) */
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        Add Niveshak to your iOS home screen for instant app access and NAV update alerts:
                                    </p>

                                    <div className="p-3.5 rounded-2xl bg-navy-900/80 border border-navy-700/60 text-xs text-gray-200 space-y-2.5">
                                        <div className="font-bold text-white flex items-center justify-between text-xs border-b border-navy-800 pb-2">
                                            <span className="flex items-center gap-1.5">
                                                <InfoIcon className="w-3.5 h-3.5 text-accent" />
                                                {isIOSChrome ? "Chrome on iOS Instructions:" : isIOSSafari ? "Safari iOS Instructions:" : "iOS Setup Instructions:"}
                                            </span>
                                            <span className="text-[10px] bg-accent/20 text-accent font-bold px-2 py-0.5 rounded-full">iOS</span>
                                        </div>

                                        <div className="space-y-2 text-[11px] leading-relaxed">
                                            <div className="flex items-start gap-2">
                                                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                                                <p>
                                                    Tap the <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-navy-800 rounded-md text-white font-semibold"><Share className="w-3 h-3 text-accent" /> Share</span> icon {isIOSChrome ? "in Chrome URL bar / menu" : "at the bottom bar of Safari"}.
                                                </p>
                                            </div>

                                            <div className="flex items-start gap-2">
                                                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                                                <p>
                                                    Scroll down and select <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-navy-800 rounded-md text-white font-semibold">Add to Home Screen <PlusSquare className="w-3 h-3 text-emerald-400" /></span>.
                                                </p>
                                            </div>

                                            <div className="flex items-start gap-2">
                                                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                                                <p>
                                                    Tap <span className="font-bold text-white">&quot;Add&quot;</span> in the top-right corner to finish!
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Animated Hint */}
                                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-accent font-semibold animate-pulse py-1">
                                        <ArrowDown className="w-3.5 h-3.5" /> Tap Share below to Add to Home Screen
                                    </div>

                                    {isIOSChrome && (
                                        <button
                                            onClick={handleCopyUrl}
                                            className="w-full py-2 rounded-xl bg-navy-900/60 hover:bg-navy-900 border border-navy-700/50 text-gray-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-accent" />}
                                            {copied ? "Link Copied! Open in Safari to install" : "Copy Link to Open in Safari"}
                                        </button>
                                    )}
                                </div>
                            ) : isAndroid ? (
                                /* Android Devices */
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        Install Niveshak on your Android home screen for quick access and NAV alerts.
                                    </p>

                                    {deferredPrompt || (window as any).deferredPrompt ? (
                                        <button
                                            onClick={handleInstallAndroid}
                                            className="w-full py-3 rounded-2xl bg-accent hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
                                        >
                                            <Download className="w-4 h-4" /> Install App Now
                                        </button>
                                    ) : (
                                        <div className="p-3.5 rounded-2xl bg-navy-900/80 border border-navy-700/60 text-xs text-gray-200 space-y-2">
                                            <div className="font-bold text-white text-xs border-b border-navy-800 pb-1.5">
                                                Android Installation Guide:
                                            </div>
                                            <p className="text-[11px]">
                                                1. Tap the <span className="font-bold text-white">⋮ Menu</span> icon at the top right of Chrome.
                                            </p>
                                            <p className="text-[11px]">
                                                2. Select <span className="font-bold text-white">&quot;Add to Home screen&quot;</span> or <span className="font-bold text-white">&quot;Install app&quot;</span>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Other / Desktop (when manually triggered) */
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        To install Niveshak as a Web App:
                                    </p>
                                    <div className="p-3.5 rounded-2xl bg-navy-900/80 border border-navy-700/60 text-xs text-gray-200 space-y-2">
                                        <p className="text-[11px]">
                                            • <span className="font-bold text-white">iOS (Safari/Chrome)</span>: Tap <Share className="w-3 h-3 inline text-accent" /> Share → Add to Home Screen <PlusSquare className="w-3 h-3 inline text-emerald-400" />.
                                        </p>
                                        <p className="text-[11px]">
                                            • <span className="font-bold text-white">Android (Chrome)</span>: Tap Menu ⋮ → Add to Home Screen / Install App.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCopyUrl}
                                        className="w-full py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 text-gray-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-accent" />}
                                        {copied ? "Link Copied!" : "Copy App Link"}
                                    </button>
                                </div>
                            )}

                            {/* Notifications & Dismiss buttons */}
                            <div className="space-y-2 pt-2 border-t border-navy-800">
                                {notificationPermission !== "granted" && (
                                    <button
                                        onClick={requestNotificationPermission}
                                        className="w-full py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700/70 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                    >
                                        <Bell className="w-4 h-4 text-yellow-400" /> Enable NAV Alerts
                                    </button>
                                )}

                                <button
                                    onClick={handleDismiss}
                                    className="w-full py-2 rounded-xl text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all text-center"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notification Banner when enabled */}
            <AnimatePresence>
                {shouldShowNotifBanner && (
                    <div className="fixed inset-x-0 bottom-0 z-[9999] p-4 flex justify-center items-end pointer-events-none md:hidden">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="w-full max-w-sm rounded-2xl border border-navy-700/50 bg-navy-950/90 backdrop-blur-xl shadow-2xl p-5 space-y-4 pointer-events-auto overflow-hidden relative text-white"
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

function InfoIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    );
}
