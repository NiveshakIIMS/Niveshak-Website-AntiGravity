"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, PlusSquare, Bell, BellOff, ArrowUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { dataService, formatDateDDMMYYYY } from "@/services/dataService";

declare global {
    interface Window {
        showNiveshakInstallPrompt?: () => void;
        deferredPrompt?: any;
    }
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PWAInstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [notificationPermission, setNotificationPermission] = useState<string>("default");
    const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
    const [isNotifDismissedThisSession, setIsNotifDismissedThisSession] = useState(false);
    const [activeInAppNotification, setActiveInAppNotification] = useState<any>(null);

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

    // 2. Notification auto-prompting logic on mount and visibility change
    useEffect(() => {
        if (typeof window === "undefined") return;
        const isMob = /iphone|ipad|ipod|android/.test(window.navigator.userAgent.toLowerCase());
        if (!isMob || !("Notification" in window)) return;

        let timer: NodeJS.Timeout;

        const checkAndPrompt = async () => {
            if (Notification.permission === "granted") {
                setShowNotificationPrompt(false);
                return;
            }

            // 1. Attempt system-level popup directly
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
                console.log("Auto-requesting system permission failed (requires user gesture):", err);
            }

            // 2. Show in-app prompt if still not granted after a small delay
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                if (Notification.permission !== "granted") {
                    setShowNotificationPrompt(true);
                }
            }, 4000);
        };

        // Trigger on mount
        checkAndPrompt();

        // Trigger on app foregrounding / visibility change
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

    const displayNotification = (payload: any) => {
        if (!payload || !payload.title || !payload.body) return;

        // Save timestamp in localStorage
        localStorage.setItem("niveshak_last_notif_timestamp", payload.timestamp.toString());

        // 1. Show native OS notification if allowed
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                // Strip HTML tags for native banner
                const plainTitle = payload.title.replace(/<[^>]*>/g, "");
                const plainBody = payload.body.replace(/<[^>]*>/g, "");
                
                new Notification(plainTitle, {
                    body: plainBody,
                    icon: "/pwa-icon.png?v=2",
                    badge: "/pwa-icon.png?v=2",
                    tag: `niveshak-push-${payload.timestamp}`
                });
            } catch (err) {
                console.error("Failed to show native browser notification:", err);
            }
        }

        // 2. Show in-app notification banner
        setActiveInAppNotification(payload);
    };

    // Auto-dismiss in-app banner after 8s
    useEffect(() => {
        if (!activeInAppNotification) return;
        const timer = setTimeout(() => {
            setActiveInAppNotification(null);
        }, 8000);
        return () => clearTimeout(timer);
    }, [activeInAppNotification]);

    // Daily Auto-Timer Notification Check
    useEffect(() => {
        if (typeof window === "undefined") return;

        const checkDailyAutoTimer = async () => {
            try {
                const config = await dataService.getNotificationConfig();
                if (!config.autoTimerEnabled || !config.autoTimerTime) return;

                // Check if already shown today
                const todayStr = new Date().toDateString();
                const lastShownToday = localStorage.getItem("niveshak_last_daily_timer_shown_date");
                if (lastShownToday === todayStr) return;

                // Check if current time is past the scheduled time
                const [targetHr, targetMin] = config.autoTimerTime.split(":").map(Number);
                const now = new Date();
                const currentHr = now.getHours();
                const currentMin = now.getMinutes();

                const isPastTime = currentHr > targetHr || (currentHr === targetHr && currentMin >= targetMin);
                if (!isPastTime) return;

                // Fetch latest NIF NAV
                const navList = await dataService.getNAVData();
                if (navList.length === 0) return;
                
                // Sort descending and get latest
                const sorted = [...navList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latestEntry = sorted[0];
                if (!latestEntry) return;

                const formattedDate = formatDateDDMMYYYY(latestEntry.date);
                const formattedValue = Number(latestEntry.value).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                // Display it locally
                const dailyPayload = {
                    type: "auto_nav",
                    title: "Daily NIF NAV Update 📊",
                    body: `NIF NAV as of ${formattedDate} is ₹ ${formattedValue}`,
                    timestamp: Date.now()
                };

                // Trigger notifications
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification(dailyPayload.title, {
                        body: dailyPayload.body,
                        icon: "/pwa-icon.png?v=2",
                        badge: "/pwa-icon.png?v=2",
                        tag: `niveshak-daily-${todayStr}`
                    });
                }
                
                setActiveInAppNotification(dailyPayload);
                localStorage.setItem("niveshak_last_daily_timer_shown_date", todayStr);

            } catch (err) {
                console.error("Daily timer check failed:", err);
            }
        };

        // Run check on mount
        checkDailyAutoTimer();

        // Also run when browser tab becomes active
        const handleVisibilityCheck = () => {
            if (document.visibilityState === "visible") {
                checkDailyAutoTimer();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityCheck);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityCheck);
        };
    }, []);

    // 3. Setup Supabase Realtime Subscription for Notification Triggers
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Fetch latest trigger on mount to check if it's new
        const checkLatestTrigger = async () => {
            try {
                const { data, error } = await supabase
                    .from('site_settings')
                    .select('value')
                    .eq('id', 'notification_trigger')
                    .single();
                if (!error && data && data.value) {
                    const payload = JSON.parse(data.value);
                    const lastShown = localStorage.getItem("niveshak_last_notif_timestamp");
                    const lastShownTs = lastShown ? parseInt(lastShown) : 0;
                    
                    // If the notification was triggered within the last 5 minutes and is new, display it
                    if (payload.timestamp > lastShownTs && Date.now() - payload.timestamp < 5 * 60 * 1000) {
                        displayNotification(payload);
                    }
                }
            } catch (err) {
                console.error("Error checking latest notification trigger:", err);
            }
        };
        checkLatestTrigger();

        // Subscribe to site_settings table changes for notification triggers
        const channel = supabase
            .channel("notification-triggers-realtime")
            .on(
                "postgres_changes",
                { 
                    event: "*", 
                    schema: "public", 
                    table: "site_settings", 
                    filter: "id=eq.notification_trigger" 
                },
                (payload) => {
                    const row = payload.new as any;
                    if (row && row.value) {
                        try {
                            const parsed = JSON.parse(row.value);
                            displayNotification(parsed);
                        } catch (err) {
                            console.error("Failed to parse realtime notification trigger:", err);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [notificationPermission]);

    const subscribeToWebPush = async () => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Check if subscription already exists
            let subscription = await registration.pushManager.getSubscription();
            
            const vapidPublicKey = "BKV3GvX2qXDFWovEJxzmJTazvUPesyEdUl183qPp7nnVViZOdy8kXTlWVnE-2Dr9mb0xCjJ9IBZtO338dXfBAdI";
            const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedKey
                });
                console.log("New push subscription created:", subscription);
            } else {
                console.log("Existing push subscription found:", subscription);
            }

            // Send subscription to backend
            const response = await fetch("/api/notifications/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ subscription: subscription.toJSON() })
            });

            if (!response.ok) {
                console.error("Failed to register subscription on server:", await response.text());
            } else {
                console.log("Subscription registered on server successfully");
            }
        } catch (err) {
            console.error("Failed to subscribe user to Web Push:", err);
        }
    };

    // Automatically trigger Web Push subscription when permission is granted
    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return;
        if (notificationPermission === "granted") {
            subscribeToWebPush();
        }
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
        
        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);

            if (permission === "granted") {
                setShowNotificationPrompt(false);
                // Trigger test notification
                new Notification("Notifications Enabled 🔔", {
                    body: "You will now receive alerts whenever the NIF NAV is updated.",
                    icon: "/pwa-icon.png?v=2"
                });
                await subscribeToWebPush();
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

    // If on desktop or already installed (and not explicitly opened via menu), don't render PWA alerts
    const isMobile = useMemo(() => isIOS || isAndroid, [isIOS, isAndroid]);

    const shouldShowNotifBanner = isMobile && showNotificationPrompt && !isVisible && !isNotifDismissedThisSession && notificationPermission !== "granted";

    const formatRichText = (text: string) => {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, '<strong class="font-bold text-white">$1</strong>')
            .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, '<strong class="font-bold text-white">$1</strong>')
            .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/g, '<em class="italic text-gray-200">$1</em>')
            .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/g, '<em class="italic text-gray-200">$1</em>')
            .replace(/&lt;span class="text-accent"&gt;(.*?)&lt;\/span&gt;/g, '<span class="text-sky-400 font-bold font-semibold">$1</span>')
            .replace(/&lt;span className="text-accent"&gt;(.*?)&lt;\/span&gt;/g, '<span class="text-sky-400 font-bold font-semibold">$1</span>');
    };

    return (
        <>
            {/* PWA Installation Sheet */}
            <AnimatePresence>
                {isMobile && isVisible && (
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

            {/* PWA Custom Notification Permission Prompt */}
            <AnimatePresence>
                {shouldShowNotifBanner && (
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

                            {/* Description */}
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Get real-time updates of NIF NAV delivered straight to your device as soon as they are updated.
                            </p>

                            {/* Actions */}
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

            {/* In-App Floating Notification Toast (Desktop & Mobile) */}
            <AnimatePresence>
                {activeInAppNotification && (
                    <div className="fixed top-4 inset-x-4 sm:left-auto sm:right-4 z-[99999] flex justify-center sm:justify-end pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: -50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -30, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="w-full max-w-sm rounded-2xl border border-navy-700/50 bg-navy-950/95 backdrop-blur-xl shadow-2xl p-4 flex gap-3 pointer-events-auto relative overflow-hidden"
                        >
                            {/* Icon */}
                            <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center shrink-0 border border-navy-800 shadow-inner">
                                <Bell className="w-5 h-5 text-accent animate-pulse" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-4">
                                <h4 
                                    className="font-extrabold text-white text-sm leading-snug"
                                    dangerouslySetInnerHTML={{ __html: formatRichText(activeInAppNotification.title) }}
                                />
                                <p 
                                    className="text-xs text-gray-300 mt-1 leading-normal"
                                    dangerouslySetInnerHTML={{ __html: formatRichText(activeInAppNotification.body) }}
                                />
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setActiveInAppNotification(null)}
                                className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-800 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
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
