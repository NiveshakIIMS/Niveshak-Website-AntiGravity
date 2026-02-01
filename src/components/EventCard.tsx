"use client";

import { Clock, MapPin, Video, Calendar, Hourglass } from "lucide-react";
import { Event } from "@/services/dataService";

import { useTheme } from "@/components/ThemeProvider";

interface EventCardProps {
    event: Event;
}

const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

export default function EventCard({ event }: EventCardProps) {
    const { theme } = useTheme();
    const eventDate = new Date(event.date);
    const today = new Date();

    // Reset time for accurate day difference
    const d1 = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let countdownText = "";
    if (diffDays > 0) {
        countdownText = `${diffDays} Day${diffDays > 1 ? 's' : ''} to go`;
    } else if (diffDays === 0) {
        countdownText = "Today";
    } else {
        countdownText = "Completed";
    }

    const isPortrait = event.orientation === "portrait";
    const isSquare = event.orientation === "square";

    // Determine aspect ratio class
    let aspectRatioClass = "aspect-video"; // Default Landscape
    if (isPortrait) aspectRatioClass = "aspect-[3/4]";
    if (isSquare) aspectRatioClass = "aspect-square";



    return (
        <div className={`bg-card border border-border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-1 group flex flex-col h-full w-full max-w-md mx-auto`}>
            {/* Cover Image Container */}
            <div className={`relative overflow-hidden bg-muted w-full ${aspectRatioClass}`}>
                <img
                    src={event.imageUrl || "/hero_background.png"}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${event.type === "Live" ? "bg-red-600 text-white animate-pulse" :
                        event.type === "Upcoming" ? "bg-blue-600 text-white" : "bg-gray-600 text-white"
                        }`}>
                        {event.type}
                    </span>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-6 flex flex-col flex-1">
                <h3 className="font-bold text-card-foreground mb-4 line-clamp-2 text-2xl tracking-tight">
                    {event.title}
                </h3>

                <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-base text-muted-foreground">
                        <div className="p-2 bg-secondary rounded-full shrink-0"><Clock className="w-6 h-6 sm:w-7 sm:h-7 text-accent" /></div>
                        <span className="font-medium text-lg sm:text-xl">{event.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-base text-muted-foreground">
                        <div className="p-2 bg-secondary rounded-full shrink-0"><MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-accent" /></div>
                        <span className="font-medium text-lg sm:text-xl">{event.location}</span>
                    </div>
                </div>

                {/* Bottom Section: Date & Countdown */}
                <div className="mt-auto pt-6 border-t border-border/50 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-xl sm:text-2xl font-bold text-foreground">
                            {eventDate.getDate()}
                            <sup className="text-xs align-top top-0 sm:text-sm">{getOrdinal(eventDate.getDate())}</sup>{" "}
                            {eventDate.toLocaleString('default', { month: 'short' })}, {eventDate.getFullYear()}
                        </span>
                        <div className="text-base sm:text-lg font-medium text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                            {eventDate.toLocaleString('default', { weekday: 'long' })}
                        </div>
                    </div>

                    <div className="text-right">
                        {diffDays > 0 ? (
                            <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl shadow-sm min-w-[100px] border ${theme === 'dark'
                                    ? "bg-blue-950 border-blue-900 text-blue-400"
                                    : "bg-blue-50 border-blue-100 text-blue-600"
                                }`}>
                                <span className="text-3xl font-bold leading-none mb-1">{diffDays}</span>
                                <span className={`text-[11px] uppercase font-bold tracking-wide text-center leading-none ${theme === 'dark' ? "text-blue-400/80" : "text-blue-500/80"
                                    }`}>Days to go</span>
                            </div>
                        ) : (
                            <div
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border ${diffDays === 0 ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" :
                                    "bg-gray-100/80 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                    }`}
                            >
                                <Hourglass className="w-3.5 h-3.5" />
                                {diffDays === 0 ? "Today" : "Completed"}
                            </div>
                        )}
                    </div>
                </div>

                {event.isOnline && event.meetingLink && (
                    <a
                        href={event.meetingLink}
                        target="_blank"
                        className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-white font-semibold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:-translate-y-1"
                    >
                        <Video className="w-4 h-4" /> Join Meeting
                    </a>
                )}
            </div>
        </div>
    );
}
