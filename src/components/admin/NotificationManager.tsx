/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Bell, Calendar, Send, Sparkles, Check, Info, Settings, FileText, AlertCircle } from "lucide-react";
import { dataService, NotificationConfig, NAVData, formatDateDDMMYYYY } from "@/services/dataService";

const COMMON_EMOJIS = ["📢", "📈", "🔔", "🚀", "💡", "🔥", "🏆", "📊", "💰", "🎓", "🎉", "⭐️"];

export default function NotificationManager() {
    // Tab State
    const [activeSection, setActiveSection] = useState<"settings" | "nav" | "custom">("settings");
    
    // Status State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Config State
    const [config, setConfig] = useState<NotificationConfig>({
        autoSendOnNavUpdate: false,
        autoTimerEnabled: false,
        autoTimerTime: "18:00"
    });
    const [isConfigDirty, setIsConfigDirty] = useState(false);

    // NIF NAV State
    const [navData, setNavData] = useState<NAVData[]>([]);
    const [selectedNavDate, setSelectedNavDate] = useState<string>("");
    
    // Custom Notif State
    const [customTitle, setCustomTitle] = useState("");
    const [customBody, setCustomBody] = useState("");
    const [activeInput, setActiveInput] = useState<"title" | "body">("title");

    // Input Refs for cursor operations
    const titleRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [fetchedConfig, fetchedNav] = await Promise.all([
                dataService.getNotificationConfig(),
                dataService.getNAVData()
            ]);
            setConfig(fetchedConfig);
            
            // Sort NAV descending by date so latest is first
            const sortedNav = [...fetchedNav].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNavData(sortedNav);
            
            if (sortedNav.length > 0) {
                setSelectedNavDate(sortedNav[0].date);
            }
        } catch (err: any) {
            console.error("Failed to load Notification manager data:", err);
            setError(err.message || "Failed to load notification settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            await dataService.saveNotificationConfig(config);
            alert("Configurations saved successfully!");
            setIsConfigDirty(false);
        } catch (err: any) {
            console.error("Failed to save config:", err);
            alert(`Failed to save configurations: ${err.message || "Unknown error"}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSendNavNotification = async () => {
        const selectedEntry = navData.find(d => d.date === selectedNavDate);
        if (!selectedEntry) {
            alert("Please select a valid NAV date.");
            return;
        }

        setSending(true);
        try {
            const formattedDate = formatDateDDMMYYYY(selectedEntry.date);
            const formattedValue = Number(selectedEntry.value).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            await dataService.triggerNotification({
                type: "manual_nav",
                title: "NIF NAV Alert 📈",
                body: `NIF NAV as of ${formattedDate} is ₹ ${formattedValue}`,
                timestamp: Date.now()
            });

            alert("NIF NAV Notification dispatched successfully!");
        } catch (err: any) {
            console.error("Failed to send NAV notification:", err);
            alert(`Failed to dispatch notification: ${err.message || "Unknown error"}`);
        } finally {
            setSending(false);
        }
    };

    const handleSendCustomNotification = async () => {
        if (!customTitle.trim() || !customBody.trim()) {
            alert("Notification Header and Body are required.");
            return;
        }

        setSending(true);
        try {
            await dataService.triggerNotification({
                type: "custom",
                title: customTitle,
                body: customBody,
                timestamp: Date.now()
            });

            alert("Custom Notification dispatched successfully!");
            setCustomTitle("");
            setCustomBody("");
        } catch (err: any) {
            console.error("Failed to send custom notification:", err);
            alert(`Failed to dispatch notification: ${err.message || "Unknown error"}`);
        } finally {
            setSending(false);
        }
    };

    // Helper to insert text at cursor position
    const insertText = (text: string) => {
        if (activeInput === "title") {
            const el = titleRef.current;
            if (!el) {
                setCustomTitle(prev => prev + text);
                return;
            }
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const val = el.value;
            const newVal = val.substring(0, start) + text + val.substring(end);
            setCustomTitle(newVal);
            // reset cursor position after state updates
            setTimeout(() => {
                el.focus();
                el.setSelectionRange(start + text.length, start + text.length);
            }, 50);
        } else {
            const el = bodyRef.current;
            if (!el) {
                setCustomBody(prev => prev + text);
                return;
            }
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const val = el.value;
            const newVal = val.substring(0, start) + text + val.substring(end);
            setCustomBody(newVal);
            setTimeout(() => {
                el.focus();
                el.setSelectionRange(start + text.length, start + text.length);
            }, 50);
        }
    };

    const wrapSelectedText = (tagOpen: string, tagClose: string) => {
        const el = activeInput === "title" ? titleRef.current : bodyRef.current;
        if (!el) return;

        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const val = el.value;
        const selected = val.substring(start, end);
        const wrapped = `${tagOpen}${selected}${tagClose}`;
        
        const newVal = val.substring(0, start) + wrapped + val.substring(end);
        
        if (activeInput === "title") {
            setCustomTitle(newVal);
        } else {
            setCustomBody(newVal);
        }

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + tagOpen.length + selected.length + tagClose.length, start + tagOpen.length + selected.length + tagClose.length);
        }, 50);
    };

    // Format tags for UI preview
    const formatPreview = (text: string) => {
        if (!text) return "";
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Convert safe mock entities back to HTML style tags with tailwind
        html = html
            .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, '<strong class="font-bold text-white">$1</strong>')
            .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, '<strong class="font-bold text-white">$1</strong>')
            .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/g, '<em class="italic">$1</em>')
            .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/g, '<em class="italic">$1</em>')
            .replace(/&lt;span class="text-accent"&gt;(.*?)&lt;\/span&gt;/g, '<span class="text-sky-400 font-bold font-semibold">$1</span>')
            .replace(/&lt;span className="text-accent"&gt;(.*?)&lt;\/span&gt;/g, '<span class="text-sky-400 font-bold font-semibold">$1</span>');

        return html;
    };

    if (loading) return <div className="text-center py-12 text-muted-foreground">Loading Notification settings...</div>;

    const selectedEntry = navData.find(d => d.date === selectedNavDate);
    const navNotifBodyPreview = selectedEntry 
        ? `NIF NAV as of ${formatDateDDMMYYYY(selectedEntry.date)} is ₹ ${Number(selectedEntry.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "";

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-background min-h-full">
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <div className="font-bold">Error:</div>
                    <div className="break-all">{error}</div>
                    <button onClick={loadData} className="ml-auto hover:underline text-sm">Retry</button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Bell className="w-6 h-6 text-blue-500 animate-pulse" />
                        Notification Center
                    </h2>
                    <p className="text-muted-foreground mt-1">Manage configurations, auto-timers, and trigger instant NAV or custom alerts.</p>
                </div>

                {activeSection === "settings" && isConfigDirty && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleSaveConfig}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-green-600/20"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Save Configurations
                    </motion.button>
                )}
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-border/60">
                <button
                    onClick={() => setActiveSection("settings")}
                    className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
                        activeSection === "settings"
                            ? "border-blue-500 text-blue-500"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Settings className="w-4 h-4" />
                    Auto & Scheduler Settings
                </button>
                <button
                    onClick={() => setActiveSection("nav")}
                    className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
                        activeSection === "nav"
                            ? "border-blue-500 text-blue-500"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    Send NIF NAV Alert
                </button>
                <button
                    onClick={() => setActiveSection("custom")}
                    className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
                        activeSection === "custom"
                            ? "border-blue-500 text-blue-500"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Send Custom Alert
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                <AnimatePresence mode="wait">
                    {activeSection === "settings" && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-muted-foreground" />
                                    Automation Rules
                                </h3>

                                <div className="space-y-6 divide-y divide-border/60">
                                    {/* Auto send on update toggle */}
                                    <div className="flex items-start justify-between py-4 first:pt-0">
                                        <div className="space-y-1 pr-4">
                                            <label className="font-bold text-foreground text-sm sm:text-base">
                                                Auto-Send on NAV Update
                                            </label>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Automatically push a real-time notification to all active web and mobile devices as soon as a new NAV row is added or updated (via Excel sheet upload or manual additions).
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setConfig({ ...config, autoSendOnNavUpdate: !config.autoSendOnNavUpdate });
                                                setIsConfigDirty(true);
                                            }}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-blue-500 ${
                                                config.autoSendOnNavUpdate ? "bg-blue-600" : "bg-navy-800"
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    config.autoSendOnNavUpdate ? "translate-x-5" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Daily timer notification toggle */}
                                    <div className="flex items-start justify-between py-4">
                                        <div className="space-y-1 pr-4">
                                            <label className="font-bold text-foreground text-sm sm:text-base">
                                                Daily Auto Timer Alerts
                                            </label>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Trigger a NIF NAV notification automatically for all active sessions at a specific time of day. Note: The alert retrieves the latest available NIF NAV entry on dispatch.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setConfig({ ...config, autoTimerEnabled: !config.autoTimerEnabled });
                                                setIsConfigDirty(true);
                                            }}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-blue-500 ${
                                                config.autoTimerEnabled ? "bg-blue-600" : "bg-navy-800"
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    config.autoTimerEnabled ? "translate-x-5" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Scheduler time selector */}
                                    {config.autoTimerEnabled && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4"
                                        >
                                            <div className="space-y-1">
                                                <label className="font-bold text-foreground text-sm">
                                                    Scheduled Dispatch Time
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    Select the time of day (local time) at which daily NAV notifications should trigger.
                                                </p>
                                            </div>
                                            <input
                                                type="time"
                                                value={config.autoTimerTime}
                                                onChange={(e) => {
                                                    setConfig({ ...config, autoTimerTime: e.target.value });
                                                    setIsConfigDirty(true);
                                                }}
                                                className="p-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-blue-500 outline-none text-foreground w-full sm:w-44 text-center font-bold"
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeSection === "nav" && (
                        <motion.div
                            key="nav"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-muted-foreground" />
                                    Manual NIF NAV Alert
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-foreground">
                                            Select NAV Date
                                        </label>
                                        <select
                                            value={selectedNavDate}
                                            onChange={(e) => setSelectedNavDate(e.target.value)}
                                            className="p-3 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-blue-500 w-full animate-none"
                                        >
                                            {navData.map((d) => (
                                                <option key={d.id} value={d.date}>
                                                    {formatDateDDMMYYYY(d.date)} (NAV: ₹ {Number(d.value).toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Preview Block */}
                                    {selectedEntry && (
                                        <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
                                            <div className="text-[11px] font-bold text-blue-500 uppercase tracking-wide flex items-center gap-1.5">
                                                <Info className="w-3.5 h-3.5" />
                                                Live Notification Preview
                                            </div>
                                            <div className="p-4 bg-navy-950 border border-navy-800 rounded-xl space-y-1">
                                                <div className="font-extrabold text-white text-sm">NIF NAV Alert 📈</div>
                                                <div className="text-xs text-gray-300">{navNotifBodyPreview}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Send Trigger Button */}
                                    <button
                                        onClick={handleSendNavNotification}
                                        disabled={sending || !selectedNavDate}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
                                    >
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Dispatch Manual NAV Notification
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeSection === "custom" && (
                        <motion.div
                            key="custom"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                                    Send Custom Alert
                                </h3>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Input Columns */}
                                    <div className="space-y-4">
                                        {/* Title Input */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-semibold text-foreground">
                                                Notification Header (Title)
                                            </label>
                                            <input
                                                type="text"
                                                ref={titleRef}
                                                placeholder="e.g. Finance Panel Registration Open! 📢"
                                                value={customTitle}
                                                onFocus={() => setActiveInput("title")}
                                                onChange={(e) => setCustomTitle(e.target.value)}
                                                className="p-3 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-blue-500 w-full text-foreground text-sm font-semibold"
                                            />
                                        </div>

                                        {/* Body input */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-semibold text-foreground">
                                                Notification Body
                                            </label>
                                            <textarea
                                                ref={bodyRef}
                                                rows={4}
                                                placeholder="Enter message details here. HTML tags like <b>bold</b> and <span class='text-accent'>color</span> are supported!"
                                                value={customBody}
                                                onFocus={() => setActiveInput("body")}
                                                onChange={(e) => setCustomBody(e.target.value)}
                                                className="p-3 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-blue-500 w-full text-foreground text-sm leading-relaxed"
                                            />
                                        </div>

                                        {/* Formatting Toolbar */}
                                        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 border border-border rounded-xl">
                                            <span className="text-xs text-muted-foreground font-semibold mr-1">Toolbar:</span>
                                            <button
                                                onClick={() => wrapSelectedText("<b>", "</b>")}
                                                className="px-2.5 py-1 text-xs font-bold bg-background border border-border text-foreground hover:bg-muted rounded transition-colors"
                                                title="Bold Text"
                                            >
                                                Bold
                                            </button>
                                            <button
                                                onClick={() => wrapSelectedText("<i>", "</i>")}
                                                className="px-2.5 py-1 text-xs italic bg-background border border-border text-foreground hover:bg-muted rounded transition-colors"
                                                title="Italic Text"
                                            >
                                                Italic
                                            </button>
                                            <button
                                                onClick={() => wrapSelectedText('<span class="text-accent">', '</span>')}
                                                className="px-2.5 py-1 text-xs bg-background border border-border text-blue-500 hover:bg-muted rounded transition-colors font-bold"
                                                title="Blue Brand Highlight"
                                            >
                                                Accent Blue
                                            </button>
                                        </div>

                                        {/* Emoji Panel */}
                                        <div className="space-y-1.5">
                                            <span className="text-xs text-muted-foreground font-semibold">Quick Emojis:</span>
                                            <div className="flex flex-wrap gap-2">
                                                {COMMON_EMOJIS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => insertText(emoji)}
                                                        className="p-2 text-base bg-background border border-border hover:bg-muted active:scale-95 transition-all rounded-lg"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Column */}
                                    <div className="space-y-4">
                                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            Live Banners Preview
                                        </div>

                                        <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-4">
                                            {/* In-app Toast Banner Preview */}
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">In-App Floating Banner Preview</div>
                                                <div className="w-full rounded-xl border border-navy-700/50 bg-navy-950/90 backdrop-blur-xl shadow-lg p-4 space-y-2.5 overflow-hidden">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-navy-900 rounded-lg border border-navy-800 flex items-center justify-center shrink-0">
                                                            <Bell className="w-5 h-5 text-accent animate-pulse" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div 
                                                                className="font-extrabold text-white text-sm truncate"
                                                                dangerouslySetInnerHTML={{ __html: formatPreview(customTitle) || "Notification Header" }}
                                                            />
                                                            <div 
                                                                className="text-xs text-gray-300 leading-normal"
                                                                dangerouslySetInnerHTML={{ __html: formatPreview(customBody) || "Notification message details will display here with rich formatting support." }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Native OS banner preview */}
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Native OS / Browser Preview (Plain Text)</div>
                                                <div className="w-full bg-black/60 border border-white/10 rounded-xl p-3 shadow-md space-y-1 font-sans text-left">
                                                    <div className="font-bold text-xs text-white flex items-center gap-1.5 justify-between">
                                                        <span>{customTitle.replace(/<[^>]*>/g, "") || "Notification Header"}</span>
                                                        <span className="text-[9px] text-gray-400">now</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-300">
                                                        {customBody.replace(/<[^>]*>/g, "") || "Notification body message details..."}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-400 flex items-start gap-2">
                                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>Note: Color accents and bold tags will render natively in the in-app popup banner, while standard OS notifications (chrome, android, ios) will display in safe plain text mode. Emojis are supported on both.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Send Trigger Button */}
                                <button
                                    onClick={handleSendCustomNotification}
                                    disabled={sending || !customTitle.trim() || !customBody.trim()}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {sending ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Dispatch Custom Alert Notification
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
