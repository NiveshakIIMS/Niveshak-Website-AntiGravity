"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, PlusSquare, Bell, BellOff, ArrowUp } from "lucide-react";
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
    const [isAndroid, setIsAndroid] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [notificationPermission, setNotificationPermission] = useState<string>("default");

    // 1. Detect environment and installation status
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check if already in standalone/PWA mode
        const standalone = window.matchMedia("(display-mode: standalone)").matches;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isIOSStandalone = (window.navigator as any).standalone === true;
        const standaloneMode = standalone || isIOSStandalone;
        setIsStandalone(standaloneMode);

        // Detect OS
        const ua = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(ua);
        const android = /android/.test(ua);
        setIsIOS(ios);
        setIsAndroid(android);

        // Load notification permission status
        if ("Notification" in window) {
            setNotificationPermission(Notification.permission);
        }

        // Listen for Android beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            window.deferredPrompt = e;
            
            // Auto show prompt if not dismissed recently
            const dismissedTime = localStorage.getItem("niveshak_install_dismissed");
            const now = Date.now();
            // Show again after 1 day if dismissed
            if (!dismissedTime || now - parseInt(dismissedTime) > 24 * 60 * 60 * 1000) {
                if (!standaloneMode && (android || ios)) {
                    // Small delay to let user settle in
                    const timer = setTimeout(() => {
                        setIsVisible(true);
                    }, 3000);
                    return () => clearTimeout(timer);
                }
            }
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // iOS doesn't trigger beforeinstallprompt, so we auto-show on Safari if not standalone
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

        // Expose global function to trigger prompt from navbar menu
        window.showNiveshakInstallPrompt = () => {
            setIsVisible(true);
        };

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, [isIOS, isAndroid, isStandalone]);

    // 2. Setup Supabase Realtime Subscription for NAV updates
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        const channel = supabase
            .channel("nav-updates-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "nav_data" },
                (payload) => {
                    const newNAV = payload.new as any;
                    if (newNAV && newNAV.value) {
                        try {
                            const formattedDate = newNAV.date 
                                ? new Date(newNAV.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) 
                                : "";
                            new Notification("Niveshak NAV Updated 📈", {
                                body: `NIF NAV has been updated to ₹${Number(newNAV.value).toFixed(2)}${formattedDate ? ` for ${formattedDate}` : ''}. Open Niveshak app to view details.`,
                                icon: "/logo.png",
                                badge: "/logo.png",
                                tag: "niveshak-nav-update"
                            });
                        } catch (err) {
                            console.error("Error displaying notification:", err);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [notificationPermission]);

    // 3. Handlers
    const handleInstallAndroid = async () => {
        const promptEvent = deferredPrompt || window.deferredPrompt;
        if (!promptEvent) return;

        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
            window.deferredPrompt = null;
            setIsVisible(false);
            // Ask for notifications after installation
            requestNotificationPermission();
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("niveshak_install_dismissed", Date.now().toString());
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) return;
        
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === "granted") {
            // Trigger test notification
            new Notification("Notifications Enabled 🔔", {
                body: "You will now receive alerts whenever the NIF NAV is updated.",
                icon: "/logo.png"
            });
        }
    };

    // If on desktop or already installed (and not explicitly opened via menu), don't render
    const isMobile = useMemo(() => isIOS || isAndroid, [isIOS, isAndroid]);
    if (!isMobile) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-x-0 bottom-0 z-[9999] p-4 flex justify-center items-end pointer-events-none md:hidden">
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-full max-w-sm rounded-2xl border border-navy-700/50 bg-navy-950/90 backdrop-blur-xl shadow-2xl p-5 space-y-4 pointer-events-auto overflow-hidden relative"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white rounded-xl p-1 overflow-hidden shadow-md shrink-0 flex items-center justify-center">
                                    <img src="/logo.png" alt="Niveshak Logo" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-white text-base">Install Niveshak App</h3>
                                    <p className="text-[11px] text-gray-400">Finance Club of IIM Shillong</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-1 rounded-full bg-navy-800 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-gray-300 leading-relaxed">
                            Add Niveshak to your home screen for instant access, offline support, and real-time NAV update notifications!
                        </p>

                        {/* IOS Specific Instructions */}
                        {isIOS && !isStandalone && (
                            <div className="p-3 rounded-xl bg-navy-900/50 border border-navy-800 text-[11px] text-gray-300 space-y-2.5">
                                <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                                    <InfoIcon className="w-3.5 h-3.5 text-accent" />
                                    Installation Instructions:
                                </div>
                                <div className="space-y-1.5 leading-normal">
                                    <p className="flex items-center gap-1.5">
                                        1. Tap the <span className="p-1 bg-navy-800 rounded text-white"><Share className="w-3.5 h-3.5 inline" /></span> share button in Safari.
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        2. Scroll down and select <span className="font-bold text-white flex items-center gap-1">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline" /></span>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-1">
                            {/* Install Button for Android */}
                            {isAndroid && deferredPrompt && (
                                <button
                                    onClick={handleInstallAndroid}
                                    className="w-full py-2.5 rounded-xl bg-accent hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-accent/25"
                                >
                                    <Download className="w-4 h-4" /> Install App
                                </button>
                            )}

                            {/* Enable Notifications Button */}
                            {notificationPermission !== "granted" && (
                                <button
                                    onClick={requestNotificationPermission}
                                    className="w-full py-2.5 rounded-xl bg-navy-800/80 hover:bg-navy-800 border border-navy-700/50 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                >
                                    <Bell className="w-4 h-4 text-yellow-400" /> Enable NAV Alerts
                                </button>
                            )}

                            {notificationPermission === "granted" && (
                                <div className="text-[10px] text-green-400 font-semibold flex items-center justify-center gap-1.5 py-1">
                                    <Bell className="w-3.5 h-3.5 text-green-400 animate-bounce" /> Real-time NAV update notifications enabled!
                                </div>
                            )}

                            <button
                                onClick={handleDismiss}
                                className="w-full py-2 rounded-xl text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all text-center"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Inline mini components to keep it standalone
function InfoIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    );
}
