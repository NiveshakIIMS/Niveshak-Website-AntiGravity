"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin, Video, Calendar, Hourglass, Maximize2, ExternalLink, X, Timer } from "lucide-react";
import { Event } from "@/services/dataService";
import { useTheme } from "@/components/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";

interface EventCardProps {
    event: Event;
}

const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

/** Compute a granular countdown object from a target date */
function computeCountdown(targetDate: Date, now: Date) {
    const diffMs = targetDate.getTime() - now.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);

    if (diffMs <= 0) return { label: "Closed", type: "ended" as const };
    if (diffHrs > 24) return { label: `${Math.ceil(diffHrs / 24)} Days`, type: "normal" as const };
    if (diffHrs >= 1) return { label: `${Math.floor(diffHrs)} Hrs`, type: "urgent" as const };
    return { label: `${Math.max(1, Math.floor(diffMs / (1000 * 60)))} Mins`, type: "critical" as const };
}

/** Compute event date countdown (day-level only) */
function computeEventCountdown(eventDate: Date, now: Date) {
    const d1 = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return { label: `${diffDays} Days`, type: "normal" as const };
    if (diffDays === 0) return { label: "Today", type: "today" as const };
    return { label: "Done", type: "past" as const };
}

function CountdownBadge({ label, type, icon }: { label: string; type: string; icon: React.ReactNode }) {
    const { theme } = useTheme();
    const colorClass =
        type === "urgent" || type === "critical"
            ? "bg-red-50 text-red-600 border-red-200 animate-pulse dark:bg-red-900/30 dark:text-red-400"
            : type === "ended" || type === "past"
                ? "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400"
                : type === "today"
                    ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                    : theme === "dark"
                        ? "bg-blue-950 border-blue-900 text-blue-400"
                        : "bg-blue-50 border-blue-100 text-blue-600";

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm border ${colorClass}`}>
            {icon}
            {label}
        </div>
    );
}

export default function EventCard({ event }: EventCardProps) {
    const [isMaximized, setIsMaximized] = useState(false);

    const eventDate = new Date(event.date);
    const deadlineDate = event.showDeadline && event.deadline ? new Date(event.deadline) : null;

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        // Run a minute-level timer for granular deadline countdowns
        const needsTimer = deadlineDate && deadlineDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000 && deadlineDate.getTime() > now.getTime();
        if (!needsTimer) return;

        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, [event.deadline, event.showDeadline]);

    // --- Countdown calculations ---
    const eventCountdown = computeEventCountdown(eventDate, now);
    const deadlineCountdown = deadlineDate ? computeCountdown(deadlineDate, now) : null;

    // --- Aspect ratio ---
    const isPortrait = event.orientation === "portrait";
    const isSquare = event.orientation === "square";
    let aspectRatioClass = "aspect-video";
    if (isPortrait) aspectRatioClass = "aspect-[3/4]";
    if (isSquare) aspectRatioClass = "aspect-square";

    // --- Format time ---
    const formattedTime = event.showTime && event.time
        ? (event.time.match(/^\d{1,2}:\d{2}$/)
            ? new Date(`2000-01-01T${event.time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()
            : event.time)
        : null;

    // --- Format date with year ---
    const day = eventDate.getDate();
    const ordinal = getOrdinal(day);
    const month = eventDate.toLocaleString("default", { month: "short" });
    const year = eventDate.getFullYear();
    const weekday = eventDate.toLocaleString("default", { weekday: "short" });

    return (
        <>
            {/* --- Regular Card --- */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group flex flex-col h-full w-full max-w-sm mx-auto relative">
                {/* Cover Image */}
                <div className={`relative overflow-hidden bg-muted w-full ${aspectRatioClass}`}>
                    <img
                        src={event.imageUrl || "/hero_background.png"}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 z-10">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md ${event.type === "Live" ? "bg-red-600 text-white animate-pulse" :
                            event.type === "Upcoming" ? "bg-blue-600 text-white" : "bg-gray-600 text-white"
                            }`}>
                            {event.type}
                        </span>
                    </div>

                    {/* Maximize Button */}
                    <button
                        onClick={() => setIsMaximized(true)}
                        className="absolute top-3 right-3 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View Details"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Register Overlay */}
                    {event.registration_link && event.type !== "Past" && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <a
                                href={event.registration_link} target="_blank" rel="noreferrer"
                                className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-white/90"
                                onClick={e => e.stopPropagation()}
                            >
                                Register Now
                            </a>
                        </div>
                    )}
                </div>

                {/* Content Body */}
                <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-card-foreground mb-3 line-clamp-2 text-xl tracking-tight leading-tight">
                        {event.title}
                    </h3>

                    {/* Optional: Time & Location */}
                    <div className="space-y-2 mb-4">
                        {formattedTime && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 text-accent" />
                                <span className="font-medium">{formattedTime}</span>
                            </div>
                        )}
                        {event.showTime && event.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 text-accent" />
                                <span className="font-medium truncate">{event.location}</span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Section: Date + Separate Countdowns */}
                    <div className="mt-auto pt-4 border-t border-border/50 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            {/* Date with Year */}
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1 text-base font-bold text-foreground leading-none">
                                    <span>{day}</span>
                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">{ordinal}</span>
                                    <span>{month}</span>
                                    <span className="text-muted-foreground font-medium text-sm">{year}</span>
                                </div>
                                <span className="text-xs font-medium text-muted-foreground mt-1">{weekday}</span>
                            </div>

                            {/* Event Date Countdown */}
                            <CountdownBadge
                                label={eventCountdown.label}
                                type={eventCountdown.type}
                                icon={<Hourglass className="w-3 h-3" />}
                            />
                        </div>

                        {/* Separate Deadline Countdown (only if toggle enabled & deadline set) */}
                        {deadlineCountdown && (
                            <div className="flex items-center justify-between gap-4 pt-2 border-t border-dashed border-border/40">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Timer className="w-3 h-3" /> Reg. Deadline
                                </span>
                                <CountdownBadge
                                    label={deadlineCountdown.label}
                                    type={deadlineCountdown.type}
                                    icon={<Timer className="w-3 h-3" />}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Maximize Modal --- */}
            <AnimatePresence>
                {isMaximized && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsMaximized(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hide border border-border"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsMaximized(false)}
                                className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Modal Image */}
                            <div className="relative w-full aspect-video sm:aspect-[21/9] bg-muted">
                                <img
                                    src={event.imageUrl || "/hero_background.png"}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{event.title}</h2>
                                    <div className="flex flex-wrap gap-4 text-white/90 text-sm font-medium">
                                        <span className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-blue-400" />
                                            {eventDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                        </span>
                                        {formattedTime && (
                                            <span className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-blue-400" /> {formattedTime}
                                            </span>
                                        )}
                                        {event.showTime && event.location && (
                                            <span className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-blue-400" /> {event.location}
                                            </span>
                                        )}
                                    </div>
                                    {deadlineDate && (
                                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-red-600/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                                            <Timer className="w-3 h-3" /> Deadline: {deadlineDate.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 sm:p-8 space-y-6">
                                {event.description && (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <h4 className="text-lg font-bold text-foreground mb-2">About Event</h4>
                                        <p className="text-muted-foreground whitespace-pre-line">{event.description}</p>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                                    {event.registration_link && event.type !== "Past" && (
                                        <a
                                            href={event.registration_link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20"
                                        >
                                            Register Now <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                    {event.isOnline && event.meetingLink && (
                                        <a
                                            href={event.meetingLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-green-500/20"
                                        >
                                            <Video className="w-4 h-4" /> Join Meeting
                                        </a>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
